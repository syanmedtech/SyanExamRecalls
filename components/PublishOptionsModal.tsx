
import React, { useState, useEffect } from 'react';
import { MCQ, ExamData } from '../types';
import { 
  getPublishedAppendTargets, 
  appendQuestionsToExistingQuiz,
  saveGeminiQuiz,
  ensureQuizPersisted,
  createOrUpdateLink,
  revokeQuizLink,
  resetShareLink
} from '../services/firebaseService';

interface PublishOptionsModalProps {
  questions: MCQ[];
  onSuccess: (shareId: string | null) => void;
  onCancel: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '2 Hours', value: 2 },
  { label: '5 Hours', value: 5 },
  { label: '24 Hours', value: 24 },
  { label: '48 Hours', value: 48 },
];

const PublishOptionsModal: React.FC<PublishOptionsModalProps> = ({ questions, onSuccess, onCancel }) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existingExams, setExistingExams] = useState<ExamData[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Link Settings
  const [quizId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [attemptLimit, setAttemptLimit] = useState<number | null>(1);
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const data = await getPublishedAppendTargets();
        setExistingExams(data);
      } catch (err: any) {
        console.error("Loader Error:", err);
        setError(`Could not load published links (${err.message || "Unknown Error"}).`);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchExams();
  }, []);

  const publicLink = activeLinkId ? `${window.location.origin}${window.location.pathname}#examId=${activeLinkId}` : '';

  const handleCopy = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateLink = async () => {
    if (!title.trim()) return alert("Please enter a title first.");
    setLoading(true);
    try {
      // 1. Ensure Quiz is saved first
      await ensureQuizPersisted({
        id: quizId,
        title,
        description: desc,
        questions,
        status: 'draft'
      });
      
      // 2. Generate the Link
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
      const linkId = await createOrUpdateLink(quizId, {
        expiresAt,
        attemptLimit,
        isActive: true
      });
      setActiveLinkId(linkId);
    } catch (err: any) {
      alert(err.message || "Failed to generate link.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLink = async () => {
    if (!activeLinkId || !window.confirm("This will invalidate the current link. Continue?")) return;
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
      const newLinkId = await resetShareLink(quizId, expiresAt, attemptLimit);
      setActiveLinkId(newLinkId);
    } catch (err: any) {
      alert(err.message || "Failed to reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalAction = async (isPublish: boolean) => {
    if (!title.trim()) return alert("Title required.");
    setLoading(true);
    try {
      let finalLinkId = activeLinkId;

      // Ensure persisted
      await ensureQuizPersisted({
        id: quizId,
        title,
        description: desc,
        questions,
        status: isPublish ? 'published' : 'draft'
      });

      if (isPublish) {
        if (!finalLinkId) {
          const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
          finalLinkId = await createOrUpdateLink(quizId, {
            expiresAt,
            attemptLimit,
            isActive: true
          });
        } else {
          // Just update status if link already exists
          const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
          await createOrUpdateLink(quizId, {
            linkId: finalLinkId,
            expiresAt,
            attemptLimit,
            isActive: true
          });
        }
        onSuccess(finalLinkId);
      } else {
        // Save as Draft
        if (activeLinkId) {
           await revokeQuizLink(quizId, activeLinkId);
        }
        onSuccess(null);
      }
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppendToExisting = async () => {
    if (!selectedExam) return alert("Select an exam.");
    setLoading(true);
    try {
      await appendQuestionsToExistingQuiz(selectedExam.id, questions);
      onSuccess(selectedExam.shareId || selectedExam.link?.shareId || null);
    } catch (err: any) {
      alert(err.message || "Append failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = existingExams.filter(e => 
    (e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Publish Options</h2>
            <p className="text-slate-500 text-sm font-medium">Choose how to distribute these {questions.length} scenarios.</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:text-slate-600 transition-all">✕</button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button onClick={() => setMode('new')} className={`p-6 rounded-3xl border-2 text-left transition-all ${mode === 'new' ? 'border-blue-600 bg-blue-50 shadow-md ring-4 ring-blue-100' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">🆕</div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-1">Method 1</h4>
                <p className="font-bold text-slate-800 text-lg">New Publish Link</p>
                <p className="text-xs text-slate-500 mt-2">Standalone link for these questions.</p>
             </button>
             <button onClick={() => setMode('existing')} className={`p-6 rounded-3xl border-2 text-left transition-all ${mode === 'existing' ? 'border-emerald-600 bg-emerald-50 shadow-md ring-4 ring-emerald-100' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-4">➕</div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-1">Method 2</h4>
                <p className="font-bold text-slate-800 text-lg">Already Published</p>
                <p className="text-xs text-slate-500 mt-2">Append to existing bank.</p>
             </button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-6 animate-slide-up">
               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Title</label>
                   <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clinical Session 01" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description (Optional)</label>
                   <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Instructions for students..." className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20 resize-none" />
                 </div>
               </div>

               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Public Share Link</label>
                  <div className="flex gap-2">
                    <input readOnly value={activeLinkId ? publicLink : 'Generate a link to share publicly'} className="flex-1 bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-500 font-mono outline-none" />
                    <button disabled={!activeLinkId} onClick={handleCopy} className={`px-5 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black disabled:opacity-30'}`}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateLink} disabled={loading || !!activeLinkId} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeLinkId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                      Generate Public Link
                    </button>
                    {activeLinkId && (
                      <button onClick={handleResetLink} disabled={loading} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100">
                        Reset Link
                      </button>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Expiry</label>
                    <select value={expiryHours} onChange={e => setExpiryHours(parseInt(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                       {EXPIRY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attempts Limit</label>
                    <input type="number" value={attemptLimit || ''} onChange={e => setAttemptLimit(e.target.value ? parseInt(e.target.value) : null)} placeholder="Unlimited" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
               <input type="text" placeholder="Search already published links..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-4 pl-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
               <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2">
                 {initialLoading ? (
                   <div className="py-10 text-center animate-pulse text-xs font-bold uppercase text-slate-300 tracking-widest">Fetching Repositories...</div>
                 ) : error ? (
                   <div className="py-10 text-center text-red-500 text-sm font-bold animate-shake">{error}</div>
                 ) : filteredExams.length === 0 ? (
                   <div className="py-10 text-center text-slate-400 text-sm italic">No active published links found.</div>
                 ) : (
                   filteredExams.map(exam => (
                     <button key={exam.id} onClick={() => setSelectedExam(exam)} className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${selectedExam?.id === exam.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100 shadow-sm' : 'border-slate-100 hover:bg-slate-50'}`}>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{exam.title}</p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status: {exam.status}</span>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">• ACTIVE LINK</span>
                          </div>
                        </div>
                        {selectedExam?.id === exam.id && <span className="text-emerald-600 font-bold text-xl">✓</span>}
                     </button>
                   ))
                 )}
               </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
           <button onClick={onCancel} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold active:scale-95 transition-all text-xs uppercase tracking-widest">Cancel</button>
           
           {mode === 'new' ? (
             <>
               <button 
                 disabled={loading || !title.trim()} 
                 onClick={() => handleFinalAction(false)} 
                 className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 text-xs"
               >
                 Save as Draft
               </button>
               <button 
                 disabled={loading || !title.trim()} 
                 onClick={() => handleFinalAction(true)} 
                 className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 text-xs"
               >
                 {loading ? 'Publishing...' : 'Save & Publish'}
               </button>
             </>
           ) : (
             <button 
               disabled={loading || !selectedExam} 
               onClick={handleAppendToExisting} 
               className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 text-xs"
             >
               {loading ? 'Appending...' : 'Append to Existing Exam'}
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default PublishOptionsModal;
