
import React, { useState, useEffect } from 'react';
import { ExamData } from '../types';
import { 
  updateLinkValidityAndPublish, 
  revokeQuizLink, 
  resetShareLink,
  setUserPublishState
} from '../services/firebaseService';

interface PublishControlsProps {
  quiz: ExamData;
  onSaved: (shareId: string | null) => void;
  onCancel: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '2 Hours', value: 2 },
  { label: '5 Hours', value: 5 },
  { label: '24 Hours', value: 24 },
  { label: '48 Hours', value: 48 },
  { label: 'Custom', value: 'custom' },
];

const PublishControls: React.FC<PublishControlsProps> = ({ quiz, onSaved, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
  const [title, setTitle] = useState(quiz.title || '');
  const [description, setDescription] = useState(quiz.description || '');
  
  // Public Tab States
  const [attemptLimit, setAttemptLimit] = useState<number | null>(quiz.link?.attemptLimit ?? 1);
  const [isUnlimited, setIsUnlimited] = useState(quiz.link?.attemptLimit === null);
  const [expiryMode, setExpiryMode] = useState<number | 'custom'>(24);
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [localShareId, setLocalShareId] = useState<string | null>(quiz.link?.shareId || null);
  const [localIsActive, setLocalIsActive] = useState<boolean>(!!quiz.link?.isActive && !quiz.link?.revokedAt);

  // User Tab States
  const [userEnabled, setUserEnabled] = useState(quiz.userPublish?.enabled || false);
  const [userAttemptLimit, setUserAttemptLimit] = useState<number | null>(quiz.userPublish?.attemptLimit ?? 1);
  const [userIsUnlimited, setUserIsUnlimited] = useState(quiz.userPublish?.attemptLimit === null);

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (quiz.link?.expiresAt) {
      const expDate = new Date(quiz.link.expiresAt.toMillis ? quiz.link.expiresAt.toMillis() : quiz.link.expiresAt);
      const diffHrs = Math.round((expDate.getTime() - Date.now()) / (1000 * 60 * 60));
      const match = EXPIRY_OPTIONS.find(o => o.value === diffHrs);
      if (!match) {
        setExpiryMode('custom');
        const tzOffset = expDate.getTimezoneOffset() * 60000;
        setCustomExpiry(new Date(expDate.getTime() - tzOffset).toISOString().slice(0, 16));
      } else {
        setExpiryMode(diffHrs);
      }
    }
  }, [quiz.link?.expiresAt]);

  const publicLink = localShareId ? `${window.location.origin}${window.location.pathname}#examId=${localShareId}` : '';

  const calculateExpiresAt = (): Date | null => {
    if (expiryMode === 'custom') {
      if (!customExpiry) return null;
      const d = new Date(customExpiry);
      if (isNaN(d.getTime())) throw new Error("Invalid custom expiry date.");
      return d;
    }
    return new Date(Date.now() + (expiryMode as number) * 60 * 60 * 1000);
  };

  const handleCopy = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublicUnpublish = async () => {
    if (!localShareId || !window.confirm("Make this public link inactive?")) return;
    setIsSaving(true);
    try {
      await revokeQuizLink(quiz.id, localShareId);
      setLocalIsActive(false);
      alert("Public link unpublished.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePublic = async () => {
    if (isSaving || !title.trim()) return alert("Title required.");
    setIsSaving(true);
    try {
      const finalShareId = await updateLinkValidityAndPublish(quiz.id, {
        title,
        description,
        expiresAt: calculateExpiresAt(),
        attemptLimit: isUnlimited ? null : attemptLimit,
        linkId: localShareId,
        isActive: true
      });
      setLocalShareId(finalShareId);
      setLocalIsActive(true);
      onSaved(finalShareId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUserPublish = async () => {
    setIsSaving(true);
    try {
      await setUserPublishState(quiz.id, userEnabled, userIsUnlimited ? null : userAttemptLimit, title, description);
      onSaved(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLink = async () => {
    setIsSaving(true);
    try {
      const newId = await resetShareLink(quiz.id, calculateExpiresAt(), isUnlimited ? null : attemptLimit);
      setLocalShareId(newId);
      setLocalIsActive(true);
      setShowResetConfirm(false);
      alert("Link regenerated.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden border border-slate-50">
      {/* Tabs Header */}
      <div className="px-8 pt-8 flex gap-4 border-b border-slate-50">
        <button onClick={() => setActiveTab('public')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all border-b-4 ${activeTab === 'public' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300 hover:text-slate-500'}`}>Public Publish</button>
        <button onClick={() => setActiveTab('user')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all border-b-4 ${activeTab === 'user' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300 hover:text-slate-500'}`}>User Publish</button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Quiz Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-sm" />
          </div>
        </div>

        {activeTab === 'public' ? (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Public Attempt Limit</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-600">Unlimited</span>
                  <input type="checkbox" checked={isUnlimited} onChange={e => setIsUnlimited(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                </label>
              </div>
              {!isUnlimited && (
                <input type="number" min="1" value={attemptLimit || 1} onChange={e => setAttemptLimit(parseInt(e.target.value) || 1)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Public Link Validity</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {EXPIRY_OPTIONS.map(opt => (
                  <button key={opt.label} onClick={() => setExpiryMode(opt.value as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${expiryMode === opt.value ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {expiryMode === 'custom' && (
                <input type="datetime-local" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl" />
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Live Share Link</label>
              <div className={`p-6 rounded-3xl border ${localIsActive ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex gap-2 mb-4">
                  <input readOnly value={localIsActive ? publicLink : 'No active public link'} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-500 font-mono" />
                  <button disabled={!localIsActive} onClick={handleCopy} className={`px-5 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {localIsActive && (
                  <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all">Reset & Regenerate Link</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center">
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-all ${userEnabled ? 'bg-teal-100 text-teal-600 shadow-teal-50 shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                 {userEnabled ? '✓' : '⊘'}
               </div>
               <h4 className="font-bold text-slate-800 text-lg mb-1">{userEnabled ? 'Published to Users' : 'Unpublished'}</h4>
               <p className="text-xs text-slate-400 mb-6">When enabled, this quiz appears on the signed-in user dashboard.</p>
               <button onClick={() => setUserEnabled(!userEnabled)} className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${userEnabled ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white'}`}>
                 {userEnabled ? 'Unpublish from Dashboard' : 'Publish to Dashboard'}
               </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard User Attempt Limit</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-600">Unlimited</span>
                  <input type="checkbox" checked={userIsUnlimited} onChange={e => setUserIsUnlimited(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                </label>
              </div>
              {!userIsUnlimited && (
                <input type="number" min="1" value={userAttemptLimit || 1} onChange={e => setUserAttemptLimit(parseInt(e.target.value) || 1)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-slate-50 flex gap-3 bg-white">
        <button onClick={onCancel} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl text-xs uppercase tracking-widest">Cancel</button>
        {activeTab === 'public' ? (
          <>
            {localIsActive && <button onClick={handlePublicUnpublish} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl text-xs uppercase tracking-widest border border-red-100">Unpublish</button>}
            <button onClick={handleSavePublic} disabled={isSaving} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 text-xs uppercase tracking-widest active:scale-95">Save & Publish Publicly</button>
          </>
        ) : (
          <button onClick={handleSaveUserPublish} disabled={isSaving} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black text-xs uppercase tracking-widest active:scale-95">Update Dashboard Settings</button>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-t-8 border-orange-500">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Reset shared link?</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Old link will stop working immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
              <button onClick={handleResetLink} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg">Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishControls;
