
import React, { useState, useEffect } from 'react';
import { generateRecallLink, revokeRecallLink, getActiveRecallShare } from '../services/firebaseService';
import { RecallShare } from '../types';

const RECALL_EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '2 Hours', value: 2 },
  { label: '5 Hours', value: 5 },
  { label: '24 Hours', value: 24 },
  { label: '48 Hours', value: 48 },
  { label: 'Custom', value: 'custom' },
];

const AdminRecallsLink: React.FC = () => {
  const [activeShare, setActiveShare] = useState<RecallShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expiryMode, setExpiryMode] = useState<number | 'custom'>(24);
  const [customExpiry, setCustomExpiry] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadActiveLink();
  }, []);

  const loadActiveLink = async () => {
    setLoading(true);
    const share = await getActiveRecallShare();
    setActiveShare(share);
    setLoading(false);
  };

  const calculateExpiresAt = () => {
    if (expiryMode === 'custom') return customExpiry ? new Date(customExpiry) : null;
    return new Date(Date.now() + (expiryMode as number) * 60 * 60 * 1000);
  };

  const handleGenerate = async () => {
    setIsSaving(true);
    try {
      const shareId = await generateRecallLink(calculateExpiresAt());
      await loadActiveLink();
    } catch (err) {
      alert("Generation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeShare || !window.confirm("Revoke this link immediately?")) return;
    setIsSaving(true);
    try {
      await revokeRecallLink(activeShare.id);
      await loadActiveLink();
    } catch (err) {
      alert("Revoke failed");
    } finally {
      setIsSaving(false);
    }
  };

  const publicLink = activeShare ? `${window.location.origin}${window.location.pathname}#recallsId=${activeShare.id}` : '';

  const handleCopy = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest animate-pulse">Checking Link Status...</div>;

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl animate-fade-in">
      <div className="mb-8 border-b border-slate-50 pb-6">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Public Recalls Link</h3>
        <p className="text-slate-500 text-sm">Control the global access point for student recall submissions.</p>
      </div>

      <div className="space-y-8">
        {/* Link Status Card */}
        <div className={`p-6 rounded-[2rem] border transition-all ${activeShare ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
          <div className="flex justify-between items-start mb-6">
             <div className="flex gap-2 items-center">
                <div className={`w-3 h-3 rounded-full ${activeShare ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Status: {activeShare ? 'ACTIVE' : 'INACTIVE'}</span>
             </div>
             {activeShare?.expiresAt && (
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Expires: {new Date(activeShare.expiresAt.toMillis()).toLocaleString()}
                </div>
             )}
          </div>
          
          <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 readOnly 
                 value={activeShare ? publicLink : 'No active link currently'} 
                 className="flex-1 bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-500 font-mono outline-none"
               />
               <button 
                 disabled={!activeShare}
                 onClick={handleCopy}
                 className={`px-6 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black disabled:opacity-30'}`}
               >
                 {copied ? 'COPIED' : 'COPY'}
               </button>
             </div>
             {activeShare && (
               <button 
                 onClick={handleRevoke}
                 disabled={isSaving}
                 className="w-full py-3.5 bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-red-100 hover:bg-red-100 transition-all"
               >
                 REVOKE LINK IMMEDIATELY
               </button>
             )}
          </div>
        </div>

        {/* Generate Section */}
        {!activeShare && (
           <div className="space-y-6 animate-slide-up">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Link Lifetime</label>
                <div className="flex flex-wrap gap-2">
                   {RECALL_EXPIRY_OPTIONS.map(opt => (
                     <button 
                        key={opt.label}
                        onClick={() => setExpiryMode(opt.value as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${expiryMode === opt.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                     >
                       {opt.label}
                     </button>
                   ))}
                </div>
              </div>

              {expiryMode === 'custom' && (
                <div className="animate-slide-down">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Custom Expiry Date</label>
                   <input 
                     type="datetime-local" 
                     value={customExpiry}
                     onChange={e => setCustomExpiry(e.target.value)}
                     className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                   />
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={isSaving}
                className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-700 transition-all"
              >
                {isSaving ? 'GENERATING...' : 'GENERATE NEW RECALL LINK'}
              </button>
           </div>
        )}

        {activeShare && (
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex gap-4">
             <div className="text-2xl">💡</div>
             <div>
                <p className="text-xs font-bold text-orange-800 leading-relaxed uppercase">Pro Tip</p>
                <p className="text-xs text-orange-600 leading-relaxed">Resetting the link will revoke the current one. Students currently typing might lose progress if you revoke suddenly.</p>
                <button 
                   onClick={() => { if(confirm("Revoke current link and generate a new one?")) { handleRevoke().then(handleGenerate); } }} 
                   className="mt-3 text-[10px] font-black text-orange-800 underline uppercase tracking-widest"
                >
                   Reset & Regenerate Link
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRecallsLink;
