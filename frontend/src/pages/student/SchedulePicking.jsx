/**
 * Richwell Portal — Student Schedule Picking Page
 * 
 * Main controller for student section selection.
 * Orchestrates regular (session block) and irregular (custom builder) 
 * schedule picking strategies based on student study type.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { schedulingApi } from '../../api/scheduling';
import { Info } from 'lucide-react';
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
      
      // Fetch: only approved, non-credited subjects for this term. 
      // page_size=100 ensures we don't miss subjects due to pagination.
      const { data: gradesRes } = await api.get(`grades/advising/?term=${term.id}&advising_status=APPROVED&is_credited=false&page_size=100`);
      const filteredApproved = gradesRes.results || gradesRes; // Handle paginated or non-paginated response
      
      setApprovedGrades(filteredApproved);

      if (enrollData) {
        if (enrollData.is_regular) {
          const { data: matrix } = await schedulingApi.getStatusMatrix({ term_id: term.id, program_id: enrollData.student_details?.program, year_level: enrollData.year_level });
          setSectionsMatrix(matrix || []);
        } else {
          // Fetch sections only for the filtered list of subjects
          const sectionRes = await Promise.all(filteredApproved.map(g => api.get(`sections/?term_id=${term.id}&subject_id=${g.subject}`)));
          const sectionsMap = {};
          filteredApproved.forEach((g, i) => {
            sectionsMap[g.subject] = sectionRes[i].data.results || sectionRes[i].data;
          });
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
        {isRegular ? (
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
        )}

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
