
import React, { useState } from 'react';
import { auth } from '../services/firebaseService';

interface AdminLoginProps {
  onLogin: (success: boolean) => void;
}

const ADMIN_EMAIL = 'syanmedtechadmen@gmail.com';
const ADMIN_PASS = 'Syan&7890';

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Senior Engineer Note: We must authenticate with Firebase to allow Storage writes
      await auth.signInWithEmailAndPassword(email, password);
      onLogin(true);
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid credentials. Access denied.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Connection error. Check your internet.');
      } else {
        setError('System error. Ensure you have created this user in Firebase Auth Console.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
          🔐
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Admin Portal</h2>
        <p className="text-slate-500 text-sm mt-1">Authorized Medical Educators Only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
            placeholder="admin@example.com"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 animate-pulse">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </>
          ) : (
            'Verify Identity'
          )}
        </button>
      </form>
      
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          This system is monitored. Unauthorized access attempts are logged.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
