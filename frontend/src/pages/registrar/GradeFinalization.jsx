import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldAlert, FileCheck, Layers, Settings2, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import Tabs from '../../components/ui/Tabs';
import { gradesApi } from '../../api/grades';
import { termsApi } from '../../api/terms';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import Modal from '../../components/ui/Modal';
import './GradeFinalization.css';

const GradeFinalization = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'resolutions', or 'finalization'
  const [loading, setLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [pendingSections, setPendingSections] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal context
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Details Modal context
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const termRes = await termsApi.getActiveTerm();
      const term = termRes.data?.results?.[0] || termRes.data?.[0];
      
      if (!term) {
        setPendingSections([]);
        setResolutions([]);
        return;
      }

      setActiveTerm(term);

      if (activeTab === 'pending') {
        const res = await gradesApi.getGrades({ 
          term: term.id, 
          finalized_at__isnull: 'true',
          grade_status__in: 'ENROLLED,PASSED,FAILED,INC,NO_GRADE'
        });
        
        // Group by section and subject
        const grouped = {};
        const grades = res.data?.results || [];
        grades.forEach(g => {
            const key = `${g.section}-${g.subject}`;
            if (!grouped[key]) {
                grouped[key] = {
                    section_id: g.section,
                    section_name: g.section_details?.name || `Section ${g.section}`,
                    subject_id: g.subject,
                    subject_code: g.subject_details?.code,
                    subject_name: g.subject_details?.name,
                    professor_name: g.professor_name || 'TBA',
                    pending_count: 0
                };
            }
            if (
              grouped[key].professor_name === 'TBA' &&
              g.professor_name &&
              g.professor_name !== 'TBA'
            ) {
                grouped[key].professor_name = g.professor_name;
            }
            grouped[key].pending_count++;
        });
        setPendingSections(Object.values(grouped));
      } else if (activeTab === 'resolutions') {
        const res = await gradesApi.getGrades({ 
          grade_status: 'INC',
          resolution_status: 'REQUESTED'
        });
        setResolutions(res.data?.results || []);
      } else if (activeTab === 'finalization') {
        const res = await gradesApi.getGrades({ 
          resolution_status: 'HEAD_APPROVED'
        });
        setResolutions(res.data?.results || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('error', error.response?.data?.error || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoster = (section) => {
    navigate(`/registrar/grades/review/${activeTerm.id}/${section.section_id}/${section.subject_id}`);
  };

  const pendingColumns = [
    {
      header: 'Subject',
      render: (row) => (
        <div className="py-1">
          <div className="font-bold text-slate-800">{row.subject_code}</div>
          <div className="text-xs text-slate-500">{row.subject_name}</div>
        </div>
      )
    },
    { header: 'Section', accessor: 'section_name' },
    {
      header: 'Professor',
      render: (row) => (
        <div className="text-sm text-slate-700 font-medium">
          {row.professor_name || 'TBA'}
        </div>
      )
    },
    {
       header: 'Action',
       align: 'right',
       render: (row) => (
         <Button variant="ghost" size="sm" onClick={() => handleOpenRoster(row)} icon={<ChevronRight size={16} />}>
            Review
         </Button>
       )
    }
  ];

  const resolutionColumns = [
    {
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-bold">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono">{row.student_idn}</div>
        </div>
      )
    },
    { 
        header: 'Requested By', 
        render: (row) => (
            <div className="text-xs">
                <div className="font-semibold text-slate-700">{row.professor_name || 'Professor'}</div>
                <div className="text-slate-400">Faculty</div>
            </div>
        )
    },
    { 
        header: 'Reason', 
        render: (row) => <div className="max-w-xs text-xs italic text-slate-600 truncate" title={row.resolution_reason}>{row.resolution_reason || 'No reason provided'}</div> 
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => (
            <div className="flex gap-2 justify-end">
                <Button 
                   size="sm" 
                   variant="ghost"
                   onClick={() => {
                     setSelectedDetails(row);
                     setIsDetailsModalOpen(true);
                   }}
                >
                    Details
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setSelectedRes(row);
                    setIsRejectModalOpen(true);
                  }}
                >
                    Reject
                </Button>
                <Button 
                  size="sm" 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await gradesApi.registrarApproveResolution(row.id);
                      addToast('info', 'Resolution request has been unlocked for the professor.');
                      fetchInitialData();
                    } catch (e) {
                      addToast('error', e.response?.data?.error || 'Action failed.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                    Approve
                </Button>
            </div>
        )
    }
  ];

  const finalizationColumns = [
    {
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-bold">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono">{row.student_idn}</div>
        </div>
      )
    },
    {
       header: 'Resolved Grade',
       render: (row) => <Badge variant="success" className="text-sm font-bold">{Number(row.resolution_new_grade || 0).toFixed(2)}</Badge>
    },
    { 
        header: 'Program Review', 
        render: (row) => (
            <div className="text-xs">
                <div className="font-semibold text-slate-700">{row.resolution_approved_by_name || 'Program Head'}</div>
                <div className="text-blue-500 font-medium">Head Approved</div>
            </div>
        )
    },
    { 
        header: 'Reason', 
        render: (row) => <div className="max-w-xs text-xs italic text-slate-600 truncate" title={row.resolution_reason}>{row.resolution_reason || 'No reason provided'}</div> 
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => (
            <div className="flex gap-2 justify-end">
                <Button 
                  size="sm" 
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700"
                  icon={<FileCheck size={16} />}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await gradesApi.registrarFinalizeResolution(row.id);
                      addToast('success', 'Grade resolution finalized and committed.');
                      fetchInitialData();
                    } catch (e) {
                      addToast('error', e.response?.data?.error || 'Finalization failed.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                    Finalize Result
                </Button>
            </div>
        )
    }
  ];

  const [gradingDates, setGradingDates] = useState({
    midterm_grade_start: '',
    midterm_grade_end: '',
    final_grade_start: '',
    final_grade_end: ''
  });

  useEffect(() => {
    if (activeTerm) {
      setGradingDates({
        midterm_grade_start: activeTerm.midterm_grade_start || '',
        midterm_grade_end: activeTerm.midterm_grade_end || '',
        final_grade_start: activeTerm.final_grade_start || '',
        final_grade_end: activeTerm.final_grade_end || ''
      });
    }
  }, [activeTerm]);

  const handleUpdateDates = async () => {
    try {
      setLoading(true);
      await termsApi.updateTerm(activeTerm.id, gradingDates);
      addToast('success', 'Grading window dates updated successfully.');
      fetchInitialData();
    } catch (e) {
      addToast('error', e.response?.data?.error || 'Failed to update dates.');
    } finally {
      setLoading(false);
    }
  };

  const isWindowOpen = (start, end) => {
    if (!start || !end) return false;
    const now = new Date();
    return new Date(start) <= now && now <= new Date(end);
  };

  return (
    <div className="grade-finalization-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Grade Management Console"
        description="Monitor submitted grades and manage grading window schedules."
        badge={<Settings2 className="text-primary" size={32} />}
        actions={
          <div className="flex items-center gap-4">
            <Tabs 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { id: 'pending', label: 'Finalization Queue' },
                { id: 'resolutions', label: 'Resolution Requests' },
                { id: 'finalization', label: 'Resolution Finalization' }
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="lg:col-span-3 p-6 bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full pointer-events-none"></div>
             <div className="flex justify-between items-start mb-6">
                <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 flex items-center gap-2">
                   <Settings2 size={16} />
                   Grading Window Management
                </h3>
                <div className="flex gap-2 relative z-20">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700" 
                      icon={<FileCheck size={16} />}
                      onClick={handleUpdateDates}
                      loading={loading}
                    >
                        Save Configuration
                    </Button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {/* Midterm Window */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200">MIDTERM WINDOW</span>
                      {gradingDates.midterm_grade_start && gradingDates.midterm_grade_end ? (
                         isWindowOpen(gradingDates.midterm_grade_start, gradingDates.midterm_grade_end) ? (
                            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">OPEN</Badge>
                         ) : (
                            <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">CLOSED</Badge>
                         )
                      ) : (
                         <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">NOT SET</Badge>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Start Date</label>
                         <Input 
                           type="date"
                           value={gradingDates.midterm_grade_start}
                           onChange={(e) => setGradingDates(prev => ({ ...prev, midterm_grade_start: e.target.value }))}
                           className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">End Date</label>
                         <Input 
                           type="date"
                           value={gradingDates.midterm_grade_end}
                           onChange={(e) => setGradingDates(prev => ({ ...prev, midterm_grade_end: e.target.value }))}
                           className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
                         />
                      </div>
                   </div>
                </div>

                {/* Finals Window */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200">FINALS WINDOW</span>
                      {gradingDates.final_grade_start && gradingDates.final_grade_end ? (
                         isWindowOpen(gradingDates.final_grade_start, gradingDates.final_grade_end) ? (
                            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">OPEN</Badge>
                         ) : (
                            <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">CLOSED</Badge>
                         )
                      ) : (
                         <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">NOT SET</Badge>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Start Date</label>
                         <Input 
                           type="date"
                           value={gradingDates.final_grade_start}
                           onChange={(e) => setGradingDates(prev => ({ ...prev, final_grade_start: e.target.value }))}
                           className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">End Date</label>
                         <Input 
                           type="date"
                           value={gradingDates.final_grade_end}
                           onChange={(e) => setGradingDates(prev => ({ ...prev, final_grade_end: e.target.value }))}
                           className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm h-9"
                         />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                   <AlertTriangle size={14} className="text-amber-500" />
                   Term: {activeTerm?.code}
                </div>
             </div>
          </Card>

          <Card className="p-6 bg-blue-600 text-white border-none shadow-xl flex flex-col justify-between overflow-hidden relative">
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
             <div>
                <Layers className="text-blue-100 mb-4" size={32} />
                <h3 className="font-bold text-sm tracking-wider uppercase text-blue-100">Live Roster</h3>
                <p className="text-[10px] text-blue-100 mt-2 leading-tight">
                   Sections currently awaiting grade finalization.
                </p>
             </div>
             <div className="mt-4 pt-4 border-t border-blue-500/50">
                <div className="text-4xl font-black">{pendingSections.length}</div>
                <div className="text-[10px] font-bold uppercase text-blue-200">Active Sections</div>
             </div>
          </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   {activeTab === 'pending' ? <FileCheck className="text-blue-500" /> : 
                    activeTab === 'resolutions' ? <ShieldAlert className="text-amber-500" /> :
                    <FileCheck className="text-green-500" />}
                   <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">
                      {activeTab === 'pending' ? 'Sections Pending Finalization' : 
                       activeTab === 'resolutions' ? 'INC Resolution Initial Requests' :
                       'Final Resolution Approvals'}
                   </h2>
                </div>
                <div className="flex items-center gap-2">
                   <SearchBar 
                     placeholder="Search subjects, sections, or professors..." 
                     onSearch={setSearchTerm}
                   />
                </div>
            </div>
            <Table 
              columns={
                activeTab === 'pending' ? pendingColumns : 
                activeTab === 'resolutions' ? resolutionColumns : 
                finalizationColumns
              }
              data={(() => {
                const data = activeTab === 'pending' ? pendingSections : resolutions;
                if (!searchTerm) return data;
                const searchLower = searchTerm.toLowerCase();
                return data.filter(item => 
                  (item.subject_code?.toLowerCase().includes(searchLower)) ||
                  (item.subject_name?.toLowerCase().includes(searchLower)) ||
                  (item.professor_name?.toLowerCase().includes(searchLower)) ||
                  (item.student_name?.toLowerCase().includes(searchLower)) ||
                  (item.student_idn?.toLowerCase().includes(searchLower))
                );
              })()}
              loading={loading}
              emptyMessage={
                activeTab === 'pending' ? "No sections found with pending grades." : 
                activeTab === 'resolutions' ? "No active resolution requests." :
                "No resolutions awaiting final approval."
              }
            />
          </Card>
      </div>
      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedRes(null);
            setRejectReason('');
        }}
        title="Reject Resolution Request"
      >
        <div className="space-y-4 p-4">
          <p className="text-sm text-slate-500">
            Please provide a reason for rejecting the resolution request for <strong>{selectedRes?.student_name}</strong>.
          </p>
          <Input
            multiline
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ height: '120px' }}
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button 
              variant="danger" 
              onClick={async () => {
                if (!rejectReason) {
                  addToast('warning', 'Please provide a reason.');
                  return;
                }
                try {
                  setLoading(true);
                  await gradesApi.registrarRejectResolution(selectedRes.id, rejectReason);
                  addToast('info', 'Resolution request rejected.');
                  setIsRejectModalOpen(false);
                  fetchInitialData();
                } catch (e) {
                  addToast('error', 'Action failed.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedDetails(null);
        }}
        title="Resolution Details"
      >
        <div className="p-5 space-y-6">
            <div className="flex items-start justify-between">
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student Information</h4>
                   <p className="font-bold text-slate-800 text-lg">{selectedDetails?.student_name}</p>
                   <p className="font-mono text-sm text-slate-500">{selectedDetails?.student_idn}</p>
                </div>
                <Badge variant={selectedDetails?.remaining_days <= 30 ? "danger" : "info"}>
                   {selectedDetails?.remaining_days || 0} Days Left
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</p>
                    <p className="text-sm font-bold text-slate-700">{selectedDetails?.subject_details?.code}</p>
                    <p className="text-xs text-slate-500 truncate">{selectedDetails?.subject_details?.name}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Original Term</p>
                    <p className="text-sm font-bold text-slate-700">{selectedDetails?.term_details?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{selectedDetails?.term_details?.code}</p>
                </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div className="text-xs text-amber-900">
                    <p className="font-bold mb-1 uppercase tracking-tight text-amber-700">Resolution Deadline</p>
                    <p>This INC grade will lapse on <strong>{selectedDetails?.inc_deadline}</strong>.</p>
                    <p className="mt-1 opacity-75 italic">Once lapsed, the grade will automatically convert to a **RETAKE** status if not resolved.</p>
                </div>
            </div>

            <div className="pt-2">
               <Button variant="primary" fullWidth onClick={() => setIsDetailsModalOpen(false)}>Close Overview</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default GradeFinalization;
