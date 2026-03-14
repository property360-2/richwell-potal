import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckSquare, ShieldCheck, AlertCircle, ChevronRight, Info, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { schedulingApi } from '../../api/scheduling';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

import './SchedulePicking.css';

const SchedulePicking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [approvedGrades, setApprovedGrades] = useState([]);
  const [sectionsMatrix, setSectionsMatrix] = useState([]);
  const [selectedSession, setSelectedSession] = useState('AM');
  const [subjectSections, setSubjectSections] = useState({}); // { subjectId: [sections] }
  const [selectedSections, setSelectedSections] = useState({}); // { subjectId: sectionId }
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const termRes = await api.get('terms/?is_active=true');
      const term = termRes.data.results?.[0] || termRes.data[0];
      setActiveTerm(term);

      if (term) {
        const enrollRes = await api.get(`students/enrollments/me/?term=${term.id}`);
        setEnrollment(enrollRes.data);

        const gradesRes = await api.get(`grades/advising/?term=${term.id}&advising_status=APPROVED`);
        const approved = gradesRes.data.results || [];
        setApprovedGrades(approved);

        if (enrollRes.data) {
          // Fetch matrix for regular students
          const matrixRes = await schedulingApi.getStatusMatrix({
            term_id: term.id,
            program_id: enrollRes.data.student_details?.program,
            year_level: enrollRes.data.year_level
          });
          setSectionsMatrix(matrixRes.data || []);

          // For irregular students, fetch sections for each subject
          if (!enrollRes.data.is_regular) {
              const sectionsMap = {};
              for (const grade of approved) {
                  const sRes = await api.get(`sections/?term_id=${term.id}&subject_id=${grade.subject}`);
                  sectionsMap[grade.subject] = sRes.data.results || sRes.data;
              }
              setSubjectSections(sectionsMap);
          }
        }
      }
    } catch (err) {
      showToast('error', 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePickRegular = async () => {
    if (!window.confirm(`Are you sure you want to pick the ${selectedSession === 'AM' ? 'Morning' : 'Afternoon'} session?`)) return;
    try {
      setIsProcessing(true);
      const res = await schedulingApi.pickRegular({
        term_id: activeTerm.id,
        session: selectedSession
      });
      showToast('success', res.data.message);
      if (res.data.redirected) {
          showToast('info', 'Preferred session was full; you were assigned to the available session.');
      }
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to pick schedule');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickIrregular = async () => {
    const selections = Object.entries(selectedSections).map(([subjectId, sectionId]) => ({
        subject_id: parseInt(subjectId),
        section_id: parseInt(sectionId)
    }));

    if (selections.length < approvedGrades.length) {
        return showToast('error', 'Please select a section for all subjects');
    }

    try {
        setIsProcessing(true);
        await schedulingApi.pickIrregular({
            term_id: activeTerm.id,
            selections
        });
        showToast('success', 'Schedule picked successfully');
        fetchData();
    } catch (err) {
        showToast('error', err.response?.data?.error || 'Failed to pick schedules');
    } finally {
        setIsProcessing(false);
    }
  };

  if (loading && !enrollment) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!enrollment || enrollment.advising_status !== 'APPROVED') {
    return (
      <div className="picking-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ShieldCheck size={64} style={{ color: 'var(--color-border)', marginBottom: 'var(--space-6)' }} />
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Advising Approval Required</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>You must have an approved subject advising list before you can proceed with schedule picking.</p>
            <Button variant="primary" onClick={() => navigate('/student/advising')}>Go to Advising</Button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const pickingNotPublished = activeTerm && !activeTerm.schedule_published;
  const pickingNotStarted = activeTerm?.schedule_picking_start && today < activeTerm.schedule_picking_start;
  const pickingEnded = activeTerm?.schedule_picking_end && today > activeTerm.schedule_picking_end;
  // Removed pickingNotPublished from blocker: Students can pick as soon as sections are generated.
  const pickingBlocked = (activeTerm?.schedule_picking_start && pickingNotStarted) || pickingEnded;

  if (pickingBlocked && activeTerm) {
    let title = 'Schedule Picking Unavailable';
    let message = 'You cannot pick your schedule at this time.';
    if (pickingNotPublished) {
      title = 'Schedule Not Published Yet';
      message = 'The Dean has not published the schedule for this term. Please check back later.';
    } else if (pickingNotStarted) {
      title = 'Picking Period Not Started';
      message = `Schedule picking opens on ${activeTerm.schedule_picking_start}.`;
    } else if (pickingEnded) {
      title = 'Picking Period Ended';
      message = `Schedule picking ended on ${activeTerm.schedule_picking_end}. Please contact the Registrar.`;
    }
    return (
      <div className="picking-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Calendar size={64} style={{ color: 'var(--color-border)', marginBottom: 'var(--space-6)' }} />
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{title}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>{message}</p>
        </div>
      </div>
    );
  }

  const isRegular = enrollment.is_regular;

  return (
    <div className="picking-container">
      <div className="picking-header">
        <h1>Schedule Timetable Selection</h1>
        <div className="picking-header-meta">
          <Badge variant="primary">{activeTerm?.code}</Badge>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isRegular ? 'Section Block Assignment' : 'Custom Schedule Builder'}
          </span>
        </div>
      </div>

      <div className={isRegular ? '' : 'picking-grid'}>
        {/* Sidebar: Approved Subjects (Only for Irregular) */}
        {!isRegular && (
          <div className="subjects-column">
            <Card title="Approved Subjects List" style={{ height: 'auto' }}>
              <div className="subjects-card">
                {approvedGrades.map(grade => (
                  <div key={grade.id} className="subject-item">
                    <div className="subject-code">
                      <span>{grade.subject_details?.code}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{grade.subject_details?.total_units} UNITS</span>
                    </div>
                    <div className="subject-desc">{grade.subject_details?.description}</div>
                  </div>
                ))}
                {approvedGrades.length === 0 && (
                  <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase' }}>
                    No subjects approved
                  </div>
                )}
              </div>
            </Card>

            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-4)' }}>
              <Info size={24} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Sections are capped at 40 students. If your preferred session is full, the system will automatically assign you to the available slot.
              </p>
            </div>
          </div>
        )}

        {/* Main: Picking UI */}
        <div className="selection-column">
          {isRegular ? (
            <div className="session-selector-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="session-card-header">
                <h3>Select Your Preferred Session</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Choose a session block to automatically join a section with matching hours.</p>
              </div>

              <div className="session-options">
                {['AM', 'PM'].map(session => {
                  const isSelected = selectedSession === session;
                  const available = sectionsMatrix.filter(s => s.session === session && !s.is_full);
                  const isSessionFull = available.length === 0;

                  return (
                    <div 
                      key={session}
                      onClick={() => !isSessionFull && setSelectedSession(session)}
                      className={`session-option ${isSelected ? 'selected' : ''} ${isSessionFull ? 'disabled' : ''}`}
                    >
                      <div className="session-icon">
                        <Clock size={24} />
                      </div>
                      <div className="session-title">{session === 'AM' ? 'Morning' : 'Afternoon'}</div>
                      <div className="session-time">{session === 'AM' ? '07:00 AM - 12:00 PM' : '01:00 PM - 06:00 PM'}</div>
                      
                      {isSessionFull && (
                        <div style={{ marginTop: 'var(--space-4)' }}>
                          <Badge variant="error" style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px' }}>SESSION FULL</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {enrollment.enrollment_status === 'ENROLLED' && (
                <div style={{ margin: 'var(--space-8)', marginTop: 0, padding: 'var(--space-6)', backgroundColor: 'var(--color-success-light)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success)', display: 'flex', gap: 'var(--space-4)' }}>
                    <CheckSquare size={24} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <div>
                        <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '4px' }}>Officially Enrolled</h4>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Your schedule is now locked and confirmed. Welcome to the new term!</p>
                    </div>
                </div>
              )}

              <div className="picking-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                   <CheckSquare size={18} style={{ color: 'var(--color-success)' }} />
                   <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    Selected: <span style={{ color: 'var(--color-primary)' }}>{selectedSession === 'AM' ? 'Morning (AM)' : 'Afternoon (PM)'} Block</span>
                   </span>
                </div>
                <Button 
                  variant="primary" 
                  size="lg" 
                  loading={isProcessing}
                  onClick={handlePickRegular}
                  disabled={enrollment.enrollment_status === 'ENROLLED'}
                >
                  Confirm & Lock Schedule
                </Button>
              </div>
            </div>
          ) : (
            <div className="session-selector-card">
              <div className="session-card-header">
                <h3>Select Subject Sections</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Review available slots for each subject and build your personalized timetable.</p>
              </div>

              <div className="irregular-selections">
                {approvedGrades.map(grade => (
                  <div key={grade.id} className="subject-selection-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                       <Badge variant="neutral" style={{ fontWeight: 700 }}>{grade.subject_details?.code}</Badge>
                       <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)' }}>{grade.subject_details?.description}</span>
                    </div>
                    
                    <div className="section-grid">
                      {(subjectSections[grade.subject] || []).map(section => {
                          const isSelected = selectedSections[grade.subject] === section.id;
                          const isFull = section.student_count >= section.max_students;

                          return (
                            <div 
                              key={section.id}
                              onClick={() => !isFull && setSelectedSections({...selectedSections, [grade.subject]: section.id})}
                              className={`section-option-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                            >
                              <div className="section-info-top">
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>{section.name}</span>
                                <Badge variant={section.session === 'AM' ? 'info' : 'warning'} style={{ fontSize: '9px', fontWeight: 800 }}>{section.session}</Badge>
                              </div>
                              <div className="section-info-bottom">
                                <span>SLOTS</span>
                                <span style={{ color: isFull ? 'var(--color-error)' : 'inherit' }}>{section.student_count} / {section.max_students}</span>
                              </div>
                              {isSelected && (
                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: 'var(--shadow-sm)' }}>
                                  <CheckSquare size={12} />
                                </div>
                              )}
                            </div>
                          );
                      })}
                      {(subjectSections[grade.subject] || []).length === 0 && (
                          <div style={{ padding: 'var(--space-4)', textAlign: 'center', backgroundColor: 'var(--color-bg)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                              NO SECTIONS AVAILABLE
                          </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="picking-footer">
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Selection: <span style={{ color: 'var(--color-primary)' }}>{Object.keys(selectedSections).length} / {approvedGrades.length}</span> Subjects Selected
                </div>
                <Button 
                  variant="primary" 
                  size="lg" 
                  loading={isProcessing}
                  onClick={handlePickIrregular}
                  disabled={Object.keys(selectedSections).length < approvedGrades.length || enrollment.enrollment_status === 'ENROLLED'}
                >
                  Finalize Timetable
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePicking;
