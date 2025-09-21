import React, { useState } from 'react';
import { type ComparisonResult, type OnlineComparisonResult, type OnlineMatchedSentence } from '../types';
import { DownloadIcon, RefreshIcon, LinkIcon } from './IconComponents';
import { Charts } from './Charts';

interface ResultsDisplayProps {
  results: (ComparisonResult | OnlineComparisonResult)[];
  onReset: () => void;
}

// Type guard to check if a result is an OnlineComparisonResult
function isOnlineResult(result: ComparisonResult | OnlineComparisonResult): result is OnlineComparisonResult {
    return 'sources' in result;
}

const getSimilarityColor = (similarity: number): string => {
  if (similarity > 75) return 'text-red-600 bg-red-100';
  if (similarity > 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};

const downloadCSVReport = (results: (ComparisonResult | OnlineComparisonResult)[]) => {
    if (results.length === 0) return;

    const isOnlineReport = isOnlineResult(results[0]);
    let csvContent = "data:text/csv;charset=utf-8,";

    if (isOnlineReport) {
        csvContent += "File,Plagiarism Score (%),Matched Sentences,Sources\n";
        (results as OnlineComparisonResult[]).forEach(res => {
            const matchedSentences = `"${res.matched_sentences.map(s => s.sentence.replace(/"/g, '""')).join('\n')}"`;
            const sources = `"${res.sources.map(s => s.uri).join('\n')}"`;
            const row = [res.file1, res.similarity, matchedSentences, sources].join(',');
            csvContent += row + "\r\n";
        });
    } else {
        csvContent += "File 1,File 2,Plagiarism Score (%),Matched Sentences\n";
        (results as ComparisonResult[]).forEach(res => {
            const matchedSentences = `"${res.matched_sentences.map(s => s.replace(/"/g, '""')).join('\n')}"`;
            const row = [res.file1, res.file2, res.similarity, matchedSentences].join(',');
            csvContent += row + "\r\n";
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plagiarism_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const MatchedSentenceItem: React.FC<{ sentence: string }> = ({ sentence }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = sentence.length > 150;
    const displayText = isLong && !isExpanded ? `${sentence.substring(0, 150)}...` : sentence;

    return (
        <li className="pl-2">
            <span className="bg-yellow-100 px-1 rounded">{displayText}</span>
            {isLong && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="text-blue-600 text-xs ml-2 hover:underline focus:outline-none font-medium"
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </li>
    );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onReset }) => {

  const totalSimilarity = results.reduce((acc, curr) => acc + curr.similarity, 0);
  const averageSimilarity = results.length > 0 ? (totalSimilarity / results.length) : 0;


  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 border-b pb-6">
            <Charts averageSimilarity={averageSimilarity} results={results} />
            <div className="flex flex-col items-center justify-center text-center md:items-end md:text-right">
                <h2 className="text-2xl font-bold text-slate-800">Analysis Report</h2>
                <p className="text-slate-500 mt-1">
                    Based on {results.length} comparison{results.length === 1 ? '' : 's'}.
                </p>
                <div className="flex space-x-2 mt-6">
                    <button 
                       onClick={() => downloadCSVReport(results)}
                       className="flex items-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-green-700"
                      >
                        <DownloadIcon className="h-5 w-5 mr-2" />
                        Download Report
                    </button>
                    <button
                        onClick={onReset}
                        className="flex items-center bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-slate-700"
                    >
                        <RefreshIcon className="h-5 w-5 mr-2"/>
                        Check Again
                    </button>
                </div>
            </div>
        </div>
      
      <div className="space-y-8">
        {results.map((result, index) => (
          <div key={index} className="border border-slate-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-700">
                        {result.file1} 
                        <span className="text-slate-400 font-normal mx-2">vs</span> 
                        {isOnlineResult(result) ? 'Online Sources' : (result as ComparisonResult).file2}
                    </h3>
                </div>
                <div className={`text-lg font-bold px-3 py-1 rounded-full ${getSimilarityColor(result.similarity)}`}>
                    {result.similarity.toFixed(2)}% Plagiarized
                </div>
            </div>
            
            {result.matched_sentences.length > 0 ? (
                <div>
                    <h4 className="font-semibold text-slate-600 mb-2">Matched Sentences:</h4>
                    <ul className="space-y-3 text-sm text-slate-700 list-disc list-inside bg-slate-50 p-4 rounded-md">
                        {result.matched_sentences.map((sentenceOrObj, sIndex) => {
                            const sentence = isOnlineResult(result)
                                ? (sentenceOrObj as OnlineMatchedSentence).sentence
                                : (sentenceOrObj as string);
                            return <MatchedSentenceItem key={sIndex} sentence={sentence} />;
                        })}
                    </ul>
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-md">No significant overlapping content found.</p>
            )}

            {isOnlineResult(result) && result.sources.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-slate-600 mb-2">Sources Found:</h4>
                    <ul className="space-y-2 text-sm">
                        {result.sources.map((source, sIndex) => (
                           <li key={sIndex} className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-2 rounded-md">
                               <LinkIcon className="h-4 w-4 flex-shrink-0"/>
                               <a href={source.uri} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={source.uri}>
                                   {source.title}
                               </a>
                           </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};