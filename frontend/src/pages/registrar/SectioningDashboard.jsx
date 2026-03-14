import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, FilePlus, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { sectionsApi } from '../../api/sections';
import { schedulingApi } from '../../api/scheduling';
import { termsApi } from '../../api/terms';
import academicsApi from '../../api/academics';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import PageHeader from '../../components/shared/PageHeader';
import SectionPreviewModal from './components/SectionPreviewModal';

import './SectioningDashboard.css';

const SectioningDashboard = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [stats, setStats] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Modal Tabs
  const [mainTab, setMainTab] = useState('matrix'); // 'matrix' or 'sections'
  const [modalTab, setModalTab] = useState('students'); // 'students' or 'schedule'
  
  const [selectedSection, setSelectedSection] = useState(null);
  const [roster, setRoster] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generationParams, setGenerationParams] = useState(null);

  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const termsRes = await termsApi.getTerms({ is_active: true });
      const term = termsRes.data.results?.[0] || termsRes.data[0];
      setActiveTerm(term);

      if (term) {
        const statsRes = await sectionsApi.getStats(term.id);
        setStats(statsRes.data);

        const programsRes = await academicsApi.getPrograms();
        setPrograms(programsRes.data.results || programsRes.data);

        const sectionsRes = await sectionsApi.getSections({ term_id: term.id });
        setSections(sectionsRes.data.results || sectionsRes.data);
      }
    } catch (err) {
      showToast('error', 'Failed to load sectioning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = (programId, yearLevel) => {
    setGenerationParams({ program_id: programId, year_level: yearLevel, term_id: activeTerm.id });
    setIsPreviewOpen(true);
  };

  const handleConfirmGeneration = async (numSections) => {
    try {
      await sectionsApi.generate({
        ...generationParams,
        num_sections: numSections
      });
      showToast('success', 'Sections generated successfully');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to generate sections');
      throw err;
    }
  };

  const handleOpenRoster = async (section) => {
    setSelectedSection(section);
    setRoster([]);
    setSchedules([]);
    setModalTab('students');
    setIsRosterOpen(true);
    
    try {
      setRosterLoading(true);
      const [rosterRes, scheduleRes] = await Promise.all([
        sectionsApi.getSectionRoster(section.id),
        schedulingApi.getSchedules({ section_id: section.id, term_id: activeTerm.id })
      ]);
      setRoster(rosterRes.data);
      setSchedules(scheduleRes.data.results || scheduleRes.data);
    } catch (err) {
      showToast('error', 'Failed to load class details');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOpenTransfer = (student) => {
    setStudentToTransfer(student);
    setTargetSectionId('');
    setIsTransferOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!targetSectionId) return showToast('error', 'Select a target section');
    
    try {
      setIsTransferring(true);
      await sectionsApi.transferStudent(targetSectionId, {
        student_id: studentToTransfer.student_id,
        term_id: activeTerm.id
      });
      showToast('success', 'Student transferred successfully');
      setIsTransferOpen(false);
      handleOpenRoster(selectedSection); // Refresh roster
      fetchData(); // Refresh counts
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading && !activeTerm) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const matrix = {};
  programs.forEach(p => {
    matrix[p.id] = { 1: 0, 2: 0, 3: 0, 4: 0 };
  });
  stats.forEach(s => {
    if (matrix[s.student__program__id]) {
      matrix[s.student__program__id][s.year_level] = s.count;
    }
  });

  const rosterColumns = [
    { header: 'IDN', accessor: 'student_idn' },
    { header: 'Full Name', accessor: 'student_name' },
    { 
        header: 'Role', 
        render: (row) => row.is_home_section ? <Badge variant="info">Primary</Badge> : <Badge variant="neutral">Irregular</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="xs" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }} onClick={() => handleOpenTransfer(row)}>
          Transfer
        </Button>
      )
    }
  ];

  const scheduleColumns = [
    { header: 'Subject', accessor: 'subject_code' },
    { 
        header: 'Professor', 
        render: (row) => (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{row.professor_name || 'TBA'}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{row.component_type}</span>
            </div>
        )
    },
    { 
        header: 'Schedule', 
        render: (row) => row.days?.length > 0 && row.start_time && row.end_time ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{row.days.join('')}</span>
                <span style={{ fontSize: '10px' }}>{String(row.start_time).substring(0,5)} - {String(row.end_time).substring(0,5)}</span>
            </div>
        ) : 'TBA'
    },
    { header: 'Room', render: (row) => row.room_name || 'AUTO/TBA' }
  ];

  return (
    <div className="sectioning-container">
      <PageHeader 
        title="Sectioning Dashboard"
        description="Enrollment Matrix & Automated Section Generation"
        badge={<Badge variant="primary" className="ml-2">{activeTerm?.code}</Badge>}
        actions={
          <Button variant="ghost" className="bg-white border border-slate-200" icon={<RefreshCw size={18} />} onClick={fetchData}>
            Sync Matrix
          </Button>
        }
      />

      {/* Main Tabs Selection */}
      <Tabs 
        activeTab={mainTab}
        onTabChange={setMainTab}
        tabs={[
          { id: 'matrix', label: 'Enrollment Matrix', icon: LayoutGrid },
          { id: 'sections', label: 'Generated Sections', icon: Users }
        ]}
        className="mb-6"
      />

      <div className="tab-content animate-in fade-in duration-300">
        {mainTab === 'matrix' ? (
          /* Enrollment Matrix Card */
          <div className="matrix-card">
            <div className="matrix-card-header">
              <h3>Approved Students Matrix</h3>
            </div>
            <div className="matrix-table-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Program / Course</th>
                    <th>1st Year</th>
                    <th>2nd Year</th>
                    <th>3rd Year</th>
                    <th>4th Year</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(program => (
                    <tr key={program.id}>
                      <td>
                        <div className="program-info">
                          <span className="program-code">{program.code}</span>
                          <span className="program-name" title={program.name}>{program.name}</span>
                        </div>
                      </td>
                      {[1, 2, 3, 4].map(year => {
                        const count = matrix[program.id]?.[year] || 0;
                        const existingSections = sections.filter(s => s.program === program.id && s.year_level === year);
                        const isFull = existingSections.some(s => s.student_count >= s.max_students);
                        
                        // Calculate required sections based on 40 cap
                        const requiredSections = Math.ceil(count / 40.0);
                        const needsMore = count > 0 && existingSections.length < requiredSections;
                        
                        return (
                          <td key={year}>
                            <div className="student-count-cell">
                              <span className={`count-number ${count === 0 ? 'zero' : ''}`}>
                                {count}
                              </span>
                              
                              {count > 0 && (
                                <div className="flex flex-col gap-2 items-center">
                                  {existingSections.length > 0 && (
                                    <Badge variant={isFull ? "error" : "success"} style={{ borderRadius: '20px', fontWeight: 'bold' }}>
                                      {existingSections.length} {existingSections.length === requiredSections ? (existingSections.length === 1 ? 'BLOCK' : 'BLOCKS') : `/ ${requiredSections} BLOCKS`}
                                    </Badge>
                                  )}
                                  
                                  {(existingSections.length === 0 || needsMore) && (
                                    <Button 
                                      variant={existingSections.length === 0 ? "primary" : "secondary"}
                                      size="xs" 
                                      style={{ borderRadius: '12px', padding: '2px 8px', fontSize: '9px', fontWeight: 'black' }}
                                      icon={<FilePlus size={10} />}
                                      onClick={() => handleGenerate(program.id, year)}
                                    >
                                      {existingSections.length === 0 ? 'GENERATE' : 'RE-GENERATE'}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Sections Grid Section */
          <div className="sections-container">
            <div className="sections-section-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={20} style={{ color: 'var(--color-primary)' }} />
                Active Section Blocks
              </h2>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                {sections.length} active units
              </div>
            </div>

            {sections.length > 0 ? (
              <div className="sections-grid">
                {sections.map(section => {
                  const fulfillment = (section.student_count / section.max_students) * 100;
                  const barColor = section.student_count >= section.max_students ? 'danger' : section.student_count > section.target_students ? 'warning' : 'normal';

                  return (
                    <div 
                      key={section.id} 
                      className="section-card"
                      onClick={() => handleOpenRoster(section)}
                    >
                      <div className="section-card-header">
                        <div className="section-name-box">
                          <h3>{section.name}</h3>
                          <div className="section-badges">
                            <Badge variant={section.session === 'AM' ? 'info' : 'warning'} style={{ fontSize: '9px', fontWeight: 'black' }}>
                              {section.session}
                            </Badge>
                            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {section.program_code}
                            </span>
                          </div>
                        </div>
                        <div className="capacity-info">
                          <div className="current-count">{section.student_count}</div>
                          <div className="max-label">/ {section.target_students}</div>
                        </div>
                      </div>
                      
                      <div className="fulfillment-container">
                        <div className="fulfillment-labels">
                          <span>Fulfillment</span>
                          <span>{Math.round(fulfillment)}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div 
                            className={`progress-bar-fill ${barColor}`}
                            style={{ width: `${fulfillment}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="view-roster-btn">
                        <span>View Class Details</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-card">
                <Users size={64} style={{ color: 'var(--color-primary)' }} />
                <h3>No Sections Generated</h3>
                <p>Select a program and year in the matrix above to begin automated section creation.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal 
        isOpen={isRosterOpen} 
        onClose={() => setIsRosterOpen(false)} 
        title={`${selectedSection?.name} Overview`}
        size="lg"
      >
        {/* Modal Tabs */}
        <Tabs 
          activeTab={modalTab}
          onTabChange={setModalTab}
          tabs={[
            { id: 'students', label: 'Student Roster', icon: Users },
            { id: 'schedule', label: 'Class Schedule', icon: Clock }
          ]}
          className="mb-6"
        />

        {modalTab === 'students' ? (
          <Table columns={rosterColumns} data={roster} loading={rosterLoading} />
        ) : (
          <div className="animate-in fade-in duration-300">
            <Table columns={scheduleColumns} data={schedules} loading={rosterLoading} />
            {schedules.length === 0 && !rosterLoading && (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto var(--space-4)', opacity: 0.2 }} />
                <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase' }}>No schedule assigned yet</p>
                <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>The Dean must publish the timetable for this section.</p>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setIsRosterOpen(false)}>Close</Button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Student"
      >
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</div>
                <div className="font-bold text-slate-800 uppercase">{studentToTransfer?.student_name}</div>
                <div className="text-xs text-slate-500">{studentToTransfer?.student_idn}</div>
            </div>

            <Select 
                label="Select Target Section"
                placeholder="Choose a section..."
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                options={sections
                    .filter(s => s.id !== selectedSection?.id && s.program === selectedSection?.program && s.year_level === selectedSection?.year_level)
                    .map(s => ({
                        value: s.id,
                        label: `${s.name} (${s.student_count}/${s.max_students})`
                    }))
                }
            />

            <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase">
                    Transferring a student will update their primary section and all associated subject schedules.
                </p>
            </div>

            <div className="flex gap-3 justify-end mt-8">
                <Button variant="ghost" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                <Button variant="primary" loading={isTransferring} onClick={handleConfirmTransfer}>Complete Transfer</Button>
            </div>
        </div>
      </Modal>
      <SectionPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        params={generationParams}
        onConfirm={handleConfirmGeneration}
      />
    </div>
  );
};

export default SectioningDashboard;
