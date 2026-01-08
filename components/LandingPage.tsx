
import React, { useState, useEffect } from 'react';
import { auth, syncUserToFirestore, subscribeToBrandSettings, DEFAULT_BRAND_SETTINGS } from '../services/firebaseService';
import { BrandSettings } from '../types';
import AdminLogin from './AdminLogin';

const LandingPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);

  useEffect(() => {
    const unsubscribe = subscribeToBrandSettings((newSettings) => {
      setBrand(newSettings || DEFAULT_BRAND_SETTINGS);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error("Full Name is required.");
        if (!whatsapp.trim() || whatsapp.length < 8) throw new Error("Valid WhatsApp number is required.");
        if (password !== confirmPass) throw new Error("Passwords do not match.");
        
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        if (cred.user) {
          await cred.user.updateProfile({ displayName: name });
          await syncUserToFirestore(cred.user, name, whatsapp);
        }
        setSuccess("Account created successfully. You can now sign in.");
        setMode('signin');
      } else if (mode === 'signin') {
        await auth.signInWithEmailAndPassword(email, password);
      } else if (mode === 'forgot') {
        await auth.sendPasswordResetEmail(email);
        setSuccess("Reset link sent to your email.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const featureChips = [
    { label: "Public Exams", icon: "📋" },
    { label: "User Dashboard", icon: "👨‍⚕️" },
    { label: "Recalls Submission", icon: "🛡️" }
  ];

  return (
    <div className="min-h-screen lg:min-h-[100dvh] flex flex-col lg:flex-row bg-white overflow-hidden font-sans">
      {/* LEFT PANEL: AUTH CARD */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 z-10 bg-white">
        <div className="max-w-md w-full">
          {/* Logo & Heading */}
          <div className="mb-10 text-left">
            <div className="flex items-center gap-3 mb-6">
              {brand?.logo?.enabled && brand?.logo?.downloadURL ? (
                <img src={brand.logo.downloadURL} className="h-10 w-auto object-contain" alt="SYANRecalls Logo" />
              ) : (
                <div className="w-12 h-12 bg-[#2C7B71] rounded-2xl flex items-center justify-center text-2xl shadow-lg">🩺</div>
              )}
              <span className="text-2xl font-black text-slate-800 tracking-tight">SYAN<span className="text-[#F17E81]">Recalls</span></span>
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Join SYANRecalls' : 'Reset Password'}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              {mode === 'signin' 
                ? 'Access your clinical assessments and recalls dashboard.' 
                : mode === 'signup' 
                ? 'Start your journey with smarter clinical exam practice.' 
                : 'Enter your email to receive a password recovery link.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2C7B71] transition-all" 
                    placeholder="Dr. John Doe" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input 
                    required 
                    type="tel" 
                    value={whatsapp} 
                    onChange={e => setWhatsapp(e.target.value)} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2C7B71] transition-all" 
                    placeholder="+92 300..." 
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2C7B71] transition-all" 
                placeholder="doctor@hospital.com" 
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1 relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2C7B71] transition-all pr-12" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2C7B71] transition-colors"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {mode === 'signin' && (
                  <div className="flex justify-end pt-1">
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')} 
                      className="text-[10px] font-bold text-[#2C7B71] hover:underline uppercase tracking-widest"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <input 
                  required 
                  type="password" 
                  value={confirmPass} 
                  onChange={e => setConfirmPass(e.target.value)} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2C7B71] transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-shake flex items-center gap-3">
                <span>⚠️</span> {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 text-green-600 text-xs font-bold rounded-2xl border border-green-100 flex items-center gap-3">
                <span>✅</span> {success}
              </div>
            )}

            <button 
              disabled={loading} 
              className="w-full py-4 bg-[#2C7B71] hover:bg-[#1e544d] text-white font-bold rounded-2xl shadow-xl shadow-[#2C7B71]/10 transition-all active:scale-95 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : mode === 'signin' ? "Sign In" : mode === 'signup' ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-10 pt-6 border-t border-slate-50 flex flex-col items-center gap-4 text-center">
            {mode === 'signin' ? (
              <p className="text-sm font-medium text-slate-500">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-[#2C7B71] font-bold hover:underline">Create one</button>
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className="text-[#2C7B71] font-bold hover:underline">Sign In</button>
              </p>
            )}
            
            <button 
              onClick={() => setShowAdmin(true)} 
              className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-500 transition-colors opacity-50"
            >
              Admin Access Control
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: BRAND VISUAL */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#2C7B71] via-[#2C7B71] to-[#1e544d] justify-center items-center p-20 overflow-hidden">
        {/* Background Decorative Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#F17E81] opacity-10 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-xl text-white">
          <h2 className="text-5xl font-black leading-tight tracking-tight mb-6">
            Smarter exam practice.<br />
            <span className="text-[#EFD146]">Cleaner recalls.</span>
          </h2>
          <p className="text-xl text-[#EFD146]/80 font-medium leading-relaxed mb-12">
            Attempt high-yield clinical quizzes, track your progress, and contribute exam recall points for juniors.
          </p>

          <div className="flex flex-wrap gap-4 mb-20">
            {featureChips.map((chip, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 hover:bg-white/20 transition-all hover:-translate-y-1 cursor-default group">
                <span className="text-2xl group-hover:scale-110 transition-transform">{chip.icon}</span>
                <span className="text-sm font-bold tracking-wide">{chip.label}</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between border-t border-white/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40">
              Built for FCPS / JCAT / MBBS candidates
            </p>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F17E81]"></div>
              <div className="w-2 h-2 rounded-full bg-[#EFD146]"></div>
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE TOP BANNER FALLBACK */}
      <div className="lg:hidden h-48 w-full bg-gradient-to-br from-[#2C7B71] to-[#1e544d] relative overflow-hidden shrink-0 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10 blur-xl bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="relative z-10 px-6 text-center">
           <h2 className="text-2xl font-black text-[#EFD146] mb-1">Smarter Practice</h2>
           <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Medical Exam Excellence</p>
        </div>
      </div>

      {/* Admin Login Portal Overlay */}
      {showAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button 
              onClick={() => setShowAdmin(false)} 
              className="absolute -top-12 right-0 text-white font-bold flex items-center gap-2 hover:text-[#F17E81] transition-colors"
            >
              <span className="text-xl">✕</span> Close Portal
            </button>
            <AdminLogin onLogin={() => { setShowAdmin(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
