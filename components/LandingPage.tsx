
import React, { useState } from 'react';
import { auth, syncUserToFirestore } from '../services/firebaseService';
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

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-100 animate-scale-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🩺</div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">SYAN<span className="text-teal-600">Recalls</span></h1>
          <p className="text-slate-400 font-medium text-sm mt-2">Professional Medical Examination Platform</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-600" placeholder="Dr. John Doe" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">WhatsApp Number</label>
                <input required type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-600" placeholder="+92 300 1234567" />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-600" placeholder="doctor@hospital.com" />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-600" placeholder="••••••••" />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Confirm Password</label>
              <input required type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-600" placeholder="••••••••" />
            </div>
          )}

          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 animate-shake">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl border border-green-100">{success}</div>}

          <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 mt-4">
            {loading ? "Processing..." : mode === 'signin' ? "Sign In" : mode === 'signup' ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          {mode === 'signin' ? (
            <>
              <button onClick={() => setMode('signup')} className="hover:text-slate-600">Need an account? Sign Up</button>
              <button onClick={() => setMode('forgot')} className="hover:text-slate-600">Forgot Password?</button>
            </>
          ) : (
            <button onClick={() => setMode('signin')} className="hover:text-slate-600">Already have an account? Sign In</button>
          )}
        </div>
      </div>

      <button onClick={() => setShowAdmin(true)} className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-500 transition-colors">Admin Access Control</button>

      {showAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button onClick={() => setShowAdmin(false)} className="absolute -top-12 right-0 text-white font-bold">✕ Close</button>
            <AdminLogin onLogin={() => { setShowAdmin(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;