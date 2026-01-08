
import React, { useState } from 'react';
import { RegistrationData, ExamData } from '../types';
import { checkBanStatus } from '../services/firebaseService';
import { useDevToolsTermination } from '../hooks/useDevToolsTermination';
import { useDisableRightClick } from '../hooks/useDisableRightClick';
import DevToolsTerminationOverlay from './DevToolsTerminationOverlay';

interface StudentRegistrationProps {
  quiz: ExamData;
  onRegistered: (data: RegistrationData) => void;
}

const EXAM_TARGETS = [
  "FCPS Medicine", "FCPS Surgery", "FCPS Pediatrics", "FCPS Gynecology", "FCPS Radiology", "FCPS Eye",
  "JCAT", "MBBS", "USMLE", "PLAB", "MRCP", "MRCOG", "MRCS", "HAAD", "SLE", "AMC", "UKMLE", "Other Foreign Exam"
];

const StudentRegistration: React.FC<StudentRegistrationProps> = ({ quiz, onRegistered }) => {
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: '',
    whatsapp: '',
    email: '',
    college: '',
    status: 'Student',
    examPreparingFor: EXAM_TARGETS[0]
  });
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Security Hooks
  useDisableRightClick(true);
  const isTerminated = useDevToolsTermination({
    area: "PUBLIC_QUIZ_FORM",
    shareId: quiz.link?.shareId,
    quizId: quiz.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTerminated) return;
    setIsChecking(true);
    setError(null);
    try {
      const isBanned = await checkBanStatus(formData.email);
      if (isBanned) {
        setError("You are banned from this website. Please contact the administrator.");
        setIsChecking(false);
        return;
      }
      onRegistered(formData);
    } catch (err) {
      setError("Communication error. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  if (isTerminated) return <DevToolsTerminationOverlay />;

  return (
    <div className="max-w-xl mx-auto mt-4 sm:mt-10 p-6 sm:p-10 bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 relative mb-10">
      <div className="text-center mb-8 sm:mb-10">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl sm:text-3xl">📝</div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Registration Mandatory</h2>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">Enter your details to access the exam "{quiz.title}".</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base" placeholder="Dr. John Doe" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</label>
            <input required type="tel" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base" placeholder="+92 300..." />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base" placeholder="doctor@hospital.com" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">College / Hospital</label>
          <input required type="text" value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base" placeholder="KEMU / Mayo Hospital" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base appearance-none">
              <option>Student</option>
              <option>HO</option>
              <option>PG</option>
              <option>MO</option>
              <option>Registrar</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Target Exam</label>
            <select value={formData.examPreparingFor} onChange={e => setFormData({...formData, examPreparingFor: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-base appearance-none">
              {EXAM_TARGETS.map(ex => <option key={ex}>{ex}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl sm:rounded-2xl text-sm font-bold border border-red-100">{error}</div>}

        <button disabled={isChecking} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 min-h-[54px] active:scale-95">
          {isChecking ? "Validating Access..." : "Proceed to Instructions →"}
        </button>
      </form>
    </div>
  );
};

export default StudentRegistration;