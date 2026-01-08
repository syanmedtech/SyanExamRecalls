
import React, { useState, useEffect } from 'react';
import { 
  getQuizzesForUserDashboard, 
  subscribeToUserDashboardBanner, 
  subscribeToUserDashboardSocial 
} from '../services/firebaseService';
import { ExamData, AppUser, UserDashboardBanner, UserDashboardSocial, SocialCard } from '../types';

interface UserDashboardProps {
  user: AppUser;
  onStartQuiz: (quiz: ExamData) => void;
  onOpenSettings: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onStartQuiz, onOpenSettings }) => {
  const [quizzes, setQuizzes] = useState<ExamData[]>([]);
  const [banner, setBanner] = useState<UserDashboardBanner | null>(null);
  const [social, setSocial] = useState<UserDashboardSocial | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);

  useEffect(() => {
    loadQuizzes();
    
    const unsubscribeBanner = subscribeToUserDashboardBanner((data) => {
      setBanner(data);
    });

    const unsubscribeSocial = subscribeToUserDashboardSocial((data) => {
      setSocial(data);
    });
    
    return () => {
      unsubscribeBanner();
      unsubscribeSocial();
    };
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    const data = await getQuizzesForUserDashboard();
    setQuizzes(data);
    setLoading(false);
  };

  const handleLinkClick = (url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('whatsapp://'))) {
      window.open(url, '_blank');
    }
  };

  const formatLastUpdate = (val: any) => {
    if (!val) return '';
    const d = val.toMillis ? new Date(val.toMillis()) : new Date(val);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `Updated: ${dateStr} • ${timeStr}`;
  };

  const isRecentUpdate = (val: any) => {
    if (!val) return false;
    const ms = val.toMillis ? val.toMillis() : (typeof val === 'number' ? val : new Date(val).getTime());
    return (Date.now() - ms) < (24 * 60 * 60 * 1000);
  };

  const showBanner = banner?.published && banner?.imageUrl;
  const activeSocialCards = social?.enabled ? (social.cards || []).filter(c => c.enabled && c.link) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8 sm:space-y-12 animate-fade-in pb-20 pt-4">
      <style>{`
        @keyframes soft-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); }
        }
        .animate-soft-blink {
          animation: soft-blink 1.5s ease-in-out infinite;
          animation-iteration-count: 7; /* Approx 10 seconds */
        }
      `}</style>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Welcome, {user.displayName}</h2>
          <p className="text-slate-400 font-medium mt-1">Dr. Workspace • Clinical Specialization Dashboard</p>
        </div>
        <button 
          onClick={onOpenSettings} 
          className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 min-h-[44px]"
        >
          Account Settings
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-blue-600 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-blue-100 flex flex-col justify-between h-44 sm:h-48 transform transition-hover hover:-translate-y-1">
           <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Session Status</div>
           <div className="text-2xl sm:text-3xl font-black">Active Candidate</div>
           <div className="text-[10px] sm:text-xs font-bold bg-white/20 self-start px-3 py-1.5 rounded-full backdrop-blur-md truncate max-w-full">
             {user.email}
           </div>
        </div>
        <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-slate-200 flex flex-col justify-between h-44 sm:h-48 transform transition-hover hover:-translate-y-1">
           <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Available Banks</div>
           <div className="text-2xl sm:text-3xl font-black">{quizzes.length} Resources</div>
           <p className="text-[10px] sm:text-xs font-bold text-slate-400">High-yield clinical scenarios prepared by specialists.</p>
        </div>
      </div>

      {/* Advertisement Banner Card */}
      {showBanner && (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-50 animate-scale-up group">
           <div className="relative w-full h-[180px] sm:h-[240px] bg-slate-100 overflow-hidden">
              <div 
                className="absolute inset-0 opacity-20 blur-2xl scale-110" 
                style={{ backgroundImage: `url(${banner.imageUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
              />
              <img 
                src={banner.imageUrl!} 
                className="relative w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105" 
                alt="Dashboard Banner" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 sm:p-10">
                 <div className="flex flex-wrap gap-3">
                   {banner.viewButtonEnabled && (
                     <button 
                       onClick={() => setShowBannerModal(true)}
                       className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-white/30 transition-all active:scale-95 min-h-[44px]"
                     >
                       {banner.viewButtonText}
                     </button>
                   )}
                   <button 
                     onClick={() => handleLinkClick(banner.buttonLink)}
                     disabled={!banner.buttonLink}
                     className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/50 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                   >
                     {banner.buttonText}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Social Media Section */}
      {activeSocialCards.length > 0 && (
        <div className="space-y-6">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">🔗</span>
              Connect with SYAN
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {activeSocialCards.map((card) => (
                <div key={card.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all group">
                   <div className="mb-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                         {card.id === 'facebook' ? '👥' : card.id === 'whatsapp' ? '💬' : '📺'}
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{card.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{card.subtitle}</p>
                   </div>
                   <button 
                     onClick={() => handleLinkClick(card.link)}
                     className="w-full py-3 bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all min-h-[44px]"
                   >
                     Open Link
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Main Assessments List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <span className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center text-sm">✓</span>
            Available Clinical Assessments
          </h3>
          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {quizzes.length} Items
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400 italic shadow-sm">
            No exams published to your dashboard yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {quizzes.map(quiz => {
              const showIndicator = quiz.lastUpdateType === 'append' && quiz.lastUpdatedAt;
              const isRecent = isRecentUpdate(quiz.lastUpdatedAt);
              
              return (
                <div key={quiz.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">🩺</div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="bg-teal-50 text-teal-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100">Active Exam</span>
                       {showIndicator && (
                         <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E8F8EF] text-emerald-700 border border-emerald-100 ${isRecent ? 'animate-soft-blink' : ''}`}>
                            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                            {formatLastUpdate(quiz.lastUpdatedAt)}
                         </div>
                       )}
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{quiz.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-8 leading-relaxed h-10">{quiz.description || "Comprehensive clinical scenario review and diagnostic practice."}</p>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{quiz.stats?.totalQuestions || 0} Clinical Questions</div>
                     <button 
                       onClick={() => onStartQuiz(quiz)} 
                       className="px-6 sm:px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg min-h-[44px]"
                     >
                       Begin Assessment
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Banner View Modal */}
      {showBannerModal && banner?.imageUrl && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg z-[200] flex items-center justify-center p-0 sm:p-6"
          onClick={() => setShowBannerModal(false)}
        >
          <div 
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl flex flex-col bg-white overflow-hidden sm:rounded-3xl shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
             <button 
               onClick={() => setShowBannerModal(false)}
               className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-all z-10 font-bold"
             >
               ✕
             </button>
             
             <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4">
                <img 
                  src={banner.imageUrl} 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                  alt="Full Banner" 
                />
             </div>

             <div className="p-6 sm:p-8 bg-white border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => { handleLinkClick(banner.buttonLink); setShowBannerModal(false); }}
                  disabled={!banner.buttonLink}
                  className="w-full sm:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 min-h-[54px]"
                >
                  {banner.buttonText}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;