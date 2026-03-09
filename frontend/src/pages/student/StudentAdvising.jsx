import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './StudentAdvising.css';


const StudentAdvising = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [isRegular, setIsRegular] = useState(true);
  
  // For irregular selection
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [passedSubjectIds, setPassedSubjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const termRes = await api.get('terms/?is_active=true');
      const term = termRes.data.results[0];
      setActiveTerm(term);

      if (term) {
        const enrollmentRes = await api.get(`students/enrollments/me/?term=${term.id}`);
        const enrollData = enrollmentRes.data;
        
        if (enrollData) {
          setEnrolled(true);
          setEnrollment(enrollData);
          setIsRegular(enrollData.is_regular);
          
          const gradesRes = await api.get(`grades/advising/?term=${term.id}&is_credited=false&page_size=100`);
          setGrades(gradesRes.data.results || []);

          // Fetch ALL passed subjects for prerequisite checking
          const passedRes = await api.get(`grades/advising/?grade_status=PASSED&page_size=300`);
          setPassedSubjectIds(passedRes.data.results.map(g => g.subject) || []);
          
          if (!enrollData.is_regular && (!gradesRes.data.results || gradesRes.data.results.length === 0)) {
             const subjectsRes = await api.get(`academics/subjects/?semester=${term.semester_type}&page_size=100`);
             setAvailableSubjects(subjectsRes.data.results || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching advising data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAdvise = async () => {
    try {
      setLoading(true);
      await api.post('grades/advising/auto_advise/');
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.error || "Auto-advising failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdvise = async () => {
    try {
      setLoading(true);
      await api.post('grades/advising/manual_advise/', {
        subject_ids: selectedSubjectIds
      });
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.error || "Manual advising failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject) => {
    const prereq = checkPrerequisites(subject);
    if (!prereq.met && !selectedSubjectIds.includes(subject.id)) {
      alert(`Cannot select ${subject.code}: ${prereq.reason}`);
      return;
    }

    if (selectedSubjectIds.includes(subject.id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(sid => sid !== subject.id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subject.id]);
    }
  };

  const checkPrerequisites = (subject) => {
    if (!subject.prerequisites || subject.prerequisites.length === 0) return { met: true };

    for (const prereq of subject.prerequisites) {
      if (prereq.prerequisite_type === 'SPECIFIC') {
        if (!passedSubjectIds.includes(prereq.prerequisite_subject)) {
          return { met: false, reason: `Prerequisite ${prereq.prerequisite_subject_code} not passed.` };
        }
      } else if (prereq.prerequisite_type === 'YEAR_STANDING') {
        if ((enrollment?.year_level || 1) < prereq.standing_year) {
          return { met: false, reason: `Requires at least Year ${prereq.standing_year} standing.` };
        }
      }
    }
    return { met: true };
  };

  const calculateTotalUnits = () => {
    // Only count subjects being actively advised/enrolled, NOT credited ones
    const activeAdvisingGrades = grades.filter(g => !g.is_credited);
    const existingUnits = activeAdvisingGrades.reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0);
    const selection = availableSubjects.filter(s => selectedSubjectIds.includes(s.id));
    const selectedUnits = selection.reduce((sum, s) => sum + (s.total_units || 0), 0);
    return existingUnits + selectedUnits;
  };

  if (loading) return <LoadingSpinner size="lg" style={{ marginTop: '80px' }} />;

  if (!enrolled) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Enrollment Required</h2>
        <p className="text-slate-600 mt-2">You must enroll for the current term before you can proceed to subject advising.</p>
        <Button className="mt-6" onClick={() => window.location.href = '/student'}>Go to Dashboard</Button>
      </div>
    );
  }

  const enrollmentStatus = enrollment?.advising_status;
  const enrollingGrades = grades.filter(g => !g.is_credited);
  const creditedGrades = grades.filter(g => g.is_credited);
  const hasAdvising = enrollingGrades.length > 0;
  const hasCredits = creditedGrades.length > 0;
  const totalUnits = calculateTotalUnits();

  const groupSubjects = (subjects) => {
    const groups = {};
    subjects.forEach(subject => {
      const year = subject.year_level || 1;
      const sem = subject.semester === '1' ? '1st Semester' : subject.semester === '2' ? '2nd Semester' : 'Summer';
      const key = `Year ${year} - ${sem}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(subject);
    });
    return groups;
  };

  const categorizedSubjects = groupSubjects(
    availableSubjects
      .filter(s => !grades.some(g => g.subject === s.id) && !passedSubjectIds.includes(s.id))
      .filter(s => s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="student-advising-container" style={{ paddingBottom: '100px' }}>
      <header className="advising-header">
        <div className="advising-header-info">
          <h1>Subject Advising</h1>
          <p>Pick your subjects for {activeTerm?.code} ({activeTerm?.semester_display})</p>
        </div>
        
        {enrollmentStatus && (
          <div className="status-badge-container">
            <span className="text-slate-500 font-medium">Status:</span>
            <Badge 
              variant={
                enrollmentStatus === 'APPROVED' ? 'success' : 
                enrollmentStatus === 'REJECTED' ? 'error' : 
                enrollmentStatus === 'DRAFT' ? 'info' : 'warning'
              }
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {enrollmentStatus === 'DRAFT' ? 'OPEN / DRAFT' : enrollmentStatus}
            </Badge>
          </div>
        )}
      </header>

      <div className="advising-grid">
        <div className="space-y-6">
          {/* Table for ALREADY ADVISED / CREDITED subjects */}
          {hasAdvising && (
            <Card title="Your Selected Subjects" icon={<CheckCircle2 size={18} className="text-success" />}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Code</th>
                      <th>Description</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Units</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollingGrades.map(grade => (
                      <tr key={grade.id}>
                        <td className="font-bold text-slate-800">{grade.subject_details?.code}</td>
                        <td className="text-slate-600">
                          {grade.subject_details?.description}
                          {grade.is_retake && <Badge variant="error" size="sm" style={{ marginLeft: '8px' }}>Retake</Badge>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{grade.subject_details?.total_units}</td>
                        <td style={{ textAlign: 'center' }}>
                           <Badge variant={grade.grade_status === 'ENROLLED' ? 'success' : 'warning'}>
                             {grade.grade_status_display}
                           </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {enrollmentStatus === 'REJECTED' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700">
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Reason for Rejection:</p>
                    <p className="text-sm mt-1">{enrollingGrades[0]?.rejection_reason || "No specific reason provided."}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="mt-3 text-red-600 hover:bg-red-100"
                      onClick={() => setGrades([])}
                    >
                      Reset Selection
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* LIST for picking subjects */}
          {isRegular ? (
            !hasAdvising && (
              <Card>
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <ClipboardList size={64} className="mx-auto text-blue-500 mb-4 opacity-20" />
                  <h3 className="text-xl font-bold text-slate-800">Ready for Auto-Advising</h3>
                  
                  {!enrollment?.is_advising_unlocked ? (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg max-w-sm mx-auto">
                      <p className="text-amber-800 text-sm font-medium">
                        Waiting for Registrar Approval
                      </p>
                      <p className="text-amber-700 text-xs mt-1">
                        Please wait for the Registrar to finish crediting your subjects or verifying your documents before you can proceed.
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                      As a regular student, your curriculum subjects will be automatically selected based on your current year level.
                    </p>
                  )}

                  <Button 
                    className="mt-10" 
                    size="lg"
                    loading={loading}
                    onClick={handleAutoAdvise}
                    disabled={!enrollment?.is_advising_unlocked}
                  >
                    Generate Enrollment Slip
                  </Button>
                </div>
              </Card>
            )
          ) : (
            enrollmentStatus !== 'APPROVED' && (
              <Card title="Selection of Subjects" icon={<Filter size={18} className="text-primary" />}>
                 <div className="search-container">
                    <Search className="search-icon" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filter by code or description..."
                      className="search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>

                 <div className="subject-selection-list">
                    {Object.keys(categorizedSubjects).length > 0 ? (
                      Object.entries(categorizedSubjects).map(([group, subjects]) => (
                        <div key={group} className="subject-group">
                           <div className="subject-group-header">
                             {group}
                           </div>
                           {subjects.map(subject => {
                              const isSelected = selectedSubjectIds.includes(subject.id);
                              const prereq = checkPrerequisites(subject);
                              return (
                                <div 
                                  key={subject.id}
                                  className={`subject-selection-item ${isSelected ? 'selected' : ''} ${!prereq.met ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => toggleSubject(subject)}
                                >
                                  <div className="flex-1">
                                     <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{subject.code}</span>
                                        <span className="text-xs text-slate-500">• {subject.total_units} Units</span>
                                        {!prereq.met && (
                                          <Badge variant="error" size="sm" icon={<AlertCircle size={10}/>}>
                                            Missing Prereq
                                          </Badge>
                                        )}
                                     </div>
                                     <p className="text-sm text-slate-600 mt-1">{subject.description}</p>
                                     {!prereq.met && (
                                       <p className="text-[10px] text-red-500 font-medium mt-1">{prereq.reason}</p>
                                     )}
                                  </div>
                                  <div className="selection-checkbox">
                                     {isSelected && <CheckCircle2 size={16} />}
                                     {!isSelected && !prereq.met && <AlertCircle size={16} className="text-slate-300" />}
                                  </div>
                                </div>
                              );
                           })}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-400">
                        No subjects found matching your curriculum and semester.
                      </div>
                    )}
                 </div>
              </Card>
            )
          )}
        </div>

        <div className="space-y-6">
          <Card title="Advising Summary">
            <div className="summary-card-content">
              <div className="summary-item">
                <span className="summary-label">Student ID</span>
                <span className="summary-value">{enrollment?.student_details?.idn}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Program</span>
                <span className="summary-value">{enrollment?.student_details?.program_details?.code}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Year Level</span>
                <span className="summary-value">{enrollment?.year_level || '1'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Study Type</span>
                <Badge variant="ghost">{isRegular ? 'Regular' : 'Irregular'}</Badge>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="total-units-display">
                <span className="summary-label">Total Units</span>
                <span className={`total-units-value ${totalUnits > 30 ? 'text-red-600' : 'text-blue-600'}`}>
                  {totalUnits}
                </span>
              </div>

              {totalUnits > 30 && (
                 <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2">
                   <AlertCircle size={14} className="shrink-0" />
                   Exceeds 30 units limit. Please remove some subjects.
                 </div>
              )}

              {enrollmentStatus !== 'APPROVED' && !isRegular && (
                <Button 
                  className="w-full mt-2" 
                  disabled={selectedSubjectIds.length === 0 || totalUnits > 30 || !enrollment?.student_details?.is_advising_unlocked}
                  onClick={handleManualAdvise}
                  loading={loading}
                >
                  {!enrollment?.student_details?.is_advising_unlocked ? 'Locked by Registrar' : 'Submit for Approval'}
                </Button>
              )}

            </div>
          </Card>

          <Card style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}>
             <div className="flex gap-3">
                <Info className="shrink-0" />
                <div>
                   <p className="text-sm font-semibold">Advising Tip</p>
                   <p className="text-xs opacity-80 mt-1">
                     Regular students get their subjects auto-filled. Irregular students must verify prerequisites before submission.
                   </p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentAdvising;


