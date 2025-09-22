  import React, { useState, useRef } from 'react';
import { UploadIcon, FileTextIcon, GlobeIcon, ClipboardIcon } from './IconComponents';

interface FileUploadProps {
  onAnalyze: (files: File[], isOnlineCheck: boolean) => void;
  onAnalyzeText: (text: string) => void;
}

type InputMode = 'upload' | 'paste';

export const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze, onAnalyzeText }) => {
  const [mode, setMode] = useState<InputMode>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState<string>('');
  const [isOnlineCheck, setIsOnlineCheck] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleSubmit = () => {
    if (mode === 'upload' && files.length > 0) {
      onAnalyze(files, isOnlineCheck);
    } else if (mode === 'paste' && pastedText.trim()) {
        onAnalyzeText(pastedText);
    }
  };
  
  const handleRemoveFile = (fileName: string) => {
    setFiles(files.filter(file => file.name !== fileName));
  };
  
  const isSubmitDisabled = () => {
    if (mode === 'upload') {
        return files.length === 0;
    }
    if (mode === 'paste') {
        return !pastedText.trim();
    }
    return true;
  }


  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="flex border-b mb-6">
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold transition-colors ${
            mode === 'upload'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadIcon className="h-5 w-5" />
          <span>Upload Files</span>
        </button>
        <button
          onClick={() => setMode('paste')}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold transition-colors ${
            mode === 'paste'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardIcon className="h-5 w-5" />
          <span>Paste Text</span>
        </button>
      </div>
      
      {mode === 'upload' ? (
        <>
            <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-500 hover:bg-blue-50"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-600">
                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">Supported formats: .txt, .pdf, .docx</p>
                <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                />
            </div>
            <div className="mt-6 flex items-center justify-center">
                <label htmlFor="online-check" className="flex items-center space-x-2 cursor-pointer text-slate-600">
                    <input 
                        id="online-check"
                        type="checkbox"
                        checked={isOnlineCheck}
                        onChange={(e) => setIsOnlineCheck(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <GlobeIcon className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">Check against online sources</span>
                </label>
            </div>
            {files.length > 0 && (
                <div className="mt-6">
                <h3 className="font-semibold text-slate-700">Selected Files:</h3>
                <ul className="mt-3 space-y-2">
                    {files.map((file, index) => (
                    <li key={index} className="flex justify-between items-center bg-slate-100 p-2 rounded-md text-sm">
                        <div className="flex items-center space-x-2">
                        <FileTextIcon className="h-5 w-5 text-slate-500"/>
                        <span className="font-medium text-slate-800">{file.name}</span>
                        <span className="text-slate-500">({(file.size / 1024).toFixed(2)} KB)</span>
                        </div>
                        <button 
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg"
                        aria-label={`Remove ${file.name}`}
                        >&times;</button>
                    </li>
                    ))}
                </ul>
                </div>
            )}
        </>
      ) : (
        <div>
            <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your text here to check for plagiarism against online sources..."
                className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-2">Note: Text pasted here will be checked against online sources.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
          className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-10 rounded-lg transition-all shadow-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Check Plagiarism
        </button>

      </div>
    </div>
  );
};