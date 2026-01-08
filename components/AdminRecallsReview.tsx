
import React, { useState, useEffect } from 'react';
import { getRecallSubmissions, deleteRecallSubmission } from '../services/firebaseService';
import { RecallSubmission } from '../types';

const EXAM_RECALL_OPTIONS = [
  "FCPS Medicine", "FCPS Surgery", "FCPS Pediatrics", "FCPS Ortho", "FCPS Eye", "FCPS Gyne",
  "JCAT Medicine", "JCAT Surgery", "MBBS Medicine", "MBBS Surgery", "MBBS Gyne", "MBBS OBS", "MBBS Pediatrics"
];

const AdminRecallsReview: React.FC = () => {
  const [submissions, setSubmissions] = useState<RecallSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExam, setFilterExam] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<RecallSubmission | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [filterExam, filterTime]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getRecallSubmissions(filterExam, filterTime);
      setSubmissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this submission?")) return;
    await deleteRecallSubmission(id);
    loadSubmissions();
    if (selectedSubmission?.id === id) setSelectedSubmission(null);
  };

  const exportCSV = () => {
    const headers = ["Submission ID", "Name", "Exam Name", "Time Slot", "Points Count", "Points", "Created At"];
    const rows = submissions.map(s => [
      s.id,
      s.name,
      s.examName,
      s.timeSlot,
      s.pointsCount,
      s.points.join(" | "),
      s.createdAt?.toMillis ? new Date(s.createdAt.toMillis()).toISOString() : 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `recalls_export_${filterExam}_${filterTime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Recall Submissions</h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Exam:</label>
            <select 
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Exams</option>
              {EXAM_RECALL_OPTIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time:</label>
            <select 
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Times</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </div>
          {submissions.length > 0 && (
            <button onClick={exportCSV} className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-green-700 transition-colors">Export CSV</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-300 font-bold uppercase tracking-widest">Querying Submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="py-20 text-center text-slate-400 italic">No submissions found for current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4">Sr.</th>
                <th className="p-4">Name</th>
                <th className="p-4">Exam / Slot</th>
                <th className="p-4">Points</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-400 font-bold">#{i+1}</td>
                  <td className="p-4 font-bold text-slate-800">{s.name}</td>
                  <td className="p-4">
                    <div className="text-blue-600 font-bold text-xs">{s.examName}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{s.timeSlot}</div>
                  </td>
                  <td className="p-4">
                     <span className="bg-slate-100 px-2 py-0.5 rounded font-black text-[10px] text-slate-500">{s.pointsCount} Points</span>
                  </td>
                  <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">
                    {s.createdAt?.toMillis ? new Date(s.createdAt.toMillis()).toLocaleString() : 'N/A'}
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => setSelectedSubmission(s)} className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase tracking-widest">View</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-widest">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative animate-scale-up max-h-[90vh] flex flex-col">
            <button onClick={() => setSelectedSubmission(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">✕</button>
            
            <div className="mb-8 shrink-0">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedSubmission.name}</h3>
               <div className="flex gap-3 mt-2">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">{selectedSubmission.examName}</span>
                  <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">{selectedSubmission.timeSlot}</span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
               {selectedSubmission.points.map((p, idx) => (
                 <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">{idx+1}</span>
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Recall Point</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{p}</p>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center shrink-0">
               <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                 Submitted: {selectedSubmission.createdAt?.toMillis ? new Date(selectedSubmission.createdAt.toMillis()).toLocaleString() : 'N/A'}
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setSelectedSubmission(null)} className="px-6 py-2 text-slate-400 font-bold text-xs uppercase">Close</button>
                 <button onClick={() => handleDelete(selectedSubmission.id)} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-100 uppercase tracking-widest">Delete Submission</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRecallsReview;
