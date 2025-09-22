import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { type ComparisonResult, type DocumentContent, type OnlineComparisonResult } from './types';
import { checkPlagiarism, checkPastedTextPlagiarism } from './services/geminiService';

enum AppView {
  UPLOAD,
  RESULTS,
}

// Allow mammoth to be available on the window object
declare global {
    interface Window {
        mammoth: any;
    }
}

// Utility to convert a string to a Base64 string
const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));

// Fix: Integrated mammoth.js for client-side .docx processing.
// This function now intercepts .docx files, extracts their text using mammoth,
// and sends the plain text to the Gemini API. This bypasses the API's
// unsupported MIME type error for Word documents.
const handleFileRead = (files: File[]): Promise<DocumentContent[]> => {
  const promises = files.map(file => {
    return new Promise<DocumentContent>((resolve, reject) => {
      const reader = new FileReader();

      // Handle DOCX files with mammoth.js
      if (file.name.endsWith('.docx') && window.mammoth) {
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          window.mammoth.extractRawText({ arrayBuffer })
            .then((result: any) => {
              // Send the extracted text as plain text
              resolve({
                name: file.name,
                content: toBase64(result.value),
                mimeType: 'text/plain',
              });
            })
            .catch((err: any) => reject(new Error(`Could not parse .docx file: ${file.name}. ${err.message}`)));
        };
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsArrayBuffer(file);
        return;
      }
      
      // Handle other files (txt, pdf) as before
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
              resolve({ name: file.name, content: base64Data, mimeType: file.type });
          } else {
              reject(new Error(`Could not process file content for: ${file.name}`));
          }
        } else {
          reject(new Error(`Could not read file: ${file.name}`));
        }
      };
      reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises);
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [results, setResults] = useState<(ComparisonResult | OnlineComparisonResult)[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError]
   = useState<string | null>(null);

  const handleAnalysis = useCallback(async (files: File[], isOnlineCheck: boolean) => {

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const documents = await handleFileRead(files);
      const plagiarismResults = await checkPlagiarism(documents, isOnlineCheck);
      setResults(plagiarismResults);
      setView(AppView.RESULTS);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
      setView(AppView.UPLOAD);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleTextAnalysis = useCallback(async (text: string) => {
    if (!text.trim()) {
        setError("Please paste some text to analyze.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
        const plagiarismResult = await checkPastedTextPlagiarism(text);
        setResults([plagiarismResult]);
        setView(AppView.RESULTS);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        setView(AppView.UPLOAD);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setView(AppView.UPLOAD);
    setResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {view === AppView.UPLOAD && <FileUpload onAnalyze={handleAnalysis} onAnalyzeText={handleTextAnalysis} />}
            {view === AppView.RESULTS && <ResultsDisplay results={results} onReset={handleReset} />}
          </>
        )}
      </main>
      <footer className="text-center py-4 text-slate-500 text-sm">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;