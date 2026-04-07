/**
 * GradeFinalization.jsx
 * 
 * Main dashboard for the Registrar to manage the grading lifecycle.
 * This component orchestrates metrics, grading window settings, and the
 * finalization queue through modular sub-components.
 */

import React, { useState, useEffect } from 'react';
import { Settings2, Layers, AlertTriangle } from 'lucide-react';
import { termsApi } from '../../api/terms';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import GradingWindowSettings from './components/GradingWindowSettings';
import GradeFinalizationModule from './components/GradeFinalizationModule';
import './GradeFinalization.css';

/**
 * GradeFinalization Dashboard Component
 * 
 * Entry point for grade management, complying with Rule 7 line limits.
 */
const GradeFinalization = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [gradingDates, setGradingDates] = useState({
    midterm_grade_start: '',
    midterm_grade_end: '',
    final_grade_start: '',
    final_grade_end: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  /**
   * Loads the current active academic term and sets initial grading dates.
   */
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const termRes = await termsApi.getActiveTerm();
      const term = termRes.data?.results?.[0] || termRes.data?.[0];
      
      if (term) {
        setActiveTerm(term);
        setGradingDates({
          midterm_grade_start: term.midterm_grade_start || '',
          midterm_grade_end: term.midterm_grade_end || '',
          final_grade_start: term.final_grade_start || '',
          final_grade_end: term.final_grade_end || ''
        });
      }
    } catch (error) {
      addToast('error', 'Failed to load term data.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates the grading window dates in the backend.
   */
  const handleUpdateDates = async () => {
    if (!activeTerm) return;
    try {
      setLoading(true);
      await termsApi.updateTerm(activeTerm.id, gradingDates);
      addToast('success', 'Grading window dates updated successfully.');
    } catch (e) {
      addToast('error', 'Failed to update dates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 animate-in fade-in duration-500 space-y-6">
      <PageHeader 
        title="Grade Management Console"
        description="Monitor submitted grades and manage grading window schedules."
        badge={<Settings2 className="text-primary" size={32} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GradingWindowSettings 
          activeTerm={activeTerm}
          gradingDates={gradingDates}
          setGradingDates={setGradingDates}
          handleUpdateDates={handleUpdateDates}
          loading={loading}
        />

        <Card className="p-6 bg-blue-600 text-white border-none shadow-xl flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div>
            <Layers className="text-blue-100 mb-4" size={32} />
            <h3 className="font-bold text-sm tracking-wider uppercase text-blue-100 italic">Roster Awareness</h3>
            <p className="text-[10px] text-blue-100 mt-2 leading-tight">
              Review and finalize section rosters once instructors complete grading.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-500/50 flex items-center gap-2">
            <AlertTriangle size={14} className="text-blue-200" />
            <div className="text-[10px] font-bold uppercase text-blue-200">Audit Mode Active</div>
          </div>
        </Card>
      </div>

      <GradeFinalizationModule activeTerm={activeTerm} />
    </div>
  );
};

export default GradeFinalization;
