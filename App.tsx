
import React, { useState, useEffect, useMemo } from 'react';
import { auth, syncUserToFirestore, getQuizByShareId, subscribeToBrandSettings, DEFAULT_BRAND_SETTINGS, validateRecallShare, submitGeminiAttempt, submitUserAttempt, registerPublicUser, loadQuizQuestions } from './services/firebaseService';
import { ExamConfig, ExamData, MCQ, StudentAttempt, RegistrationData, BrandSettings, AppUser } from './types';
import LandingPage from './components/LandingPage';
import AdminTabs from './components/AdminTabs';
import AdminCreateQuiz from './components/AdminCreateQuiz';
import InputModule from './components/InputModule';
import UserDashboard from './components/UserDashboard';
import UserSettingsPage from './components/UserSettingsPage';
import PublishControls from './components/PublishControls';
import GeminiQuizRunner from './components/GeminiQuizRunner';
import ResultView from './components/ResultView';
import StudentRegistration from './components/StudentRegistration';
import RecallSubmissionForm from './components/RecallSubmissionForm';
import ErrorBoundary from './components/ErrorBoundary';

type AppState = 
  | 'LOADING'
  | 'LANDING'
  | 'USER_DASHBOARD'
  | 'USER_SETTINGS'
  | 'ADMIN_INPUT'
  | 'ADMIN_CREATE' 
  | 'HISTORY' 
  | 'PUBLISH_CONTROLS'
  | 'STUDENT_REGISTRATION'
  | 'STUDENT_INSTRUCTIONS'
  | 'STUDENT_EXAM_GEMINI' 
  | 'RESULT'
  | 'TERMINATED'
  | 'PUBLIC_RECALLS';

