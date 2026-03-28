/**
 * Richwell Portal — Regular Session Picker
 * 
 * Provides session block selection (AM/PM) for regular students.
 * Includes visual feedback and capacity indicators.
 * 
 * @param {Object} props
 * @param {string} props.selectedSession - The currently selected session ('AM' or 'PM').
 * @param {Array} props.sectionsMatrix - List of session availabilities.
 * @param {boolean} props.isProcessing - Loading state for action buttons.
 * @param {Function} props.onSelectSession - Session change callback.
 * @param {Function} props.onConfirm - Action to finalize selection.
 */

import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

const RegularSessionPicker = ({ selectedSession, sectionsMatrix, isProcessing, onSelectSession, onConfirm }) => {
  const sessions = [
    { id: 'AM', label: 'Morning', time: '07:00 AM - 12:00 PM' },
    { id: 'PM', label: 'Afternoon', time: '01:00 PM - 06:00 PM' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-800">Assign Preferred Session</h3>
        <p className="text-slate-500">Pick a session block to automatically join sections with matching hours.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map(session => {
          const isSelected = selectedSession === session.id;
          const availableCount = sectionsMatrix.filter(s => s.session === session.id && !s.is_full).length;
          const isFull = availableCount === 0;

          return (
            <div 
              key={session.id}
              onClick={() => !isFull && onSelectSession(session.id)}
              className={`relative overflow-hidden cursor-pointer group rounded-xl border-2 p-6 transition-all duration-300
                ${isSelected ? 'bg-indigo-50 border-indigo-500 scale-[1.02]' : isFull ? 'opacity-60 bg-slate-50 border-slate-200 grayscale cursor-not-allowed' : 'bg-white border-slate-100 hover:border-slate-300'}
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-4 rounded-full ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <Clock size={28} />
                </div>
                <div className="text-lg font-bold text-slate-800">{session.label}</div>
                <div className="text-sm font-medium text-slate-500">{session.time}</div>
                {isFull && (
                   <div className="mt-4"><Badge variant="error" size="sm">SESSION FULL</Badge></div>
                )}
              </div>
              {isSelected && <div className="absolute top-4 right-4 text-indigo-500"><CheckSquare size={20} /></div>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 rounded-xl gap-4">
        <div className="text-sm font-semibold text-slate-600 flex items-center gap-2">
           <CheckSquare size={18} className="text-green-500" />
           Currently Selected: <span className="text-indigo-600 uppercase">{selectedSession === 'AM' ? 'Morning' : 'Afternoon'} Block</span>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          loading={isProcessing}
          onClick={onConfirm}
        >
          Confirm & Lock Schedule
        </Button>
      </div>
    </div>
  );
};

export default RegularSessionPicker;
