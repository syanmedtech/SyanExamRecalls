import React from 'react';
import { MCQ, ExamData } from '../types';

interface ExamPreviewProps {
  questions: MCQ[];
  onPublish: () => void;
  onCancel: () => void;
}

const ExamPreview: React.FC<ExamPreviewProps> = ({ questions, onPublish, onCancel }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Exam Preview</h2>
          <p className="text-slate-500 text-sm">Review the {questions.length} generated questions.</p>
        </div>
        <div className="space-x-3">
            <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Discard</button>
            <button onClick={onPublish} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm">
                Publish & Share
            </button>
        </div>
      </div>

      <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between mb-4">
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Q{idx + 1}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }`}>{q.difficulty}</span>
            </div>
            <p className="text-lg font-medium text-slate-800 mb-4">{q.question}</p>
            
            <div className="space-y-2 mb-6">
                {q.options.map((opt, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm flex items-center ${
                        i === q.correctAnswerIndex 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-white border-slate-100 text-slate-500'
                    }`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold ${
                             i === q.correctAnswerIndex ? 'bg-green-200' : 'bg-slate-200'
                        }`}>{String.fromCharCode(65 + i)}</span>
                        {opt}
                        {i === q.correctAnswerIndex && <span className="ml-auto text-xs font-bold">CORRECT</span>}
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                <p className="font-semibold text-slate-700 mb-1">Explanation:</p>
                <p className="text-slate-600 mb-2">{q.explanation}</p>
                <p className="text-xs text-slate-400 italic">Reference: {q.reference}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamPreview;
