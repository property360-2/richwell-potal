/**
 * Richwell Portal — Schedule Status Screens
 * 
 * Provides full-page feedback screens for specific states:
 * - Approval Required: When a student hasn't had their advising approved.
 * - Schedule Locked: When a student has already finalized their schedule.
 * 
 * @param {Object} props
 * @param {string} props.status - The current state ('REQUIRED' or 'LOCKED').
 * @param {Function} props.onNavigate - Navigation callback.
 */

import React from 'react';
import { ShieldCheck, CheckSquare } from 'lucide-react';
import Button from '../../../../components/ui/Button';

const ScheduleStatusScreens = ({ status, onNavigate }) => {
  if (status === 'REQUIRED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Advising Approval Required</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Your subject advising list must be approved by the registrar before you can proceed to section selection.
          </p>
          <Button variant="primary" size="lg" onClick={() => onNavigate('/student/advising')}>
            Go to Advising
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'LOCKED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckSquare size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Schedule Already Finalized</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            You have already successfully picked your schedule for this term. You can now view your active timetable.
          </p>
          <Button variant="primary" size="lg" onClick={() => onNavigate('/student/schedule')}>
            View My Timetable
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default ScheduleStatusScreens;
