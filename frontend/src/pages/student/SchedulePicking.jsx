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

  useEffect(() => { fetchData(); }, []);

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
    <div className="picking-page-root pb-20">
      <PageHeader 
        title="Schedule Selection" 
        description={activeTerm?.code}
        actions={
          <div className="flex gap-2">
            <Badge variant="ghost" className="bg-slate-100 text-slate-500 font-bold px-3 py-1 text-xs">Term: {activeTerm?.code}</Badge>
            <Badge variant="ghost" className="bg-slate-100 text-slate-500 font-bold px-3 py-1 text-xs">{isRegular ? 'Section Block Assignment' : 'Custom Build'}</Badge>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-6">
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

        <div className="mt-12 flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-800 text-sm">
           <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
           <p className="leading-relaxed opacity-90">
             Enrollment spots are finalized in real-time. If your preferred section is full before confirming, the system will prompt an error.
             For regular students, specific sections are assigned by curriculum slots.
           </p>
        </div>
      </div>
    </div>
  );
};

export default SchedulePicking;
