import React, { useState, useEffect } from 'react';
import { ExamData, StudentAttempt } from '../types';

interface StudentExamProps {
  exam: ExamData;
  studentName: string;
  onSubmit: (attempt: StudentAttempt) => void;
}

const StudentExam: React.FC<StudentExamProps> = ({ exam, studentName, onSubmit }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelectOption = (qId: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optIndex }));
  };

  const calculateScore = () => {
    let score = 0;
    exam.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    const score = calculateScore();
    const attempt: StudentAttempt = {
      studentId: studentName.toLowerCase().replace(/\s+/g, '-'), // Simple ID gen
      studentName,
      examId: exam.id,
      answers,
      score,
      totalQuestions: exam.questions.length,
      completedAt: Date.now()
    };
    onSubmit(attempt);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = exam.questions[currentQIndex];
  const progressPercent = ((currentQIndex + 1) / exam.questions.length) * 100;
  const isLastQuestion = currentQIndex === exam.questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header with Timer */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-4 z-10">
        <div>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Exam: {exam.title || 'Untitled Exam'}</h1>
            <span className="text-xs text-slate-500">Student: {studentName}</span>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono font-bold text-xl ${
            timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
        }`}>
            <span>🕒</span>
            <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8">
        <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-8">
        <div className="p-8">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full mb-4">
                Question {currentQIndex + 1} of {exam.questions.length}
            </span>
            <h3 className="text-xl sm:text-2xl font-medium text-slate-900 leading-relaxed mb-8">
                {currentQ.question}
            </h3>

            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelectOption(currentQ.id, idx)}
                            className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center group ${
                                isSelected 
                                ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-md' 
                                : 'border-slate-100 hover:border-teal-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 text-sm font-bold transition-colors ${
                                isSelected ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 text-slate-400 group-hover:border-teal-300'
                            }`}>
                                {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-lg">{option}</span>
                        </button>
                    );
                })}
            </div>
        </div>
        
        {/* Footer Navigation */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
            <button
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                ← Previous
            </button>
            
            {isLastQuestion ? (
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Exam ✅'}
                </button>
            ) : (
                <button
                    onClick={() => setCurrentQIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-md transition-all"
                >
                    Next Question →
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudentExam;
