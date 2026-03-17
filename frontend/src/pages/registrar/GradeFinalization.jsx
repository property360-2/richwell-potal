import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, CheckCircle, ShieldAlert, FileCheck, Layers, Filter, Lock, Settings2, AlertTriangle, RotateCcw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'resolutions'
  const [loading, setLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [pendingSections, setPendingSections] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockConfirmText, setLockConfirmText] = useState('');
  const [countdown, setCountdown] = useState(0);

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
          grade_status__isnull: 'false' // grades already entered
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
                    pending_count: 0
                };
            }
            grouped[key].pending_count++;
        });
        setPendingSections(Object.values(grouped));
      } else {
        const res = await gradesApi.getGrades({ 
          grade_status: 'INC',
          is_resolution_requested: 'true',
          is_resolution_approved: 'false'
        });
        setResolutions(res.data?.results || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('error', 'Failed to load data.');
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
       header: 'Pending Grades', 
       render: (row) => <Badge variant="info">{row.pending_count} Students</Badge>
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
    { header: 'Subject', render: (row) => row.subject_details?.code },
    { 
        header: 'Reason', 
        render: (row) => <div className="max-w-xs text-xs italic text-slate-600 truncate" title={row.rejection_reason}>{row.rejection_reason || 'No reason provided'}</div> 
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => (
            <Button 
              size="sm" 
              onClick={async () => {
                try {
                  setLoading(true);
                  await gradesApi.registrarApproveResolution(row.id);
                  addToast('info', 'Resolution request has been unlocked for the professor.');
                  fetchInitialData();
                } catch (e) {
                  addToast('error', 'Action failed.');
                } finally {
                  setLoading(false);
                }
              }}
            >
                Approve Request
            </Button>
        )
    }
  ];

  const handleGlobalLock = async () => {
    if (lockConfirmText !== 'CONFIRM') return;
    try {
      setLoading(true);
      const res = await gradesApi.finalizeTerm(activeTerm.id);
      addToast('success', res.data.message || 'Global lock applied successfully.');
      setShowLockModal(false);
      fetchInitialData();
    } catch (e) {
      addToast('error', e.response?.data?.error || 'Failed to apply global lock.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoINC = async (periodType) => {
    if (!window.confirm(`Are you sure you want to mark all unsubmitted ${periodType} grades as INC? This cannot be undone.`)) return;
    try {
      setLoading(true);
      const res = await gradesApi.closeGradingPeriod(activeTerm.id, periodType);
      addToast('success', res.data.message || 'Grading period closed successfully.');
      fetchInitialData();
    } catch (e) {
      addToast('error', e.response?.data?.error || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const startLockCountdown = () => {
    setShowLockModal(true);
    setCountdown(5);
    setLockConfirmText('');
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="grade-finalization-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Grade Management Console"
        description="Term-level grading controls and finalization queue."
        badge={<Settings2 className="text-primary" size={32} />}
        actions={
          <div className="flex items-center gap-4">
            <Tabs 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { id: 'pending', label: 'Finalization Queue' },
                { id: 'resolutions', label: 'Resolution Requests' }
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-white to-blue-50/30 border-blue-100">
             <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Lock size={32} />
             </div>
             <div className="flex-1">
                <h3 className="font-bold text-slate-800">Global Term Finalization</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                   Permanently lock all grades for <strong>{activeTerm?.name}</strong>. This will prevent any further edits by professors or staff. Use ONLY when the term is officially closed.
                </p>
             </div>
             <Button 
               variant="primary" 
               className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
               icon={<Lock size={16} />}
               onClick={startLockCountdown}
             >
                Global Lock
             </Button>
          </Card>

          <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
             <h3 className="font-bold text-sm tracking-wider uppercase text-slate-400 mb-4">Grading Window Actions</h3>
             <div className="space-y-3">
                <Button 
                   variant="ghost" 
                   className="w-full justify-start border border-slate-700 text-slate-300 hover:bg-slate-800"
                   size="sm"
                   icon={<RotateCcw size={16} />}
                   onClick={() => handleAutoINC('MIDTERM')}
                >
                   Close Midterm / Auto-INC
                </Button>
                <Button 
                   variant="ghost" 
                   className="w-full justify-start border border-slate-700 text-slate-300 hover:bg-slate-800"
                   size="sm"
                   icon={<RotateCcw size={16} />}
                   onClick={() => handleAutoINC('FINAL')}
                >
                   Close Finals / Auto-INC
                </Button>
             </div>
             <p className="text-[10px] text-slate-500 mt-4 italic">
                * Closes the window for professors and marks unsubmitted grades as INC.
             </p>
          </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   {activeTab === 'pending' ? <FileCheck className="text-blue-500" /> : <ShieldAlert className="text-amber-500" />}
                   <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">
                      {activeTab === 'pending' ? 'Sections Pending Finalization' : 'INC Resolution Queue'}
                   </h2>
                </div>
                <div className="flex items-center gap-2">
                   <SearchBar 
                     placeholder="Search..." 
                     onSearch={setSearchTerm}
                   />
                </div>
            </div>
            <Table 
              columns={activeTab === 'pending' ? pendingColumns : resolutionColumns}
              data={activeTab === 'pending' ? pendingSections : resolutions}
              loading={loading}
              emptyMessage={activeTab === 'pending' ? "No sections found with pending grades." : "No active resolution requests."}
            />
          </Card>
      </div>

      <Modal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        title="CRITICAL: Global Term Lock"
        maxWidth="max-w-md"
      >
        <div className="p-2">
           <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 mb-6">
              <AlertTriangle className="text-rose-500 shrink-0" size={24} />
              <div>
                 <h4 className="font-bold text-rose-800 text-sm">Experimental Warning</h4>
                 <p className="text-xs text-rose-700 leading-relaxed mt-1">
                    This action will <strong>PERMANENTLY LOCK</strong> all academic records for this term. Professors will no longer be able to submit or edit grades.
                 </p>
              </div>
           </div>

           <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                 Type <span className="text-slate-900 font-mono">CONFIRM</span> to proceed
              </label>
              <Input 
                value={lockConfirmText}
                onChange={(e) => setLockConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className="font-mono"
                disabled={countdown > 0}
              />
           </div>

           <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowLockModal(false)}>Cancel</Button>
              <Button 
                variant="danger" 
                className="flex-[2]" 
                disabled={lockConfirmText !== 'CONFIRM' || countdown > 0}
                loading={loading}
                onClick={handleGlobalLock}
              >
                 {countdown > 0 ? `Unlocking Button in ${countdown}s...` : 'Finalize & Lock Term'}
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default GradeFinalization;
