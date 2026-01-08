
import React, { useState, useEffect } from 'react';
import { validateRecallShare, submitRecall } from '../services/firebaseService';
import { useDevToolsTermination } from '../hooks/useDevToolsTermination';
import { useDisableRightClick } from '../hooks/useDisableRightClick';
import DevToolsTerminationOverlay from './DevToolsTerminationOverlay';

const EXAM_RECALL_OPTIONS = [
  "FCPS Medicine", "FCPS Surgery", "FCPS Pediatrics", "FCPS Ortho", "FCPS Eye", "FCPS Gyne",
  "JCAT Medicine", "JCAT Surgery", "MBBS Medicine", "MBBS Surgery", "MBBS Gyne", "MBBS OBS", "MBBS Pediatrics"
];

interface RecallSubmissionFormProps {
  shareId: string;
}

const RecallSubmissionForm: React.FC<RecallSubmissionFormProps> = ({ shareId }) => {
  const [name, setName] = useState('');
  const [examName, setExamName] = useState(EXAM_RECALL_OPTIONS[0]);
  const [timeSlot, setTimeSlot] = useState<'Morning' | 'Evening'>('Morning');
  const [points, setPoints] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [currentPoint, setCurrentPoint] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Security Hooks
  useDisableRightClick(true);
  const isTerminated = useDevToolsTermination({
    area: "RECALLS_FORM",
    recallsShareId: shareId
  });

  const getWordCount = (str: string) => str.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleAddPoint = () => {
    if (isTerminated) return;
    setEditingIdx(null);
    setCurrentPoint('');
    setShowPointModal(true);
  };

  const handleEditPoint = (idx: number) => {
    if (isTerminated) return;
    setEditingIdx(idx);
    setCurrentPoint(points[idx]);
    setShowPointModal(true);
  };

  const handleSavePoint = () => {
    const wordCount = getWordCount(currentPoint);
    if (wordCount > 500) {
      alert("Point is too long. Please stay under 500 words.");
      return;
    }
    if (!currentPoint.trim()) return;

    if (editingIdx !== null) {
      const newPoints = [...points];
      newPoints[editingIdx] = currentPoint;
      setPoints(newPoints);
    } else {
      setPoints([...points, currentPoint]);
    }
    setShowPointModal(false);
  };

  const handleSubmit = async () => {
    if (isTerminated) return;
    if (!name.trim()) return alert("Please enter your name.");
    if (points.length === 0) return alert("Please add at least one recall point.");

    setIsSubmitting(true);
    try {
      await submitRecall({
        shareId,
        name,
        examName,
        timeSlot,
        points,
        pointsCount: points.length
      });
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTerminated) return <DevToolsTerminationOverlay />;

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-10 sm:mt-20 p-8 sm:p-12 bg-white rounded-3xl shadow-2xl text-center border-t-8 border-green-500 animate-scale-up">
        <div className="text-5xl sm:text-6xl mb-6">✅</div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Recalls Submitted!</h2>
        <p className="text-slate-500 mb-8 text-sm sm:text-base">Thank you for contributing to the medical community. Your recall points have been recorded successfully.</p>
        <button onClick={() => window.location.reload()} className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all">Submit Another</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 sm:mt-6 bg-white rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 animate-scale-up relative mb-12">
      <div className="text-center mb-8 sm:mb-10">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl sm:text-3xl">🖊️</div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Submit Exam Recalls</h2>
        <p className="text-slate-500 mt-2 text-sm">Help future candidates by sharing high-yield points from your recent exam.</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Name</label>
          <input 
            required 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base" 
            placeholder="Dr. Full Name" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Name</label>
            <select 
              value={examName} 
              onChange={e => setExamName(e.target.value)} 
              className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base appearance-none"
            >
              {EXAM_RECALL_OPTIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Slot</label>
            <div className="flex bg-slate-100 p-1.5 rounded-xl sm:rounded-2xl">
              <button onClick={() => setTimeSlot('Morning')} className={`flex-1 py-2.5 sm:py-3 text-xs font-black uppercase rounded-lg sm:rounded-xl transition-all ${timeSlot === 'Morning' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Morning</button>
              <button onClick={() => setTimeSlot('Evening')} className={`flex-1 py-2.5 sm:py-3 text-xs font-black uppercase rounded-lg sm:rounded-xl transition-all ${timeSlot === 'Evening' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Evening</button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50">
          <div className="flex justify-between items-end mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recall Points ({points.length})</label>
            <button 
              onClick={handleAddPoint}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs border border-blue-100 hover:bg-blue-100 active:scale-95"
            >
              + Add Point
            </button>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {points.map((p, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex gap-3 sm:gap-4 items-start group">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-slate-400 text-[10px] shrink-0">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{p}</p>
                </div>
                <div className="flex gap-1 sm:gap-2 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEditPoint(idx)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✎</button>
                   <button onClick={() => setPoints(points.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                </div>
              </div>
            ))}
            {points.length === 0 && (
              <div className="py-10 sm:py-12 border-2 border-dashed border-slate-100 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-center">
                 <div className="text-2xl mb-2 opacity-30">📋</div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No points added yet</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || points.length === 0}
          className="w-full py-4 sm:py-5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4 sm:mt-8 active:scale-95 min-h-[54px]"
        >
          {isSubmitting ? "Submitting Recalls..." : "Submit My Recalls"}
        </button>
      </div>

      {/* ADD/EDIT POINT MODAL */}
      {showPointModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-scale-up flex flex-col max-h-[85vh]">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">{editingIdx !== null ? 'Edit' : 'Add'} Recall Point</h3>
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <textarea 
                autoFocus
                value={currentPoint}
                onChange={e => setCurrentPoint(e.target.value)}
                className="w-full p-4 sm:p-6 bg-slate-50 border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 flex-1 resize-none text-slate-700 leading-relaxed text-base"
                placeholder="Type your recall point here..."
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shrink-0">
                 <span className={`text-[10px] font-black uppercase tracking-widest text-center sm:text-left ${getWordCount(currentPoint) > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                   Words: {getWordCount(currentPoint)} / 500
                 </span>
                 <div className="flex gap-2">
                    <button onClick={() => setShowPointModal(false)} className="flex-1 sm:flex-none px-6 py-3 text-slate-400 font-bold text-xs uppercase hover:text-slate-600">Cancel</button>
                    <button onClick={handleSavePoint} className="flex-[2] sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 uppercase tracking-widest active:scale-95">Save Point</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecallSubmissionForm;