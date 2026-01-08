import React, { useState } from 'react';

interface ShareLinkProps {
  examId: string;
}

const ShareLink: React.FC<ShareLinkProps> = ({ examId }) => {
  const [copied, setCopied] = useState(false);

  // In a real app with routing, this would be the actual URL.
  // For this single-page demo, we use hash routing logic.
  const shareUrl = `${window.location.origin}${window.location.pathname}#examId=${examId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-xl shadow-lg border border-teal-100 text-center">
      <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
        🔗
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Ready to Share!</h2>
      <p className="text-slate-500 mb-6">Your exam has been successfully generated and saved. Share this link with your students.</p>
      
      <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
        <input 
          readOnly 
          value={shareUrl} 
          className="flex-1 bg-transparent border-none outline-none text-slate-600 text-sm px-2 font-mono"
        />
        <button 
          onClick={copyToClipboard}
          className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
            copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800 text-left">
        <strong>⚠️ Demo Note:</strong> This app uses LocalStorage to simulate a database. 
        If you open this link in a new tab <em>in the same browser</em>, it will work. 
        In a real production build, this would connect to Firebase Firestore.
      </div>
    </div>
  );
};

export default ShareLink;
