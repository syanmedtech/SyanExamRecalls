import React, { useState } from 'react';
import { ExamType, MCQType } from '../types';

interface ConfigModuleProps {
  onGenerate: (examTypes: ExamType[], mcqType: MCQType) => void;
  isGenerating: boolean;
}

const EXAM_OPTIONS: ExamType[] = ['USMLE', 'FCPS', 'MRCP', 'PLAB', 'HAAD', 'AMC', 'MBBS', 'SMLE'];
const MCQ_OPTIONS: MCQType[] = ['Simple', 'Clinical', 'Case-based', 'Mixed'];

const ConfigModule: React.FC<ConfigModuleProps> = ({ onGenerate, isGenerating }) => {
  const [selectedExams, setSelectedExams] = useState<ExamType[]>([]);
  const [selectedMCQType, setSelectedMCQType] = useState<MCQType>('Mixed');

  const toggleExam = (exam: ExamType) => {
    setSelectedExams(prev => 
      prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
    );
  };

  const handleGenerate = () => {
    if (selectedExams.length === 0) {
      alert("Please select at least one exam standard.");
      return;
    }
    onGenerate(selectedExams, selectedMCQType);
  };

  if (isGenerating) {
    return (
      <div className="max-w-xl mx-auto text-center p-12 bg-white rounded-xl shadow-lg animate-pulse">
        <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Generating Exam...</h3>
        <p className="text-slate-500">AI is analyzing the content, extracting high-yield concepts, and drafting clinical scenarios.</p>
        <div className="mt-6 flex justify-center gap-2">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100"></span>
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-slate-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Configure Exam Parameters</h2>
        
        {/* Exam Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Target Exam Standards (Multi-select)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXAM_OPTIONS.map((exam) => (
              <button
                key={exam}
                onClick={() => toggleExam(exam)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  selectedExams.includes(exam)
                    ? 'bg-teal-50 border-teal-500 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                }`}
              >
                {selectedExams.includes(exam) && <span className="mr-1">✓</span>}
                {exam}
              </button>
            ))}
          </div>
        </div>

        {/* MCQ Type Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Question Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MCQ_OPTIONS.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedMCQType(type)}
                className={`py-3 px-4 rounded-lg text-sm font-medium border text-left flex items-center justify-between transition-colors ${
                  selectedMCQType === type
                    ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                }`}
              >
                {type}
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedMCQType === type ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                }`}>
                    {selectedMCQType === type && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 active:translate-y-0 text-lg"
      >
        ⚡ Generate AI Exam
      </button>
    </div>
  );
};

export default ConfigModule;
