
import React, { useState, useEffect } from 'react';
import { generateGeminiStyleQuiz } from '../services/geminiService';
import { ExamConfig, MCQ } from '../types';
import PublishOptionsModal from './PublishOptionsModal';

interface AdminCreateQuizProps {
  onPublished: (shareId: string | null) => void;
  initialConfig?: Partial<ExamConfig>;
}

const TEMPLATES = [
  { name: "USMLE Style", prompt: "Generate complex clinical vignettes for USMLE Step 1. Focus on mechanism of action and pathophysiology." },
  { name: "FCPS Style", prompt: "Create detailed case-based questions suitable for FCPS Part 1 specialization exams." },
  { name: "Short Explanations", prompt: "Keep explanations concise and focused only on the key diagnostic differentiator." },
  { name: "Add Hints", prompt: "Always include a subtle hint for every question that points towards the diagnostic criteria without revealing the answer." }
];

const AdminCreateQuiz: React.FC<AdminCreateQuizProps> = ({ onPublished, initialConfig }) => {
  const [sourceType, setSourceType] = useState<'text' | 'pdf'>(initialConfig?.sourceFile ? 'pdf' : 'text');
  const [textInput, setTextInput] = useState(initialConfig?.sourceText || '');
  const [file, setFile] = useState<File | null>(initialConfig?.sourceFile || null);
  const [adminPrompt, setAdminPrompt] = useState(TEMPLATES[0].prompt);
  const [status, setStatus] = useState<'idle' | 'generating' | 'previewing' | 'publishing_options'>('idle');
  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig?.sourceFile) {
      setSourceType('pdf');
      setFile(initialConfig.sourceFile);
    } else if (initialConfig?.sourceText) {
      setSourceType('text');
      setTextInput(initialConfig.sourceText);
    }
  }, [initialConfig]);

  const handleGenerate = async () => {
    if (sourceType === 'text' && !textInput.trim()) return alert("Enter content first.");
    if (sourceType === 'pdf' && !file) return alert("Select PDF first.");

    setStatus('generating');
    setErrorMessage(null);
    try {
      const config: ExamConfig = {
        sourceText: sourceType === 'text' ? textInput : undefined,
        sourceFile: file || undefined,
        sourceMimeType: file?.type || 'application/pdf',
        selectedExamTypes: [],
        selectedMCQType: 'Mixed',
        adminPrompt
      };
      const quiz = await generateGeminiStyleQuiz(config);
      setPreviewQuiz(quiz);
      setStatus('previewing');
    } catch (err: any) {
      console.error("Generation failed:", err);
      let msg = "Generation failed. Please try again.";
      if (err?.message?.includes("503") || err?.message?.includes("overloaded")) {
        msg = "The model is currently overloaded. We've tried retrying, but the server is still busy. Please wait a minute and try again.";
      }
      setErrorMessage(msg);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Create Quiz</h1>
          <p className="text-slate-500">Generate high-yield clinical MCQs using Gemini Pro.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { setPreviewQuiz(null); setStatus('idle'); setErrorMessage(null); }} 
            className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
          {status === 'previewing' ? (
             <button onClick={() => setStatus('publishing_options')} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700">
               Publish Options
             </button>
          ) : (
             <button 
               onClick={handleGenerate} 
               disabled={status === 'generating'} 
               className="px-8 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-50 flex items-center gap-2"
             >
               {status === 'generating' ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   AI Thinking...
                 </>
               ) : 'Generate Quiz'}
             </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 animate-shake">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Box 1: Data Input */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">1. Data Input</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setSourceType('pdf')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${sourceType === 'pdf' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>PDF Upload</button>
              <button onClick={() => setSourceType('text')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${sourceType === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Paste Text</button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            {sourceType === 'pdf' ? (
              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center hover:border-blue-400 transition-colors group">
                <input type="file" accept=".pdf" className="hidden" id="pdf-up" onChange={e => setFile(e.target.files?.[0] || null)} />
                <label htmlFor="pdf-up" className="cursor-pointer">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">📂</div>
                  <div className="font-bold text-slate-700 mb-1">{file ? file.name : "Choose a Medical PDF"}</div>
                  <p className="text-sm text-slate-400">{file ? `${(file.size/1024/1024).toFixed(2)} MB` : "Books, guidelines, or research papers"}</p>
                </label>
              </div>
            ) : (
              <textarea 
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Paste your clinical content here..."
                className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-200 resize-none focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            )}
          </div>
        </div>

        {/* Box 2: Prompt Box */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col h-[600px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6">2. Admin Instructions</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => setAdminPrompt(t.prompt)} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-lg border border-blue-100 hover:bg-blue-100">{t.name}</button>
            ))}
          </div>
          <textarea 
            value={adminPrompt}
            onChange={e => setAdminPrompt(e.target.value)}
            className="flex-1 p-6 bg-slate-900 text-blue-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
            placeholder="Tell Gemini how to behave..."
          />
        </div>
      </div>

      {status === 'generating' && (
        <div className="mt-12 bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center animate-pulse">
           <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
           <h3 className="text-2xl font-bold text-slate-800 mb-2">Generating High-Yield MCQs...</h3>
           <p className="text-slate-500 max-w-md mx-auto">Gemini is analyzing the source content and drafting clinical scenarios. This may take a moment if the server is under load.</p>
        </div>
      )}

      {previewQuiz && (
        <div className="mt-12 bg-slate-900 rounded-3xl p-10 text-white shadow-2xl animate-slide-up">
           <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
             <span className="p-2 bg-blue-500 rounded-lg">👁</span>
             Previewing: {previewQuiz.title}
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewQuiz.questions.slice(0, 6).map((q: MCQ, i: number) => (
                <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10">
                   <div className="text-[10px] font-bold text-blue-400 mb-2">QUESTION {i+1}</div>
                   <p className="text-sm line-clamp-3 opacity-80 mb-4">{q.stem || q.question}</p>
                   <div className="flex gap-2">
                     <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white">{q.difficulty}</span>
                     <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Correct: {q.correctOptionId}</span>
                   </div>
                </div>
              ))}
           </div>
           {previewQuiz.questions.length > 6 && (
             <p className="mt-8 text-center text-white/50 text-sm">... and {previewQuiz.questions.length - 6} more questions generated.</p>
           )}
        </div>
      )}

      {status === 'publishing_options' && previewQuiz && (
        <PublishOptionsModal 
          questions={previewQuiz.questions}
          onSuccess={(sId) => onPublished(sId)}
          onCancel={() => setStatus('previewing')}
        />
      )}
    </div>
  );
};

export default AdminCreateQuiz;
