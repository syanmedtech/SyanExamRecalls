
import React, { useState } from 'react';

interface PublishModalProps {
  defaultName: string;
  onConfirm: (name: string, minutes: number) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const PublishModal: React.FC<PublishModalProps> = ({ defaultName, onConfirm, onCancel, isSaving }) => {
  const [name, setName] = useState(defaultName);
  const [minutes, setMinutes] = useState(60);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Publish Exam</h2>
        <p className="text-slate-600 mb-6 text-sm">Set the final details before sharing with students.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Exam Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="e.g. Cardiology Mock Test 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
                Link Expiry (Minutes)
                <span className="block text-xs font-normal text-slate-400">Exam link becomes invalid after this time.</span>
            </label>
            <input 
              type="number"
              min="1"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(name, minutes)}
            disabled={isSaving || !name.trim() || minutes < 1}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Publishing..." : "Confirm Publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
