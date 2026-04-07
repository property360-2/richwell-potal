/**
 * Richwell Portal — Grading Window Settings Component
 * 
 * This component provides the UI for the Registrar to configure the start and 
 * end dates for midterm and finals grading windows for a given academic term.
 */

import React from 'react';
import { Settings2, AlertTriangle, FileCheck } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';

/**
 * GradingWindowSettings Component
 * 
 * @param {Object} activeTerm - The current active academic term.
 * @param {Object} gradingDates - Current date configurations for windows.
 * @param {Function} setGradingDates - Updater for date state.
 * @param {Function} handleUpdateDates - Submission handler for date updates.
 * @param {boolean} loading - Loading state for the save operation.
 */
const GradingWindowSettings = ({ 
  activeTerm, 
  gradingDates, 
  setGradingDates, 
  handleUpdateDates, 
  loading 
}) => {
  
  /**
   * Determines if a grading window is currently active based on dates.
   * 
   * @param {string} start - Start date string.
   * @param {string} end - End date string.
   * @returns {boolean} True if the current date is within the window.
   */
  const isWindowOpen = (start, end) => {
    if (!start || !end) return false;
    const now = new Date();
    return new Date(start) <= now && now <= new Date(end);
  };

  return (
    <Card className="lg:col-span-3 p-6 bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full pointer-events-none"></div>
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
          <Settings2 size={16} />
          Grading Window Management
        </h3>
        <div className="flex gap-2 relative z-20">
          <Button 
            variant="primary" 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700" 
            icon={<FileCheck size={16} />}
            onClick={handleUpdateDates}
            loading={loading}
          >
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Midterm Window */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-200">MIDTERM WINDOW</span>
            {gradingDates.midterm_grade_start && gradingDates.midterm_grade_end ? (
              isWindowOpen(gradingDates.midterm_grade_start, gradingDates.midterm_grade_end) ? (
                <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">OPEN</Badge>
              ) : (
                <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">CLOSED</Badge>
              )
            ) : (
              <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">NOT SET</Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Start Date</label>
              <Input 
                type="date"
                value={gradingDates.midterm_grade_start}
                onChange={(e) => setGradingDates(prev => ({ ...prev, midterm_grade_start: e.target.value }))}
                className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">End Date</label>
              <Input 
                type="date"
                value={gradingDates.midterm_grade_end}
                onChange={(e) => setGradingDates(prev => ({ ...prev, midterm_grade_end: e.target.value }))}
                className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
              />
            </div>
          </div>
        </div>

        {/* Finals Window */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-200">FINALS WINDOW</span>
            {gradingDates.final_grade_start && gradingDates.final_grade_end ? (
              isWindowOpen(gradingDates.final_grade_start, gradingDates.final_grade_end) ? (
                <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">OPEN</Badge>
              ) : (
                <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">CLOSED</Badge>
              )
            ) : (
              <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">NOT SET</Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Start Date</label>
              <Input 
                type="date"
                value={gradingDates.final_grade_start}
                onChange={(e) => setGradingDates(prev => ({ ...prev, final_grade_start: e.target.value }))}
                className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">End Date</label>
              <Input 
                type="date"
                value={gradingDates.final_grade_end}
                onChange={(e) => setGradingDates(prev => ({ ...prev, final_grade_end: e.target.value }))}
                className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-slate-500">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <AlertTriangle size={14} className="text-amber-500" />
          Term: {activeTerm?.code}
        </div>
      </div>
    </Card>
  );
};

export default GradingWindowSettings;
