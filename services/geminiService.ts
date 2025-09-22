
import { GoogleGenAI, Type } from "@google/genai";
import { type DocumentContent, type ComparisonResult, type OnlineComparisonResult, type Source, type OnlineMatchedSentence } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const pairResponseSchema = {
    type: Type.OBJECT,
    properties: {
        similarity: {
            type: Type.NUMBER,
            description: "A percentage value from 0 to 100 representing the similarity between the two documents. 100 means identical.",
        },
        matched_sentences: {
            type: Type.ARRAY,
            description: "A list of sentences that are identical or highly similar between the two documents.",
            items: {
                type: Type.STRING,
            },
        },
    },
    required: ["similarity", "matched_sentences"],
};

/**
 * Extracts a JSON object from a string, tolerating surrounding text and markdown code blocks.
 * @param text The text response from the API.
 * @returns The parsed JSON object.
 * @throws An error if no valid JSON object can be found.
 */
function extractJsonFromText(text: string): any {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
    const match = text.match(jsonRegex);

    if (match) {
        // Prefer the content of ```json ... ``` if available, otherwise use the standalone object.
        let jsonString = match[1] || match[2];
        if (jsonString) {
            try {
                // Sanitize the string by removing trailing commas that can cause parsing errors
                jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
                return JSON.parse(jsonString);
            } catch (e) {
                console.error("Failed to parse extracted JSON:", e, "JSON string:", jsonString);
                throw new Error("API returned malformed JSON.");
            }
        }
    }
    
    console.error("No JSON object found in the API response. Response text:", text);
    throw new Error("Received a non-JSON response from the API.");
}

// Helper function to extract text from a document using the Gemini API
async function extractTextFromDoc(doc: DocumentContent): Promise<string> {
    try {
        // Fix: Explicitly type `parts` as `any[]` to allow mixed content types (text and inlineData) in the prompt.
        const parts: any[] = [
            { text: "Extract all text from the following document. Return only the raw text, with no additional commentary or formatting." },
            { inlineData: { mimeType: doc.mimeType, data: doc.content } }
        ];
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
        });
        const text = response.text;
        if (!text || text.trim().length === 0) {
            throw new Error(`The API failed to extract any text from the file: ${doc.name}. The file might be empty, password-protected, or in an unsupported format.`);
        }
        return text;
    } catch (error) {
        console.error(`Error extracting text from ${doc.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to extract text from file: ${doc.name}. API Error: ${errorMessage}`);
    }
}


async function analyzePair(doc1: DocumentContent, doc2: DocumentContent): Promise<ComparisonResult> {
  const basePrompt = `
    Analyze the two provided documents for plagiarism.
    Your task is to:
    1.  Extract the text from both documents.
    2.  Compare the text content of Document 1 and Document 2.
    3.  Calculate a similarity percentage (a number from 0 to 100).
    4.  Identify sentences that are identical or highly similar.
    5.  Return the analysis ONLY in the requested JSON format. Do not add any text before or after the JSON.
    `;

    // Fix: Explicitly type `parts` as `any[]` to allow mixed content types (text and inlineData) in the prompt.
    const parts: any[] = [
        { text: basePrompt },
        { inlineData: { mimeType: doc1.mimeType, data: doc1.content } },
        { inlineData: { mimeType: doc2.mimeType, data: doc2.content } }
    ];

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: pairResponseSchema,
        },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    return {
      file1: doc1.name,
      file2: doc2.name,
      similarity: parsed.similarity,
      matched_sentences: parsed.matched_sentences,
    };

  } catch (error) {
    console.error(`Error analyzing pair (${doc1.name}, ${doc2.name}):`, error);
    throw new Error(`Failed to analyze documents: ${doc1.name} and ${doc2.name}. The API returned an error.`);
  }
}

async function analyzeContentOnline(docName: string, textContent: string): Promise<OnlineComparisonResult> {
    // Fix: Re-engineered the prompt to be more direct and strict, instructing the model
    // to act as a JSON-only API. This prevents it from returning conversational text
    // and ensures a parsable JSON response.
    const prompt = `
        You are an API that functions as a plagiarism checker. Your ONLY output format is JSON.
        Analyze the provided text against public online sources using your search tool.
        Your entire response MUST be a single, valid JSON object and nothing else.
        Do not include markdown, explanations, or any text outside of the JSON structure.

        Strictly adhere to the following JSON format:
        {
          "similarity": <A single number from 0 to 100 representing the plagiarism score>,
          "matched_sentences": [
            { "sentence": "<The first sentence that was found to be plagiarized>" },
            { "sentence": "<The second plagiarized sentence>" }
          ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt + "\n\n--- Text to Analyze ---\n" + textContent,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const parsed = extractJsonFromText(response.text);
        const rawSentences = parsed.matched_sentences;
        
        if (typeof parsed.similarity !== 'number' || !Array.isArray(rawSentences)) {
            throw new Error("API returned JSON in an unexpected format.");
        }

        // Normalize sentences to handle API inconsistencies (e.g., returning strings instead of objects).
        const normalizedSentences: OnlineMatchedSentence[] = rawSentences.map((item: any) => {
            if (typeof item === 'string') {
                return { sentence: item };
            }
            if (item && typeof item.sentence === 'string') {
                return { sentence: item.sentence };
            }
            return { sentence: "[Error: Could not parse sentence]" };
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        
        const sources: Source[] = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Untitled',
            }))
            .filter((source: Source) => source.uri);
        
        const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

        return {
            file1: docName,
            similarity: parsed.similarity,
            matched_sentences: normalizedSentences,
            sources: uniqueSources,
        };

    } catch (error) {
        console.error(`Error analyzing document online (${docName}):`, error);
        throw new Error(`Failed to analyze document ${docName} against online sources. The API returned an error.`);
    }
}


export const checkPlagiarism = async (documents: DocumentContent[], isOnlineCheck: boolean): Promise<(ComparisonResult | OnlineComparisonResult)[]> => {
    if (isOnlineCheck) {
        if (documents.length < 1) return [];
        const analysisPromises = documents.map(async (doc) => {
            const textContent = await extractTextFromDoc(doc);
            return analyzeContentOnline(doc.name, textContent);
        });
        return Promise.all(analysisPromises);
    }

    if (documents.length < 2) {
        return [];
    }

    const pairs: [DocumentContent, DocumentContent][] = [];
    for (let i = 0; i < documents.length; i++) {
        for (let j = i + 1; j < documents.length; j++) {
            pairs.push([documents[i], documents[j]]);
        }
    }

    const analysisPromises = pairs.map(([doc1, doc2]) => analyzePair(doc1, doc2));
    
    return Promise.all(analysisPromises);
};

export const checkPastedTextPlagiarism = async (text: string): Promise<OnlineComparisonResult> => {
    return analyzeContentOnline("Pasted Text", text);
};
