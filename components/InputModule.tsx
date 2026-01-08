
import React, { useState } from 'react';
import { fileToBase64 } from '../services/geminiService';

interface InputModuleProps {
  onDataReady: (text: string | undefined, file: File | undefined, mimeType: string | undefined) => void;
}

const MAX_FILE_SIZE_MB = 200;

const InputModule: React.FC<InputModuleProps> = ({ onDataReady }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('pdf');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            alert(`File is too large. Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`);
            e.target.value = ''; // Reset input
            setFile(null);
            return;
        }
        setFile(selectedFile);
    } else {
        setFile(null);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (activeTab === 'text') {
        if (!textInput.trim()) {
          alert("Please enter some text.");
          return;
        }
        // Basic safety check for massive text paste (approx 500k chars)
        if (textInput.length > 500000) { 
             alert("Text is too long. Please reduce the amount of text or upload as a file.");
             return;
        }
        onDataReady(textInput, undefined, undefined);
      } else {
        if (!file) {
          alert("Please upload a file.");
          return;
        }
        // For PDFs, we pass the raw file to allow chunking in the service. 
        // We only convert to base64 here if it's an image, or let the service handle it.
        // For simplicity, we pass the File object.
        onDataReady(undefined, file, file.type);
      }
    } catch (e) {
      console.error(e);
      alert("Error processing input");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-slate-100">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Upload Medical Content</h2>
        <p className="text-slate-500">Upload guidelines, notes, or books to generate high-yield MCQs.</p>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'pdf' 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📂 Upload PDF/Image
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'text' 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📝 Paste Text
        </button>
      </div>

      <div className="min-h-[200px] mb-6">
        {activeTab === 'pdf' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-500 transition-colors bg-slate-50">
            <input 
              type="file" 
              accept="application/pdf, image/png, image/jpeg" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-teal-50 file:text-teal-700
                hover:file:bg-teal-100
                cursor-pointer"
            />
            <p className="mt-4 text-xs text-slate-400">Supported: PDF, JPEG, PNG (Max {MAX_FILE_SIZE_MB}MB)</p>
            {file && <p className="mt-2 text-sm font-semibold text-teal-600">Selected: {file.name}</p>}
          </div>
        ) : (
          <textarea
            className="w-full h-48 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            placeholder="Paste your clinical notes, guideline text, or book chapters here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          ></textarea>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={loading}
        className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Analyze & Continue →"}
      </button>
    </div>
  );
};

export default InputModule;
