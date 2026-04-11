/**
 * Richwell Portal — Student Schedule Picking Page
 * 
 * Main controller for student section selection.
 * Orchestrates regular (session block) and irregular (custom builder) 
 * schedule picking strategies based on student study type.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Info } from 'lucide-react';
import api from '../../api/axios';
import { schedulingApi } from '../../api/scheduling';
import useCountdown from '../../hooks/useCountdown';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/ui/Badge';

// Sub-components
import ScheduleStatusScreens from './components/picking/ScheduleStatusScreens';
import RegularSessionPicker from './components/picking/RegularSessionPicker';
import IrregularScheduleBuilder from './components/picking/IrregularScheduleBuilder';
import './SchedulePicking.css';

const SchedulePicking = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [approvedGrades, setApprovedGrades] = useState([]);
  const [sectionsMatrix, setSectionsMatrix] = useState([]);
  const [selectedSession, setSelectedSession] = useState('AM');
  const [subjectSections, setSubjectSections] = useState({});
  const [selectedSections, setSelectedSections] = useState({});
  const { timeLeft, formattedTime } = useCountdown(activeTerm?.picking_deadline);

  useEffect(() => { 
    fetchData(); 
  }, []);



  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: terms } = await api.get('terms/?is_active=true');
      const term = terms.results?.[0] || terms[0];
      setActiveTerm(term);
      if (!term) return;

      const { data: enrollData } = await api.get(`students/enrollments/me/?term=${term.id}`);
      setEnrollment(enrollData);
      const { data: gradesRes } = await api.get(`grades/advising/?term=${term.id}&advising_status=APPROVED`);
      setApprovedGrades(gradesRes.results || []);

      if (enrollData) {
        if (enrollData.is_regular) {
          const { data: matrix } = await schedulingApi.getStatusMatrix({ term_id: term.id, program_id: enrollData.student_details?.program, year_level: enrollData.year_level });
          setSectionsMatrix(matrix || []);
        } else {
          const sectionRes = await Promise.all(gradesRes.results.map(g => api.get(`sections/?term_id=${term.id}&subject_id=${g.subject}`)));
          const sectionsMap = {};
          gradesRes.results.forEach((g, i) => sectionsMap[g.subject] = sectionRes[i].data.results || sectionRes[i].data);
          setSubjectSections(sectionsMap);
        }
      }
    } catch (err) { showToast('error', 'Critical error loading schedule engine'); } finally { setLoading(false); }
  };

  const handlePickRegular = async () => {
    if (!window.confirm("Confirm session picking?")) return;
    try {
      setIsProcessing(true);
      const res = await schedulingApi.pickRegular({ term_id: activeTerm.id, session: selectedSession });
      showToast('success', res.data.message);
      fetchData();
    } catch (err) { showToast('error', err.response?.data?.message || 'Pick failed'); } finally { setIsProcessing(false); }
  };

  const handlePickIrregular = async () => {
    const selections = Object.entries(selectedSections).map(([sid, idx]) => ({ subject_id: parseInt(sid), section_id: parseInt(idx) }));
    try {
      setIsProcessing(true);
      await schedulingApi.pickIrregular({ term_id: activeTerm.id, selections });
      showToast('success', 'Schedule picked successfully');
      fetchData();
    } catch (err) { showToast('error', err.response?.data?.message || 'Pick failed'); } finally { setIsProcessing(false); }
  };

  if (loading && !enrollment) return <div className="p-24"><LoadingSpinner size="lg" /></div>;
  if (!enrollment || enrollment.advising_status !== 'APPROVED') return <ScheduleStatusScreens status="REQUIRED" onNavigate={navigate} />;
  if (enrollment.is_schedule_picked) return <ScheduleStatusScreens status="LOCKED" onNavigate={navigate} />;

  const isRegular = enrollment.is_regular;

  return (
    <div className="picking-page-root pb-32 animate-fade-in">
      <PageHeader 
        title="Schedule Selection" 
        description={`Configure your timetable for Academic Year ${activeTerm?.code}`}
        actions={
          <div className="flex gap-3">
             <Badge variant="neutral" className="bg-slate-900 text-white font-black px-4 py-1.5 radius-full border-0">
               {activeTerm?.code}
             </Badge>
             <Badge variant="ghost" className="bg-indigo-50 text-indigo-600 font-black px-4 py-1.5 radius-full border-indigo-100">
               {isRegular ? 'REGULAR' : 'IRREGULAR'}
             </Badge>
          </div>
        }
      />

      <div className="sp-container mt-8">
        {/* Dynamic Countdown Banner */}
        {activeTerm?.picking_deadline && (
          <div className={`countdown-banner animate-slide-up mb-8 ${timeLeft <= 0 ? 'expired' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="timer-icon">
                <Clock size={24} className={timeLeft <= 0 ? 'text-rose-500' : 'text-indigo-500'} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                   <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">
                     {timeLeft <= 0 ? 'Picking Window Closed' : 'Limited Picking Window'}
                   </h4>
                   {timeLeft > 0 && (
                     <div className="flex items-center gap-2 text-rose-500">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Live Countdown</span>
                     </div>
                   )}
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl font-black italic tracking-tighter uppercase ${timeLeft <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                    {timeLeft <= 0 ? "Picking Period Expired" : formattedTime}
                  </span>
                  {timeLeft > 0 && (
                    <span className="text-xs font-bold text-slate-400 mb-1">REMAINING</span>
                  )}
                </div>
              </div>
            </div>
            {timeLeft <= 0 && (
              <p className="mt-4 text-xs font-medium text-slate-500 border-t border-slate-100 pt-4">
                Manual selection is no longer available. Our system will automatically assign you to a section 
                to ensure you are ready for the term. Please check back later.
              </p>
            )}
          </div>
        )}

        {/* Progress Flow Stepper */}
        <div className="status-stepper animate-slide-up mb-12">
           <div className="status-step">
              <div className="status-dot active"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Advising</span>
           </div>
           <div className="w-12 h-0.5 bg-indigo-100 rounded-full mx-4"></div>
           <div className="status-step active transition-all duration-500 transform scale-105">
              <div className="status-dot active"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Selection</span>
           </div>
           <div className="w-12 h-0.5 bg-slate-100 rounded-full mx-4"></div>
           <div className="status-step opacity-40">
              <div className="status-dot"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Locking</span>
           </div>
        </div>

        {timeLeft > 0 ? (
          isRegular ? (
            <RegularSessionPicker 
              selectedSession={selectedSession} 
              sectionsMatrix={sectionsMatrix} 
              isProcessing={isProcessing} 
              onSelectSession={setSelectedSession} 
              onConfirm={handlePickRegular} 
            />
          ) : (
            <IrregularScheduleBuilder 
              approvedGrades={approvedGrades} 
              subjectSections={subjectSections} 
              selectedSections={selectedSections} 
              isProcessing={isProcessing} 
              onSelectSection={(sid, idx) => setSelectedSections({ ...selectedSections, [sid]: idx })} 
              onConfirm={handlePickIrregular} 
            />
          )
        ) : timeLeft === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 px-6 glass-card border-slate-100 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                <ShieldCheck size={32} className="text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 italic uppercase">Manual Selection Locked</h3>
              <p className="text-slate-500 max-w-sm mt-3 font-medium leading-relaxed">
                The picking window for this term has officially closed. 
                Your classes will be handled by our automated priority assignment engine.
              </p>
           </div>
        ) : null}

        <div className="mt-16 instruction-banner glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
           <div className="sp-icon-box active shadow-lg shadow-indigo-100 mb-0" style={{ width: 56, height: 56, flexShrink: 0 }}>
              <Info size={24} className="text-white" />
           </div>
           <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900 italic tracking-tighter uppercase leading-none mb-1">Registration Shield</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                Enrollment spots are finalized in real-time. If your preferred section is full before confirming, the system will prompt an error.
                For regular students, specific sections are assigned automatically based on curriculum slots to ensure balanced class sizes.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePicking;
