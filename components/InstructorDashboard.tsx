
import React, { useState, useEffect } from 'react';
// Fix: Import getAllQuizzes instead of non-existent getInstructorHistory
import { getAllQuizzes, getLeaderboard, republishExam } from '../services/firebaseService';
import { ExamData, StudentAttempt } from '../types';
import { Timestamp } from 'firebase/firestore';

const InstructorDashboard: React.FC = () => {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
  const [leaderboard, setLeaderboard] = useState<StudentAttempt[]>([]);
  const [republishMinutes, setRepublishMinutes] = useState(60);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    // Fix: Using the correct function name getAllQuizzes
    const data = await getAllQuizzes();
    setExams(data);
    setLoading(false);
  };

  const handleSelectExam = async (exam: ExamData) => {
    setSelectedExam(exam);
    const attempts = await getLeaderboard(exam.id);
    setLeaderboard(attempts);
  };

  const handleRepublish = async () => {
    if (!selectedExam) return;
    try {
        await republishExam(selectedExam.id, republishMinutes);
        alert("Exam republished successfully!");
        setSelectedExam(prev => prev ? { ...prev, status: 'active' } : null);
        loadHistory(); // Refresh list
    } catch (e) {
        alert("Failed to republish");
    }
  };

  const getStatusColor = (status: string, expiresAt: any) => {
      if (status === 'expired') return 'bg-red-100 text-red-700';
      if (expiresAt && expiresAt.toMillis() < Date.now()) return 'bg-red-100 text-red-700';
      return 'bg-green-100 text-green-700';
  };

  const formatTime = (ts: any) => {
      if (!ts) return '-';
      return new Date(ts.toMillis()).toLocaleString();
  };

  if (loading && !exams.length) return <div className="text-center p-12">Loading History...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Instructor Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Exam List */}
        <div className="bg-white rounded-xl shadow border border-slate-100 p-6 lg:col-span-1 h-fit">
            <h3 className="text-xl font-bold mb-4">Exam History</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {exams.map(exam => (
                    <div 
                        key={exam.id}
                        onClick={() => handleSelectExam(exam)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedExam?.id === exam.id ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-slate-800 text-sm">{exam.name || exam.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(exam.status, exam.expiresAt)}`}>
                                {exam.status}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500">
                            Created: {new Date(exam.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Details & Leaderboard */}
        <div className="bg-white rounded-xl shadow border border-slate-100 p-6 lg:col-span-2">
            {!selectedExam ? (
                <div className="text-center text-slate-400 py-20">Select an exam to view details</div>
            ) : (
                <>
                    <div className="flex justify-between items-start mb-6 border-b pb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedExam.name || selectedExam.title}</h2>
                            <p className="text-sm text-slate-500">Published: {formatTime(selectedExam.publishedAt)}</p>
                            <p className="text-sm text-slate-500">Expires: {formatTime(selectedExam.expiresAt)}</p>
                            <a href={`#examId=${selectedExam.id}`} className="text-teal-600 hover:underline text-sm font-medium mt-2 block">
                                🔗 Open Exam Link
                            </a>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                            <h4 className="font-bold text-slate-700 mb-2">Republish Exam</h4>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={republishMinutes}
                                    onChange={(e) => setRepublishMinutes(parseInt(e.target.value))}
                                    className="w-20 p-2 border rounded"
                                    min="1"
                                />
                                <button 
                                    onClick={handleRepublish}
                                    className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900"
                                >
                                    Republish
                                </button>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-4">Student Leaderboard ({leaderboard.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="p-3">Rank</th>
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Percentage</th>
                                    <th className="p-3">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard.map((attempt, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                                        <td className="p-3 font-medium text-slate-800">{attempt.studentName}</td>
                                        <td className="p-3 text-slate-600">{attempt.score} / {attempt.totalQuestions}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded font-bold text-xs ${
                                                attempt.percentage >= 70 ? 'bg-green-100 text-green-700' :
                                                attempt.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {attempt.percentage}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-400">
                                            {/* Handle both timestamp types safely */}
                                            {attempt.submittedAt && attempt.submittedAt.toMillis 
                                                ? new Date(attempt.submittedAt.toMillis()).toLocaleString() 
                                                : 'Just now'}
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">No attempts yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
