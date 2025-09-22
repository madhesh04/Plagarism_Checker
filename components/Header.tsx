
import React from 'react';
import { DocumentCheckIcon } from './IconComponents';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center space-x-3">
          <DocumentCheckIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Plagiarism Checker</h1>
        </div>
      </div>
    </header>
  );
};
