import React from 'react';
import { type ComparisonResult, type OnlineComparisonResult } from '../types';

interface ChartsProps {
  averageSimilarity: number;
  results: (ComparisonResult | OnlineComparisonResult)[];
}

// Type guard to check if a result is an OnlineComparisonResult
function isOnlineResult(result: ComparisonResult | OnlineComparisonResult): result is OnlineComparisonResult {
    return 'sources' in result;
}

const getSimilarityColor = (similarity: number): { ring: string; text: string; bg: string; } => {
  if (similarity > 75) return { ring: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-500' };
  if (similarity > 40) return { ring: 'stroke-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-500' };
  return { ring: 'stroke-green-500', text: 'text-green-600', bg: 'bg-green-500' };
};

const DonutChart: React.FC<{ score: number }> = ({ score }) => {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getSimilarityColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="stroke-slate-200"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${color.ring} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className={`absolute flex flex-col items-center justify-center ${color.text}`}>
        <span className="text-3xl font-bold">{score.toFixed(1)}%</span>
      </div>
    </div>
  );
};

const BarChart: React.FC<{ results: (ComparisonResult | OnlineComparisonResult)[] }> = ({ results }) => {
  const maxValue = 100;
  return (
    <div className="w-full h-full flex items-end space-x-2 px-2">
      {results.map((result, index) => {
        const height = (result.similarity / maxValue) * 100;
        const color = getSimilarityColor(result.similarity);
        const label = isOnlineResult(result) ? result.file1 : `${result.file1.substring(0,4)}... vs ${result.file2.substring(0,4)}...`;
        
        return (
          <div key={index} className="relative flex-1 h-full flex flex-col justify-end items-center group">
            <div 
              className={`w-full ${color.bg} rounded-t-sm transition-all duration-500 ease-out`}
              style={{ height: `${height}%` }}
            />
            <div className="absolute -bottom-5 text-xs text-slate-500 truncate w-full text-center group-hover:font-bold">
              {label}
            </div>
            <div className="absolute top-0 -mt-6 hidden group-hover:block bg-slate-800 text-white text-xs rounded py-1 px-2 transition-opacity duration-300">
              {result.similarity.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Charts: React.FC<ChartsProps> = ({ averageSimilarity, results }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
      <div className="flex flex-col items-center">
        <DonutChart score={averageSimilarity} />
        <p className="mt-2 text-sm font-semibold text-slate-600">Average Plagiarism</p>
      </div>
      <div className="h-32">
        <BarChart results={results} />
      </div>
    </div>
  );
};
