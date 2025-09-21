
import React from 'react';

export const Loader: React.FC = () => {
  const messages = [
      "Analyzing document structures...",
      "Comparing text segments...",
      "Calculating similarity scores...",
      "Cross-referencing content...",
      "Finalizing plagiarism report...",
      "This may take a moment...",
  ];
  
  const [message, setMessage] = React.useState(messages[0]);
  
  React.useEffect(() => {
      let index = 0;
      const interval = setInterval(() => {
          index = (index + 1) % messages.length;
          setMessage(messages[index]);
      }, 3000);
      
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl shadow-lg border border-slate-200">
      <div className="w-16 h-16 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <h2 className="mt-6 text-xl font-semibold text-slate-700">Checking for Plagiarism...</h2>
      <p className="mt-2 text-slate-500 transition-opacity duration-500">{message}</p>
    </div>
  );
};
