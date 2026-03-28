/**
 * Richwell Portal — Student Advising Page
 * 
 * Main entry point for students to pick their subjects for the current term.
 * Supports automated selection for regular students and manual catalog 
 * selection for irregular students.
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle, Filter, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';

// Sub-components
import SelectedSubjectsTable from './components/advising/SelectedSubjectsTable';
import SubjectSelectionList from './components/advising/SubjectSelectionList';
import AdvisingSummaryCard from './components/advising/AdvisingSummaryCard';
import './StudentAdvising.css';

const StudentAdvising = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [isRegular, setIsRegular] = useState(true);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [passedSubjectIds, setPassedSubjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: terms } = await api.get('terms/?is_active=true');
      const term = terms.results[0];
      setActiveTerm(term);
      if (!term) return;

      const { data: enrollData } = await api.get(`students/enrollments/me/?term=${term.id}`);
      if (!enrollData) return;
      
      setEnrolled(true); setEnrollment(enrollData); setIsRegular(enrollData.is_regular);
      const { data: grRes } = await api.get(`grades/advising/?term=${term.id}&is_credited=false&page_size=100`);
      setGrades(grRes.results || []);
      const { data: pRes } = await api.get(`grades/advising/?grade_status=PASSED&page_size=300`);
      setPassedSubjectIds(pRes.results.map(g => g.subject) || []);
      
      if (!enrollData.is_regular && (!grRes.results || grRes.results.length === 0)) {
         const { data: subRes } = await api.get(`academics/subjects/?curriculum=${enrollData.student_details?.curriculum}&page_size=200`);
         setAvailableSubjects(subRes.results || []);
      }
    } catch (e) { console.error("Data fetch error:", e); } finally { setLoading(false); }
  };

  const handleAction = async (endpoint, data = {}) => {
    try {
      setLoading(true);
      await api.post(`grades/advising/${endpoint}/`, data);
      await fetchInitialData();
    } catch (e) { alert(e.response?.data?.error || "Action failed"); } finally { setLoading(false); }
  };

  const isOfferedThisTerm = (s) => activeTerm && s.semester === activeTerm.semester_type;
  const toggleSubject = (s) => {
    if (!isOfferedThisTerm(s)) return alert("Not offered this term.");
    const p = checkPrerequisites(s);
    if (!p.met && !selectedSubjectIds.includes(s.id)) return alert(p.reason);
    setSelectedSubjectIds(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id]);
  };

  const checkPrerequisites = (s) => {
    for (const pr of (s.prerequisites || [])) {
      if (pr.prerequisite_type === 'SPECIFIC' && !passedSubjectIds.includes(pr.prerequisite_subject))
        return { met: false, reason: `Prerequisite ${pr.prerequisite_subject_code} not passed.` };
      if (pr.prerequisite_type === 'YEAR_STANDING' && (enrollment?.year_level || 1) < pr.standing_year)
        return { met: false, reason: `Requires Year ${pr.standing_year} standing.` };
    }
    return { met: true };
  };

  const calculateTotalUnits = () => {
    const existing = grades.filter(g => !g.is_credited).reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0);
    const selected = availableSubjects.filter(s => selectedSubjectIds.includes(s.id)).reduce((sum, s) => sum + (s.total_units || 0), 0);
    return existing + selected;
  };

  if (loading) return <LoadingSpinner size="lg" style={{ marginTop: '80px' }} />;
  if (!enrolled) return (
    <div className="max-w-4xl mx-auto mt-10 p-6 text-center">
      <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800">Enrollment Required</h2>
      <Button className="mt-6" onClick={() => navigate('/student')}>Go to Dashboard</Button>
    </div>
  );

  const enrollingGrades = grades.filter(g => !g.is_credited);
  const groupSubjects = (subs) => {
    const g = {};
    subs.forEach(s => {
      const key = `Year ${s.year_level || 1} - ${s.semester === '1' ? '1st Sem' : s.semester === '2' ? '2nd Sem' : 'Summer'}`;
      if (!g[key]) g[key] = []; g[key].push(s);
    });
    return g;
  };

  const catSubs = groupSubjects(availableSubjects.filter(s => !grades.some(g => g.subject === s.id) && !passedSubjectIds.includes(s.id)).filter(s => s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="student-advising-container pb-24">
      <PageHeader title="Subject Advising" description={`${activeTerm?.code} (${activeTerm?.semester_display})`}
        actions={<div className="flex items-center gap-2"><Badge variant={enrollment?.advising_status === 'APPROVED' ? 'success' : 'warning'}>{enrollment?.advising_status}</Badge></div>} />
      <div className="advising-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {enrollingGrades.length > 0 && (
            <Card title="Current Selection" icon={<AlertCircle size={18} />}>
              <SelectedSubjectsTable enrollingGrades={enrollingGrades} enrollmentStatus={enrollment?.advising_status} onReset={() => setGrades([])} />
            </Card>
          )}
          {isRegular ? ( !enrollingGrades.length && (
            <Card className="text-center py-20">
              <ClipboardList size={64} className="mx-auto mb-4 opacity-20" />
              <Button className="mt-10" loading={loading} onClick={() => handleAction('auto-advise')} disabled={!enrollment?.student_details?.is_advising_unlocked}>Generate Enrollment Slip</Button>
            </Card>
          )) : ( enrollment?.advising_status !== 'APPROVED' && (
            <Card title="Subject Catalog" icon={<Filter size={18} />}>
              <SearchBar placeholder="Filter catalog..." onSearch={setSearchTerm} />
              <SubjectSelectionList categorizedSubjects={catSubs} selectedSubjectIds={selectedSubjectIds} toggleSubject={toggleSubject} checkPrerequisites={checkPrerequisites} isOfferedThisTerm={isOfferedThisTerm} />
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <AdvisingSummaryCard enrollment={enrollment} isRegular={isRegular} totalUnits={calculateTotalUnits()} loading={loading} enrollmentStatus={enrollment?.advising_status} selectedSubjectIds={selectedSubjectIds} onSubmit={() => handleAction('manual-advise', { subject_ids: selectedSubjectIds })} />
          <Card style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}><div className="flex gap-3"><Info /><p className="text-xs opacity-90">Verify prerequisites before submission. Regular students get auto-filled subjects.</p></div></Card>
        </div>
      </div>
    </div>
  );
};

export default StudentAdvising;
