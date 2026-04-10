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
import { ShieldCheck, CheckSquare, ArrowRight } from 'lucide-react';
import Button from '../../../../components/ui/Button';

const ScheduleStatusScreens = ({ status, onNavigate }) => {
  const isRequired = status === 'REQUIRED';
  
  return (
    <div className="sp-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card animate-slide-up" style={{ maxWidth: '500px', width: '100%', padding: '4rem 2rem', textAlign: 'center', borderRadius: '3rem' }}>
        <div 
          className="sp-icon-box active mx-auto" 
          style={{ 
            width: '80px', 
            height: '80px', 
            marginBottom: '2rem',
            background: isRequired ? 'var(--color-amber-500)' : 'var(--color-green-500)',
            boxShadow: isRequired ? '0 0 30px rgba(245, 158, 11, 0.3)' : '0 0 30px rgba(34, 197, 94, 0.3)'
          }}
        >
          {isRequired ? (
            <ShieldCheck size={40} className="text-white" />
          ) : (
            <CheckSquare size={40} className="text-white" />
          )}
        </div>

        <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-3">
          {isRequired ? 'Advising Required' : 'Schedule Locked'}
        </h2>
        
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
          {isRequired 
            ? 'Your subject advising list must be approved by the registrar before you can proceed to section selection.' 
            : 'You have already successfully picked your schedule for this term. Your registration is now finalized.'}
        </p>

        <div className="flex flex-col gap-3">
          <Button 
            className="sp-btn-premium w-full" 
            onClick={() => onNavigate(isRequired ? '/student/advising' : '/student/schedule')}
          >
            {isRequired ? 'Return to Advising' : 'View My Timetable'}
            <ArrowRight size={16} className="ml-2" />
          </Button>
          
          <Button 
            variant="ghost" 
            className="text-2xs font-black uppercase tracking-widest text-slate-400"
            onClick={() => onNavigate('/student/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleStatusScreens;
