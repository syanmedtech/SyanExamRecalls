
import React, { useState } from 'react';
import { AppUser } from '../types';
import { updateUserProfile, changeUserPassword, auth } from '../services/firebaseService';

interface UserSettingsPageProps {
  user: AppUser;
  onBack: () => void;
}

const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ user, onBack }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!displayName.trim()) throw new Error("Display Name is required.");
      await updateUserProfile(user.uid, { displayName, whatsapp });
      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!currentPassword) throw new Error("Current password is required.");
      if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      
      await changeUserPassword(currentPassword, newPassword);
      setSuccess("Password changed successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await auth.sendPasswordResetEmail(user.email);
      setSuccess(`Password reset link sent to ${user.email}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all">←</button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Account Settings</h2>
          <p className="text-slate-500 font-medium">Manage your professional profile and security</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 animate-shake">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 font-bold rounded-2xl border border-green-100">{success}</div>}

      {/* Profile Section */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">👤</span>
          Profile Information
        </h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">WhatsApp Number</label>
            <input 
              type="tel" 
              value={whatsapp} 
              onChange={e => setWhatsapp(e.target.value)} 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" 
            />
          </div>
          <button 
            disabled={loading} 
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
      </section>

      {/* Security Section */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <span className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-sm">🔒</span>
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Current Password</label>
            <input 
              required 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">New Password</label>
              <input 
                required 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Confirm New Password</label>
              <input 
                required 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" 
              />
            </div>
          </div>
          <button 
            disabled={loading} 
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Security Password"}
          </button>
        </form>
        
        <div className="pt-6 border-t border-slate-50 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Or use email recovery</p>
          <button 
            onClick={handleResetPassword}
            disabled={loading}
            className="text-blue-600 font-bold text-sm hover:underline disabled:opacity-50"
          >
            Send Password Reset Email
          </button>
        </div>
      </section>
    </div>
  );
};

export default UserSettingsPage;