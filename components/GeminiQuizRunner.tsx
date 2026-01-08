
import React, { useState, useEffect, useRef } from 'react';
import { ExamData, MCQ, StudentAttempt, RegistrationData, SecuritySettings, BrandSettings, AdBanner } from '../types';
import SecurityWrapper from './SecurityWrapper';
import { 
  logViolation, 
  getGlobalSecurity, 
  logQuizEvent, 
  subscribeToBrandSettings, 
  getAdById, 
  DEFAULT_BRAND_SETTINGS, 
  DEFAULT_SECURITY_SETTINGS,
  loadQuizQuestions,
  repairQuizCount,
  countUserAttempts
} from '../services/firebaseService';
import { generateAudio } from '../services/geminiService';
import { useDevToolsTermination } from '../hooks/useDevToolsTermination';
import { useDisableRightClick } from '../hooks/useDisableRightClick';
import DevToolsTerminationOverlay from './DevToolsTerminationOverlay';

interface GeminiQuizRunnerProps {
  quiz: ExamData;
  studentName: string;
  registrationData?: RegistrationData;
  onComplete: (attempt: StudentAttempt) => void;
  onTerminate: (reason: string) => void;
  onQuit?: (status: 'quit_submitted' | 'quit_discarded') => void;
  mode?: 'public' | 'user';
  userId?: string;
}

