
import React, { useEffect, useState } from 'react';
import { ExamData, StudentAttempt, QuestionStats, SecuritySettings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  getQuestionStats, 
  countUserAttempts, 
  logQuizEvent, 
  getGlobalSecurity,
  DEFAULT_SECURITY_SETTINGS 
} from '../services/firebaseService';
import { useDevToolsTermination } from '../hooks/useDevToolsTermination';
import { useDisableRightClick } from '../hooks/useDisableRightClick';
import DevToolsTerminationOverlay from './DevToolsTerminationOverlay';

interface ResultViewProps {
  exam: ExamData;
  attempt: StudentAttempt;
  shareId?: string | null;
  isLoggedIn?: boolean;
  onRetake?: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ exam, attempt, shareId, isLoggedIn }) => {
  const percentage = Math.round((attempt.score / (attempt.totalQuestions || 1)) * 100);
  const correct = attempt.score;
  const incorrect = attempt.totalQuestions - attempt.score;
  
  const [stats, setStats] = useState<Record<string, QuestionStats>>({});
  const [attemptsUsed, setAttemptsUsed] = useState<number>(1);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  // Security Hooks
  useDisableRightClick(true);
  const isTerminatedByDevTools = useDevToolsTermination({
    area: "EXAM_SUMMARY",
    quizId: exam.id,
    shareId: shareId || exam.link?.shareId,
    attemptId: attempt.studentId,
    email: attempt.registrationData?.email
  });

  const attemptLimit = exam.link?.attemptLimit ?? null;
  const attemptsRemaining = attemptLimit === null ? null : Math.max(0, attemptLimit - attemptsUsed);
  const canReattempt = attemptLimit === null || (attemptsRemaining !== null && attemptsRemaining > 0);

  useEffect(() => {
    document.title = `${exam.title} | SYAN Exam Recalls`;
    
    const loadData = async () => {
        const qIds = (exam.questions || []).map(q => q.id);
        const [statsData, usedCount, securityData] = await Promise.all([
          getQuestionStats(exam.id, qIds),
          attempt.registrationData?.email ? countUserAttempts(exam.id, attempt.registrationData.email) : Promise.resolve(1),
          getGlobalSecurity()
        ]);
        setStats(statsData);
        setAttemptsUsed(usedCount);
        setSecurity(securityData || DEFAULT_SECURITY_SETTINGS);
    };
    loadData();
  }, [exam.id, exam.title, attempt.registrationData?.email, exam.questions]);

  // Keyboard Shortcuts for Review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setReviewIdx(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setReviewIdx(prev => Math.min((exam.questions?.length || 1) - 1, prev + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exam.questions?.length]);

  const handleReturnHome = () => {
    if (isTerminatedByDevTools) return;
    // senior-engineer: Clear the hash. App.tsx's reactive routing will detect this and show either Dashboard or Landing.
    // We remove reload() as it causes "page not found" errors on some static hosting environments when segments are involved.
    window.location.hash = "";
  };

  const handleReattempt = () => {
    if (!canReattempt || isTerminatedByDevTools) return;
    const sId = shareId || exam.link?.shareId;
    if (sId) {
      window.location.hash = `#examId=${sId}`;
      window.location.reload();
    }
  };

  if (isTerminatedByDevTools) return <DevToolsTerminationOverlay />;

  const data = [
    { name: 'Correct', value: correct },
    { name: 'Incorrect', value: incorrect },
  ];
  
  const COLORS = ['#10b981', '#ef4444'];

  const questions = exam.questions || [];
  const currentQ = questions[reviewIdx];
  const userAnsId = currentQ ? attempt.answers[currentQ.id] : null;
  const isQCorrect = currentQ ? userAnsId === currentQ.correctOptionId : false;

  if (questions.length === 0) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase">No questions found in this record.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 pb-32 relative">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Summary */}
        <div className="bg-slate-900 text-white p-6 sm:p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Exam Summary</h1>
                <p className="opacity-80 text-base sm:text-lg font-medium px-4">{exam.title}</p>
                <div className="mt-6 sm:mt-10 mb-2 sm:mb-4">
                    <span className="text-5xl sm:text-7xl font-extrabold tracking-tight">{percentage}%</span>
                </div>
                <p className="text-[10px] sm:text-sm font-medium uppercase tracking-widest opacity-70">Final Percentage</p>
                
                <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 max-w-sm mx-auto px-2">
                   <div className="bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-sm">
                      <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold mb-1">Allowed</div>
                      <div className="text-base sm:text-lg font-black">{attemptLimit ?? '∞'}</div>
                   </div>
                   <div className="bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-sm">
                      <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold mb-1">Used</div>
                      <div className="text-base sm:text-lg font-black">{attemptsUsed}</div>
                   </div>
                   <div className="bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-sm">
                      <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold mb-1">Left</div>
                      <div className="text-base sm:text-lg font-black text-blue-400">{attemptsRemaining ?? '∞'}</div>
                   </div>
                </div>

                <div className="mt-8 p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-sm animate-fade-in inline-block mx-auto">
                   <p className="text-lg sm:text-xl font-bold text-blue-300">Recite Darood Pak :)</p>
                </div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="p-5 sm:p-10">
            {/* Chart Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 sm:mb-12 items-center">
                <div className="md:col-span-1 h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-2 flex justify-center gap-4 text-xs sm:text-sm font-medium">
                        <span className="text-emerald-500">Correct: {correct}</span>
                        <span className="text-red-500">Wrong: {incorrect}</span>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">Review Feedback</h3>
                    <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                        {percentage >= 70 
                            ? "Excellent performance. You've shown mastery over these clinical concepts. Focus on fine-tuning and speed for the real exam."
                            : percentage >= 50
                            ? "Strong foundation. You understand the core concepts but may benefit from reviewing diagnostic criteria for the incorrect scenarios."
                            : "Study alert. This score suggests significant gaps in high-yield medical concepts. We recommend revisiting the source material carefully."
                        }
                    </p>
                    <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                       <button 
                         onClick={handleReattempt} 
                         disabled={!canReattempt}
                         className={`w-full sm:flex-1 py-3.5 sm:py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50`}
                       >
                         {canReattempt ? 'Retake Exam' : 'No Attempts Left'}
                       </button>
                       <button 
                         onClick={handleReturnHome}
                         className="w-full sm:flex-1 py-3.5 sm:py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                       >
                         {isLoggedIn ? 'Back to Dashboard' : 'Back to Login'}
                       </button>
                    </div>
                </div>
            </div>

            {/* Detailed Review */}
            <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xl font-bold text-slate-800">Question Review</h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Use Arrows to Navigate
                    </div>
                </div>
                
                {currentQ && (
                  <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-100">
                      <div className="flex justify-between items-start mb-6">
                          <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">Q{reviewIdx + 1}</span>
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isQCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {isQCorrect ? 'Correct' : 'Incorrect'}
                          </div>
                      </div>

                      <p className="text-lg font-medium text-slate-800 mb-8 leading-relaxed">
                          {currentQ.stem || currentQ.question}
                      </p>

                      <div className="space-y-3 mb-8">
                          {((currentQ.options || []) as any[]).map((opt, i) => {
                              const optId = opt.id || String.fromCharCode(65 + i);
                              const optText = typeof opt === 'string' ? opt : opt.text;
                              const isSelected = userAnsId === optId;
                              const isCorrect = optId === currentQ.correctOptionId;

                              let style = "w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ";
                              if (isCorrect) style += "border-green-500 bg-green-50 text-green-900 ";
                              else if (isSelected && !isCorrect) style += "border-red-400 bg-red-50 text-red-900 ";
                              else style += "border-slate-50 text-slate-400 ";

                              return (
                                  <div key={optId} className={style}>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200'}`}>
                                          {optId}
                                      </div>
                                      <span className="font-medium text-sm sm:text-base">{optText}</span>
                                      {isCorrect && <span className="ml-auto text-[8px] sm:text-[10px] font-black uppercase shrink-0">Correct Answer</span>}
                                      {isSelected && !isCorrect && <span className="ml-auto text-[8px] sm:text-[10px] font-black uppercase shrink-0">Your Choice</span>}
                                  </div>
                              );
                          })}
                      </div>

                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Explanation</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">{currentQ.explanation}</p>
                      </div>
                  </div>
                )}

                <div className="flex gap-4">
                    <button 
                        onClick={() => setReviewIdx(prev => Math.max(0, prev - 1))}
                        disabled={reviewIdx === 0}
                        className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all text-sm uppercase tracking-widest"
                    >
                        ← Previous
                    </button>
                    <button 
                        onClick={() => setReviewIdx(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={reviewIdx === questions.length - 1}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black disabled:opacity-30 transition-all text-sm uppercase tracking-widest"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
