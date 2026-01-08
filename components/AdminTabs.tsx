
import React, { useState, useEffect } from 'react';
import { 
  getAllQuizzes, 
  getPublicUsers, 
  getGlobalPublicUsers,
  banUser, 
  unbanUser, 
  getGlobalSecurity, 
  updateGlobalSecurity,
  deleteQuiz,
  deletePublicUser
} from '../services/firebaseService';
import { ExamData, SecuritySettings } from '../types';
import PublishControls from './PublishControls';
import BrandSettings from './BrandSettings';
import AdminRecallsReview from './AdminRecallsReview';
import AdminRecallsLink from './AdminRecallsLink';
import AdminQuizViewer from './AdminQuizViewer';
import AdminLoginUsers from './AdminLoginUsers';

const AdminTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'users' | 'login_users' | 'security' | 'brand' | 'recalls' | 'recallsLink'>('history');
  const [quizzes, setQuizzes] = useState<ExamData[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<ExamData | null>(null);
  const [viewingQuiz, setViewingQuiz] = useState<ExamData | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [search, setSearch] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [filterQuizId, setFilterQuizId] = useState<string>("all");
  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
    loadSecurity();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUserData();
    }
  }, [activeTab, filterQuizId]);

  const loadHistory = async () => {
    const data = await getAllQuizzes();
    setQuizzes(data);
  };

  const loadSecurity = async () => {
    const data = await getGlobalSecurity();
    setSecurity(data);
  };

  const loadUserData = async () => {
    if (filterQuizId === 'all') {
      const data = await getGlobalPublicUsers();
      setUsers(data);
    } else {
      const data = await getPublicUsers(filterQuizId);
      setUsers(data);
    }
  };

  const handleOpenLinkModal = (quiz: ExamData) => {
    setSelectedQuiz(quiz);
    setShowLinkModal(true);
  };

  const handleCloseModal = () => {
    setShowLinkModal(false);
    setSelectedQuiz(null);
    loadHistory();
  };

  const handleBan = async (email: string, isCurrentlyBanned: boolean = false) => {
    const action = isCurrentlyBanned ? 'Unban' : 'Ban';
    if (!window.confirm(`${action} user ${email} globally?`)) return;
    
    if (isCurrentlyBanned) {
      await unbanUser(email);
    } else {
      await banUser(email);
    }
    
    alert(`User ${action}ned Successfully.`);
    loadUserData();
    if (selectedDetailUser && selectedDetailUser.email === email) {
      setSelectedDetailUser({ ...selectedDetailUser, isBanned: !isCurrentlyBanned });
    }
  };

  const handleDeleteUser = async (quizId: string, email: string) => {
    if (!window.confirm("Delete this registration record?")) return;
    await deletePublicUser(quizId, email);
    loadUserData();
    setSelectedDetailUser(null);
  };

  const exportCSV = () => {
    const headers = ["Quiz Title", "Name", "Email", "WhatsApp", "College", "Status", "Exam Prep", "Banned", "Created"];
    const rows = users.map(u => [
      u.quizTitle || 'N/A',
      u.fullName, 
      u.email, 
      u.whatsapp, 
      u.college, 
      u.status, 
      u.examPreparingFor,
      u.isBanned ? 'Yes' : 'No',
      u.createdAt?.toMillis ? new Date(u.createdAt.toMillis()).toLocaleString() : 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `users_export_${filterQuizId}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-wrap gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Quiz History</button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Exam Users</button>
        <button onClick={() => setActiveTab('login_users')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'login_users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Login Users</button>
        <button onClick={() => setActiveTab('recalls')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'recalls' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Recalls Review</button>
        <button onClick={() => setActiveTab('recallsLink')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'recallsLink' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Recalls Link</button>
        <button onClick={() => setActiveTab('security')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'security' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Global Security</button>
        <button onClick={() => setActiveTab('brand')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'brand' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Brand Setting</button>
      </div>

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Generated Quizzes</h3>
            <input 
              type="text" 
              placeholder="Search by title..." 
              className="px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Attempts</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizzes.filter(q => q.title.toLowerCase().includes(search.toLowerCase())).map(q => {
                   const isPublished = q.status === 'published' && q.link?.shareId && q.link?.isActive;
                   return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{q.title}</td>
                      <td className="p-4 text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}>{isPublished ? 'Published' : 'Draft'}</span>
                      </td>
                      <td className="p-4 font-medium text-blue-600 cursor-pointer hover:underline text-xs" onClick={() => { setFilterQuizId(q.id); setActiveTab('users'); }}>
                        {q.stats?.totalAttempts || 0} users
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => setViewingQuiz(q)} 
                          className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-widest"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleOpenLinkModal(q)} 
                          className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-widest"
                        >
                          Link
                        </button>
                        <button onClick={async () => { if(confirm("Delete this quiz forever?")) { await deleteQuiz(q.id); loadHistory(); } }} className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px] tracking-widest">Del</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingQuiz && (
        <AdminQuizViewer quiz={viewingQuiz} onClose={() => setViewingQuiz(null)} />
      )}

      {showLinkModal && selectedQuiz && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <PublishControls 
            quiz={selectedQuiz} 
            onSaved={handleCloseModal} 
            onCancel={handleCloseModal} 
          />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h3 className="text-xl font-bold text-slate-800">Exam Users</h3>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Filter:</label>
                <select 
                  value={filterQuizId}
                  onChange={(e) => setFilterQuizId(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Exams</option>
                  {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
              </div>
              {users.length > 0 && (
                <button onClick={exportCSV} className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-green-700 transition-colors">Export CSV</button>
              )}
            </div>
          </div>

          {users.length === 0 ? (
            <div className="py-20 text-center text-slate-400">No users found for this selection.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-4">Sr.</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email / WhatsApp</th>
                    {filterQuizId === 'all' && <th className="p-4">Exam</th>}
                    <th className="p-4">Target Exam</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, i) => (
                    <tr key={i} className={`hover:bg-slate-50 ${u.isBanned ? 'opacity-50' : ''}`}>
                      <td className="p-4 text-slate-400">#{i+1}</td>
                      <td className="p-4">
                        <div className="font-bold flex items-center gap-2">
                          {u.fullName}
                          {u.isBanned && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter">BANNED</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 font-medium">{u.email}</div>
                        <div className="text-xs text-slate-400">{u.whatsapp}</div>
                      </td>
                      {filterQuizId === 'all' && <td className="p-4 text-xs font-medium text-slate-500 truncate max-w-[150px]">{u.quizTitle}</td>}
                      <td className="p-4 text-blue-600 font-medium">{u.examPreparingFor}</td>
                      <td className="p-4 text-right space-x-3">
                        <button onClick={() => setSelectedDetailUser(u)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">View</button>
                        <button onClick={() => handleBan(u.email, !!u.isBanned)} className="text-orange-600 hover:text-orange-800 font-bold text-xs uppercase">{u.isBanned ? 'Unban' : 'Ban'}</button>
                        <button onClick={() => handleDeleteUser(u.quizId, u.email)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'login_users' && <AdminLoginUsers />}

      {activeTab === 'recalls' && <AdminRecallsReview />}
      {activeTab === 'recallsLink' && <AdminRecallsLink />}

      {/* USER DETAIL MODAL */}
      {selectedDetailUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative animate-scale-up">
            <button onClick={() => setSelectedDetailUser(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">✕</button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold">
                {selectedDetailUser.fullName?.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{selectedDetailUser.fullName}</h3>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedDetailUser.status}</span>
                  {selectedDetailUser.isBanned && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">BANNED</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-10">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                <div className="font-semibold text-slate-700">{selectedDetailUser.email}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</label>
                <div className="font-semibold text-slate-700">{selectedDetailUser.whatsapp}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">College / Hospital</label>
                <div className="font-semibold text-slate-700">{selectedDetailUser.college}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preparing For</label>
                <div className="font-bold text-blue-600">{selectedDetailUser.examPreparingFor}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date</label>
                <div className="font-semibold text-slate-700">
                  {selectedDetailUser.createdAt?.toMillis ? new Date(selectedDetailUser.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quiz Title</label>
                <div className="font-semibold text-slate-500 italic">{selectedDetailUser.quizTitle}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attempts</label>
                <div className="font-black text-slate-900">{selectedDetailUser.attemptsCount || 0}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => handleBan(selectedDetailUser.email, !!selectedDetailUser.isBanned)}
                className="flex-1 py-4 bg-orange-50 text-orange-600 font-bold rounded-2xl border border-orange-100 hover:bg-orange-100 transition-all text-sm uppercase tracking-widest"
              >
                {selectedDetailUser.isBanned ? 'Unban User' : 'Ban User'}
              </button>
              <button 
                onClick={() => handleDeleteUser(selectedDetailUser.quizId, selectedDetailUser.email)}
                className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-all text-sm uppercase tracking-widest"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && security && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl">
          <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-white rounded-lg text-sm">🛡</span>
            Global Security Settings
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <div className="font-bold text-slate-800">Max Violation Limit</div>
                <p className="text-xs text-slate-500">Number of warnings before terminating session.</p>
              </div>
              <input 
                type="number" 
                value={security.maxViolations} 
                onChange={e => setSecurity({...security, maxViolations: parseInt(e.target.value)})}
                className="w-20 p-2 border rounded-xl text-center font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Require Fullscreen", key: "fullscreenRequired" },
                { label: "Focus Mode (Tab Switching)", key: "focusModeEnabled" },
                { label: "Restrict Screenshots", key: "screenshotRestricted" },
                { label: "Disable Right-Click", key: "rightClickDisabled" },
                { label: "Restrict DevTools", key: "devToolsRestricted" },
              ].map(opt => (
                <label key={opt.key} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700 text-sm">{opt.label}</span>
                  <input 
                    type="checkbox" 
                    checked={(security as any)[opt.key]} 
                    onChange={e => setSecurity({...security, [opt.key]: e.target.checked})}
                    className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <button 
              onClick={async () => { await updateGlobalSecurity(security); alert("Security Settings Updated."); }}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all"
            >
              Update Global Security Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === 'brand' && (
        <BrandSettings />
      )}
    </div>
  );
};

export default AdminTabs;