const GeminiQuizRunner: React.FC<GeminiQuizRunnerProps> = ({ 
  quiz, 
  studentName, 
  registrationData, 
  onComplete,
  onTerminate,
  onQuit,
  mode = 'public',
  userId
}) => {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showKeyNotes, setShowKeyNotes] = useState(false);
  const [startTime] = useState(Date.now());
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [activeAd, setActiveAd] = useState<AdBanner | null>(null);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [canCloseAd, setCanCloseAd] = useState(false);
  const [violationLogs, setViolationLogs] = useState<string[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Security Hooks
  useDisableRightClick(true);
  const isTerminatedByDevTools = useDevToolsTermination({
    area: mode === 'user' ? "USER_DASHBOARD_ATTEMPT" : "QUIZ_ATTEMPT",
    quizId: quiz.id,
    shareId: quiz.link?.shareId,
    email: registrationData?.email || (mode === 'user' ? studentName : undefined)
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // Load canonical questions
      const loadedQs = await loadQuizQuestions(quiz.id);
      
      // Repair check
      const expectedCount = quiz.stats?.totalQuestions || 0;
      if (expectedCount > 0 && loadedQs.length === 0) {
        await repairQuizCount(quiz.id, 0);
      } else if (expectedCount !== loadedQs.length && loadedQs.length > 0) {
        await repairQuizCount(quiz.id, loadedQs.length);
      }
      
      setQuestions(loadedQs);

      // Check user attempts if in dashboard mode
      if (mode === 'user' && userId && quiz.userPublish?.attemptLimit) {
        const attempts = await countUserAttempts(quiz.id, userId);
        if (attempts >= quiz.userPublish.attemptLimit) {
          onTerminate("Maximum attempts for this assessment reached.");
          return;
        }
      }

      getGlobalSecurity().then((s) => setSecurity(s || DEFAULT_SECURITY_SETTINGS));
      setLoading(false);
    };

    init();

    const unsubscribe = subscribeToBrandSettings(async (settings) => {
      const finalBrand = settings || DEFAULT_BRAND_SETTINGS;
      setBrand(finalBrand);
      if (finalBrand?.ads?.enabled && finalBrand?.ads?.activeAdId) {
        const ad = await getAdById(finalBrand.ads.activeAdId);
        setActiveAd(ad);
      }
    });
    return () => unsubscribe();
  }, [quiz.id]);

  useEffect(() => {
    if (activeAd && brand?.ads?.enabled) {
      const popupTimer = setTimeout(() => {
        setShowAdPopup(true);
        setTimeout(() => setCanCloseAd(true), activeAd.timing.closeButtonAfterSeconds * 1000);
      }, activeAd.timing.showPopupAfterSeconds * 1000);
      return () => clearTimeout(popupTimer);
    }
  }, [activeAd, brand?.ads?.enabled]);

  const currentQ = questions[currentIdx];
  const selectedId = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = !!selectedId;
  const isCorrect = currentQ ? selectedId === currentQ.correctOptionId : false;

  const handleSelect = (optionId: string) => {
    if (!currentQ || isAnswered || isTerminatedByDevTools) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }));
    if (optionId === currentQ.correctOptionId) setCorrectCount(c => c + 1);
    else setWrongCount(w => w + 1);
  };

  const handlePlayVignette = async () => {
    if (!currentQ || isPlayingAudio || isTerminatedByDevTools) return;
    setIsPlayingAudio(true);
    await generateAudio(currentQ.stem || currentQ.question, brand?.voice?.voiceName ?? 'Kore');
    setIsPlayingAudio(false);
  };

  const createAttemptObject = (status: StudentAttempt['status']): StudentAttempt => {
    return {
      studentId: registrationData?.email || userId || studentName.toLowerCase().replace(/\s/g, '-'),
      studentName,
      registrationData,
      examId: quiz.id,
      answers,
      score: correctCount,
      totalQuestions: questions.length,
      completedAt: Date.now(),
      timeTakenSeconds: Math.floor((Date.now() - startTime) / 1000),
      correct: correctCount,
      wrong: wrongCount,
      scorePercent: Math.round((correctCount / (questions.length || 1)) * 100),
      violations: violationLogs.length,
      status,
      questionIdsSnapshot: questions.map(q => q.id)
    };
  };

  const handleNext = () => {
    if (isTerminatedByDevTools) return;
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(idx => idx + 1);
      setShowHint(false);
      setShowKeyNotes(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onComplete(createAttemptObject('submitted'));
    }
  };

  const handleSecurityViolation = async (type: string) => {
    if (isTerminatedByDevTools) return;
    setViolationLogs(prev => [...prev, type]);
    const identifier = registrationData?.email || userId;
    if (identifier) {
      await logViolation(quiz.id, identifier, type);
    }
  };

  const handleMaxViolations = () => {
    onTerminate("Maximum security violations reached. Session terminated.");
  };

  const handleQuitAction = async (action: 'SUBMIT' | 'DISCARD') => {
    const status = action === 'SUBMIT' ? 'quit_submitted' : 'quit_discarded';
    const identifier = registrationData?.email || userId;
    await logQuizEvent(quiz.id, { 
      type: action === 'SUBMIT' ? 'QUIT_SUBMIT' : 'QUIT_DISCARD',
      email: identifier 
    });
    if (onQuit) onQuit(status);
  };

  if (isTerminatedByDevTools) return <DevToolsTerminationOverlay />;
  
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Validating Clinical Bank...</p>
    </div>
  );

  if (!security) return <div className="flex items-center justify-center min-h-screen text-slate-400">Finalizing Security Protocols...</div>;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Diagnostic Error</h2>
        <p className="text-slate-500 mb-8">No questions found in this clinical bank. The administrator has been notified to repair this quiz.</p>
        <button onClick={() => window.location.hash = ""} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">Return to Dashboard</button>
      </div>
    );
  }

  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <SecurityWrapper 
      settings={security || DEFAULT_SECURITY_SETTINGS} 
      onViolation={handleSecurityViolation} 
      onMaxViolations={handleMaxViolations}
      quizId={quiz.id}
      shareId={quiz.link?.shareId || undefined}
      attemptId={registrationData?.email || userId}
    >
      {brand?.watermark?.enabled && brand?.watermark?.downloadURL && (
        <div className="fixed inset-0 pointer-events-none z-[50] flex items-center justify-center overflow-hidden" style={{ opacity: (brand.watermark.opacity ?? 30) / 100 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-20 transform rotate-[-30deg] scale-150">
            {Array.from({ length: 16 }).map((_, i) => (
              <img key={i} src={brand.watermark!.downloadURL!} className="w-32 sm:w-48 object-contain" alt="Watermark" />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto min-h-screen flex flex-col pt-4 pb-32 px-4 relative z-[10]">
        <div className="text-center mb-4 sm:mb-6">
           <h1 className="text-sm sm:text-xl font-bold text-slate-800 tracking-tight line-clamp-1">{quiz.title}</h1>
        </div>

        <div className="flex items-center justify-between mb-4 px-1 sm:px-2 gap-3">
          <div className="flex-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm font-medium shrink-0">
            <span className="text-slate-500">{currentIdx + 1} / {questions.length}</span>
            <div className="flex gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border border-red-100">✕ {wrongCount}</div>
              <div className="flex items-center gap-1 bg-green-50 text-green-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border border-green-100">✓ {correctCount}</div>
            </div>
          </div>
        </div>

        {currentQ && (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed">
                {currentIdx + 1}. {currentQ.stem || currentQ.question}
              </h2>
              {brand?.voice?.enabled && (
                <button 
                  onClick={handlePlayVignette}
                  disabled={isPlayingAudio}
                  className="ml-3 sm:ml-4 p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  title="AI Narration"
                >
                  🔊
                </button>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {((currentQ.options || []) as any[]).map((opt: any, optIdx: number) => {
                const optId = opt.id || String.fromCharCode(65 + optIdx);
                const optText = typeof opt === 'string' ? opt : opt.text;
                const isUserSelected = selectedId === optId;
                const isAnswerKey = optId === currentQ.correctOptionId;

                let cardStyle = "w-full p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-300 relative group active:scale-[0.98] ";
                let feedback = null;

                if (isAnswered) {
                  if (isAnswerKey) {
                    cardStyle += "border-green-500 bg-green-50/50 shadow-sm ";
                    feedback = (
                      <div className="mt-2 animate-fade-in">
                        <div className="text-green-600 font-bold text-[10px] sm:text-xs flex items-center gap-1">✓ {isUserSelected ? "Right answer!" : "Correct solution"}</div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{currentQ.explanation}</p>
                      </div>
                    );
                  } else if (isUserSelected && !isCorrect) {
                    cardStyle += "border-red-400 bg-red-50/50 shadow-sm ";
                    feedback = (
                      <div className="mt-2 animate-fade-in">
                        <div className="text-red-600 font-bold text-[10px] sm:text-xs flex items-center gap-1">✕ Not quite</div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{currentQ.explanation}</p>
                      </div>
                    );
                  } else {
                    cardStyle += "border-slate-100 opacity-60 ";
                  }
                } else {
                  cardStyle += "border-slate-100 hover:border-blue-200 hover:bg-slate-50 ";
                }

                return (
                  <button key={optId} onClick={() => handleSelect(optId)} disabled={isAnswered} className={cardStyle}>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold border shrink-0 mt-0.5 ${isAnswered && isAnswerKey ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-slate-400'}`}>
                        {optId}
                      </div>
                      <span className="text-slate-700 font-medium text-sm sm:text-base leading-tight pt-0.5">{optText}</span>
                    </div>
                    {feedback}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-5 sm:pt-6 space-y-4">
              {currentQ.hint && !isAnswered && (
                <div>
                  <button onClick={() => setShowHint(!showHint)} className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors py-1">
                    <span className={`transition-transform duration-200 ${showHint ? 'rotate-180' : ''}`}>▾</span> Show hint
                  </button>
                  {showHint && (
                    <div className="mt-3 p-4 bg-blue-50/50 rounded-xl sm:rounded-2xl text-blue-800 text-xs sm:text-sm flex gap-3 animate-slide-down">
                      <span className="text-lg">💡</span>
                      <p className="italic">{currentQ.hint}</p>
                    </div>
                  )}
                </div>
              )}

              {isAnswered && currentQ.keyNotes && currentQ.keyNotes.length > 0 && (
                <div>
                  <button onClick={() => setShowKeyNotes(!showKeyNotes)} className="text-xs sm:text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors py-1">
                    <span className={`transition-transform duration-200 ${showKeyNotes ? 'rotate-180' : ''}`}>▾</span> Show High-Yield Key Notes
                  </button>
                  {showKeyNotes && (
                    <div className="mt-3 p-5 sm:p-6 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 animate-slide-down">
                      <h4 className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Key Exam Points</h4>
                      <ul className="space-y-2">
                        {currentQ.keyNotes.map((note, i) => (
                          <li key={i} className="flex gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed"><span className="text-blue-500 font-bold">•</span>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Powered by SYAN MedTech</div>

        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 pb-[calc(12px+env(safe-area-inset-bottom))] z-50">
          <div className="max-w-3xl mx-auto flex justify-between items-center gap-4">
            <div className="flex gap-2 shrink-0">
              <button onClick={() => {
                setCurrentIdx(Math.max(0, currentIdx - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} disabled={currentIdx === 0} className="px-4 sm:px-6 py-2.5 rounded-full text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-30 text-sm">Back</button>
              <button onClick={() => setShowQuitModal(true)} className="px-3 sm:px-4 py-2.5 rounded-full text-red-500 font-medium hover:bg-red-50 transition-colors text-sm">Quit</button>
            </div>
            <button onClick={handleNext} disabled={!isAnswered} className={`flex-1 sm:flex-none px-8 sm:px-12 py-3 rounded-full font-bold shadow-lg transition-all transform active:scale-95 text-sm sm:text-base ${isAnswered ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {currentIdx === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>

      {showAdPopup && activeAd && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 max-w-lg w-full shadow-2xl animate-scale-up relative overflow-y-auto max-h-[90vh]">
            {canCloseAd ? (
              <button onClick={() => setShowAdPopup(false)} className="absolute top-4 right-4 w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors z-[10]">✕</button>
            ) : (
              <div className="absolute top-4 right-4 bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black text-slate-400 z-[10]">WAIT...</div>
            )}
            <div className="aspect-video bg-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden mb-5 sm:mb-6 relative">
              <img src={activeAd.banner.downloadURL!} className="w-full h-full object-cover" alt="Advertisement" />
            </div>
            <div className="text-center space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight px-2">Exclusive Clinical Insights</h3>
              <p className="text-slate-500 text-xs sm:text-sm px-2">Access specialized clinical resources and exam recalls prepared by medical experts.</p>
              <a href={activeAd.ctaButton.link} target="_blank" rel="noopener noreferrer" className="block w-full py-4 sm:py-5 bg-blue-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-center tracking-widest uppercase text-xs sm:text-sm active:scale-95">{activeAd.ctaButton.text}</a>
            </div>
          </div>
        </div>
      )}

      {showQuitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Quit Exam?</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">Your progress will be saved. Are you sure you want to end your session?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleQuitAction('SUBMIT')} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-black transition-all text-sm active:scale-95">Quit & Submit Score</button>
              <button onClick={() => handleQuitAction('DISCARD')} className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-xl sm:rounded-2xl hover:bg-red-100 transition-all border border-red-100 text-sm active:scale-95">Quit & Discard</button>
              <button onClick={() => setShowQuitModal(false)} className="w-full py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl sm:rounded-2xl transition-all text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </SecurityWrapper>
  );
};

export default GeminiQuizRunner;
