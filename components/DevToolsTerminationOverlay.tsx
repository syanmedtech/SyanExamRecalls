
import React from 'react';

const DevToolsTerminationOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 z-[99999] flex items-center justify-center p-6 text-center select-none backdrop-blur-md">
      <div className="max-w-md bg-white p-10 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] border-t-8 border-red-600 animate-scale-up">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl animate-pulse">
          🚫
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight uppercase">Auto Terminated</h2>
        <p className="text-slate-500 font-bold text-lg mb-8 leading-relaxed">
          Developer tools detected. Access has been revoked to maintain clinical environment integrity.
        </p>
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
           <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
           <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Redirecting to Safety...</span>
        </div>
      </div>
      
      {/* Invisible shield to prevent any interaction behind the modal */}
      <div className="fixed inset-0 z-[-1] pointer-events-auto" />
    </div>
  );
};

export default DevToolsTerminationOverlay;