const App: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [state, setState] = useState<AppState>('LOADING');
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  
  // Quiz specific states
  const [activeExam, setActiveExam] = useState<ExamData | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  
  // Creation Flow State
  const [creationConfig, setCreationConfig] = useState<Partial<ExamConfig>>({});

  // --- EFFECT: AUTH OBSERVER ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const syncedUser = await syncUserToFirestore(firebaseUser);
        
        // AUTH GUARD: Block banned registered users
        if (syncedUser.role !== 'admin' && syncedUser.isBanned) {
          await auth.signOut();
          setUser(null);
          setAuthState('unauthenticated');
          alert("Your account has been disabled. Please contact the administrator.");
          return;
        }

        setUser(syncedUser);
        setAuthState('authenticated');
      } else {
        setUser(null);
        setAuthState('unauthenticated');
      }
    });

    const unsubscribeBrand = subscribeToBrandSettings((newSettings) => {
      setBrand(newSettings || DEFAULT_BRAND_SETTINGS);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeBrand();
    };
  }, []);

  // --- EFFECT: REACTIVE ROUTING ---
  useEffect(() => {
    const handleRouting = async () => {
      const hash = window.location.hash;
      
      if (!hash || hash === "#dashboard") {
        if (authState === 'loading') {
          setState('LOADING');
        } else if (user) {
          setState(user.role === 'admin' ? 'HISTORY' : 'USER_DASHBOARD');
        } else {
          setState('LANDING');
        }
        return;
      }

      if (hash === "#settings") {
        if (user) {
          setState('USER_SETTINGS');
        } else {
          window.location.hash = "";
        }
        return;
      }

      if (hash.startsWith('#examId=')) {
        const id = hash.split('=')[1];
        const quiz = await getQuizByShareId(id);
        if (quiz) {
          setActiveExam(quiz);
          setShareId(id);
          setState('STUDENT_REGISTRATION');
          document.title = `${quiz.title} | SYAN Exam Recalls`;
        } else {
          alert("Link invalid or expired.");
          window.location.hash = "";
        }
      } else if (hash.startsWith('#recallsId=')) {
        const id = hash.split('=')[1];
        const share = await validateRecallShare(id);
        if (share) {
          setShareId(id);
          setState('PUBLIC_RECALLS');
        } else {
          window.location.hash = "";
        }
      }
    };

    handleRouting();

    window.addEventListener('hashchange', handleRouting);
    return () => window.removeEventListener('hashchange', handleRouting);
  }, [user, authState]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    await auth.signOut();
    window.location.hash = "";
  };

  const handleStartQuiz = async (quiz: ExamData) => {
    const questions = await loadQuizQuestions(quiz.id);
    setActiveExam({ ...quiz, questions });
    setState('STUDENT_INSTRUCTIONS');
  };

  const handleRegistration = async (data: RegistrationData) => {
    setRegistrationData(data);
    if (activeExam) await registerPublicUser(activeExam, data);
    setState('STUDENT_INSTRUCTIONS');
  };

  const onExamComplete = async (attemptData: StudentAttempt) => {
    try {
      if (user && user.role === 'user') {
        await submitUserAttempt(user.uid, attemptData);
      } else {
        await submitGeminiAttempt(attemptData);
      }
      setAttempt(attemptData);
      setState('RESULT');
    } catch (e) {
      alert("Submission error.");
    }
  };

  const isPublicFlow = ['STUDENT_REGISTRATION', 'STUDENT_INSTRUCTIONS', 'STUDENT_EXAM_GEMINI', 'RESULT', 'TERMINATED', 'PUBLIC_RECALLS'].includes(state);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 sm:pb-20">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => { if(!isPublicFlow) window.location.hash = ""; }}>
              {brand?.logo?.enabled && brand?.logo?.downloadURL ? (
                <img src={brand.logo.downloadURL} className="h-8 sm:h-10 w-auto mr-2 sm:mr-3 object-contain" alt="Logo" />
              ) : (
                <span className="text-xl sm:text-2xl mr-2">🩺</span>
              )}
              <span className="font-bold text-lg sm:text-xl text-slate-800">SYAN<span className="text-teal-600"> ExamRecalls</span></span>
            </div>

            {user && (
              <div className="flex items-center space-x-2 sm:space-x-4">
                {user.role === 'admin' ? (
                  <>
                    <button 
                      onClick={() => setState('ADMIN_INPUT')} 
                      className={`text-[10px] sm:text-xs font-bold px-4 py-2 rounded-full transition-all ${state === 'ADMIN_INPUT' ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Create
                    </button>
                    <button 
                      onClick={() => setState('ADMIN_CREATE')} 
                      className={`text-[10px] sm:text-xs font-bold px-4 py-2 rounded-full transition-all ${state === 'ADMIN_CREATE' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Gemini
                    </button>
                    <button 
                      onClick={() => setState('HISTORY')} 
                      className={`text-[10px] sm:text-xs font-bold px-4 py-2 rounded-full transition-all ${state === 'HISTORY' ? 'bg-slate-100 text-slate-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Admin
                    </button>
                  </>
                ) : (
                  <button onClick={() => window.location.hash = "#dashboard"} className={`text-[10px] sm:text-xs font-bold px-3 py-2 rounded-xl ${state === 'USER_DASHBOARD' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>My Dashboard</button>
                )}
                <button onClick={handleLogout} className="text-[10px] sm:text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-full hover:bg-red-100 transition-all">Exit</button>
              </div>
            )}
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {state === 'LOADING' && <div className="text-center py-20 animate-pulse text-slate-400 font-bold uppercase tracking-widest">Securing Connection...</div>}
          
          {state === 'LANDING' && <LandingPage />}
          
          {state === 'USER_DASHBOARD' && user && <UserDashboard user={user} onStartQuiz={handleStartQuiz} onOpenSettings={() => window.location.hash = "#settings"} />}

          {state === 'USER_SETTINGS' && user && <UserSettingsPage user={user} onBack={() => window.location.hash = "#dashboard"} />}

          {state === 'STUDENT_REGISTRATION' && activeExam && <StudentRegistration quiz={activeExam} onRegistered={handleRegistration} />}

          {state === 'STUDENT_INSTRUCTIONS' && activeExam && (
            <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl mt-10 animate-scale-up">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">{activeExam.title}</h1>
              <p className="text-slate-500 mb-8 italic">{activeExam.description || "Enter the secure clinical assessment environment."}</p>
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl flex gap-4 border border-slate-100">
                  <div className="text-2xl">⏱</div>
                  <div><p className="font-bold text-slate-800">Time Limit</p><p className="text-xs text-slate-500">{activeExam.durationMinutes || 60} Minutes</p></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl flex gap-4 border border-slate-100">
                  <div className="text-2xl">🛡</div>
                  <div><p className="font-bold text-slate-800">Security Active</p><p className="text-xs text-slate-500">Monitoried environment. Focus mode required.</p></div>
                </div>
              </div>
              <button onClick={() => setState('STUDENT_EXAM_GEMINI')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all">Start Examination</button>
            </div>
          )}

          {state === 'STUDENT_EXAM_GEMINI' && activeExam && (
            <GeminiQuizRunner 
              quiz={activeExam} 
              studentName={user?.displayName || registrationData?.fullName || "Guest"} 
              registrationData={registrationData || undefined}
              onComplete={onExamComplete}
              onTerminate={(r) => { setTerminationReason(r); setState('TERMINATED'); }}
              mode={user ? 'user' : 'public'}
              userId={user?.uid}
            />
          )}

          {state === 'RESULT' && activeExam && attempt && (
            <ResultView 
              exam={activeExam} 
              attempt={attempt} 
              shareId={shareId} 
              isLoggedIn={!!user}
            />
          )}

          {state === 'ADMIN_INPUT' && (
            <div className="py-10">
              <InputModule 
                onDataReady={(text, file, mime) => {
                  setCreationConfig({ sourceText: text, sourceFile: file, sourceMimeType: mime });
                  setState('ADMIN_CREATE');
                }} 
              />
            </div>
          )}

          {state === 'ADMIN_CREATE' && (
            <AdminCreateQuiz 
              initialConfig={creationConfig}
              onPublished={(id) => { 
                setShareId(id); 
                setState('HISTORY'); 
              }} 
            />
          )}

          {state === 'HISTORY' && <AdminTabs />}

          {state === 'PUBLISH_CONTROLS' && activeExam && (
            <div className="flex justify-center mt-10">
              <PublishControls quiz={activeExam} onSaved={() => setState('HISTORY')} onCancel={() => setState('HISTORY')} />
            </div>
          )}

          {state === 'PUBLIC_RECALLS' && shareId && <RecallSubmissionForm shareId={shareId} />}

          {state === 'TERMINATED' && (
            <div className="max-w-md mx-auto mt-20 p-12 bg-white rounded-3xl shadow-2xl text-center border-t-8 border-red-600">
              <div className="text-6xl mb-6">🚫</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Revoked</h2>
              <p className="text-slate-500 mb-8">{terminationReason}</p>
              <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl">Return Home</button>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
