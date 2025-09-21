
export interface DocumentContent {
  name: string;
  content: string; // Base64 encoded content
  mimeType: string;
}

export interface ComparisonResult {
  file1: string;
  file2: string;
  similarity: number;
  matched_sentences: string[];
}

export interface Source {
  uri: string;
  title: string;
}

/**
 * Represents a single matched sentence from an online plagiarism check.
 * The API may return objects instead of strings, so this type is used to standardize the structure.
 */
export interface OnlineMatchedSentence {
    sentence: string;
}

export interface OnlineComparisonResult {
  file1: string; // The file being checked
  similarity: number;
  matched_sentences: OnlineMatchedSentence[]; // Updated from string[] to handle object structure
  sources: Source[];
}
