
import React, { useState, useEffect, useMemo } from 'react';
import { MCQ, ExamData } from '../types';
import { getQuizQuestions } from '../services/firebaseService';

interface AdminQuizViewerProps {
  quiz: ExamData;
  onClose: () => void;
}

const AdminQuizViewer: React.FC<AdminQuizViewerProps> = ({ quiz, onClose }) => {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchQs = async () => {
      setLoading(true);
      try {
        const data = await getQuizQuestions(quiz.id);
        setQuestions(data || []);
      } catch (err) {
        console.error("Failed to load quiz questions", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQs();
  }, [quiz.id]);

  const filteredQuestions = useMemo(() => {
    return (questions || []).filter(q => {
      const matchesSearch = (q.stem || q.question || "").toLowerCase().includes(search.toLowerCase());
      const matchesDiff = diffFilter === "all" || q.difficulty?.toLowerCase() === diffFilter.toLowerCase();
      return matchesSearch && matchesDiff;
    });
  }, [questions, search, diffFilter]);

  const exportCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "quizId", "quizTitle", "questionIndex", "stem", 
        "optionA", "optionB", "optionC", "optionD", "optionE",
        "correctOptionId", "correctOptionText", "explanation", "hint", "keyNotes", "difficulty"
      ];

      const csvEscape = (val: any) => {
        const str = String(val ?? "").replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = (questions || []).map((q, idx) => {
        const opts = (q.options || []) as any[];
        const getOptText = (i: number) => {
          const opt = opts[i];
          if (!opt) return "";
          return typeof opt === 'string' ? opt : opt.text;
        };

        const correctId = q.correctOptionId || String.fromCharCode(65 + (q.correctAnswerIndex ?? 0));
        const correctText = opts.find(o => (o.id || String.fromCharCode(65 + opts.indexOf(o))) === correctId);
        const correctTextStr = typeof correctText === 'string' ? correctText : correctText?.text || "";

        return [
          csvEscape(quiz.id),
          csvEscape(quiz.title),
          idx + 1,
          csvEscape(q.stem || q.question),
          csvEscape(getOptText(0)),
          csvEscape(getOptText(1)),
          csvEscape(getOptText(2)),
          csvEscape(getOptText(3)),
          csvEscape(getOptText(4)),
          csvEscape(correctId),
          csvEscape(correctTextStr),
          csvEscape(q.explanation),
          csvEscape(q.hint || ""),
          csvEscape((q.keyNotes || []).join(" | ")),
          csvEscape(q.difficulty || "")
        ];
      });

      const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to generate CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{quiz.title}</h2>
            <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{questions.length} Questions</span>
              <span>•</span>
              <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="text-teal-600">{quiz.status}</span>
            </div>
            {quiz.description && (
               <p className="mt-4 text-sm text-slate-500 italic max-w-2xl">{quiz.description}</p>
            )}
          </div>
          <div className="flex gap-3">
             <button 
               onClick={exportCSV} 
               disabled={loading || isExporting || questions.length === 0}
               className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2"
             >
               {isExporting ? (
                 <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Preparing CSV...</>
               ) : (
                 <>📥 Export Questions CSV</>
               )}
             </button>
             <button onClick={onClose} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all font-bold">✕</button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Search stem keywords..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
           </div>
           <div className="flex gap-2 items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty:</label>
              <select 
                value={diffFilter}
                onChange={e => setDiffFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col gap-4">
               <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Repository...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">
               {search || diffFilter !== "all" ? "No questions match your criteria." : "No questions found in this quiz."}
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const opts = (q.options || []) as any[];
              const correctId = q.correctOptionId || String.fromCharCode(65 + (q.correctAnswerIndex ?? 0));

              return (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-3 items-center">
                         <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">Q{idx + 1}</span>
                         <h4 className="text-lg font-bold text-slate-800 leading-tight">Stem</h4>
                      </div>
                      {q.difficulty && (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          q.difficulty.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600' :
                          q.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                   </div>
                   
                   <p className="text-slate-700 leading-relaxed mb-8 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                     {q.stem || q.question}
                   </p>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {opts.map((opt, i) => {
                        const optId = opt.id || String.fromCharCode(65 + i);
                        const optText = typeof opt === 'string' ? opt : opt.text;
                        const isCorrect = optId === correctId;
                        
                        return (
                          <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 ${isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 text-slate-500'}`}>
                             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                               {optId}
                             </span>
                             <span className={`text-sm ${isCorrect ? 'font-bold text-emerald-900' : ''}`}>{optText}</span>
                             {isCorrect && <span className="ml-auto text-[8px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded">Correct</span>}
                          </div>
                        );
                      })}
                   </div>

                   <div className="space-y-4">
                      <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                         <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <span>💡</span> Diagnostic Reasoning
                         </div>
                         <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
                      </div>

                      {q.hint && (
                        <div className="px-6 py-4 bg-orange-50/30 rounded-2xl border border-orange-100/30 flex items-center gap-3">
                           <span className="text-lg">💡</span>
                           <div className="text-xs text-orange-800 font-medium italic"><span className="font-black uppercase tracking-tighter not-italic mr-2">Admin Hint:</span> {q.hint}</div>
                        </div>
                      )}

                      {q.keyNotes && q.keyNotes.length > 0 && (
                        <div className="px-6 py-4">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">High-Yield Points</div>
                           <ul className="space-y-2">
                             {q.keyNotes.map((note, k) => (
                               <li key={k} className="text-xs text-slate-600 flex gap-3"><span className="text-blue-500 font-bold">•</span> {note}</li>
                             ))}
                           </ul>
                        </div>
                      )}
                   </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Authorized Review Access • SYAN MedTech</p>
        </div>
      </div>
    </div>
  );
};

export default AdminQuizViewer;
