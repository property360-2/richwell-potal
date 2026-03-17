import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { gradesApi } from '../../api/grades';
import { useToast } from '../../components/ui/Toast';
import { ClipboardCheck, History, UserCheck, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const ProfessorResolutions = () => {
  const { addToast } = useToast();
  const [resolutions, setResolutions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolution modal state
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resGrade, setResGrade] = useState(null);
  const [resReason, setResReason] = useState('');

  // Submission modal (for APPROVED status)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState('');

  useEffect(() => {
    fetchResolutions();
  }, []);

  const fetchResolutions = async () => {
    try {
      setLoading(true);
      // Fetching all INC grades for this professor.
      const res = await gradesApi.getGrades({ grade_status: 'INC' });
      const data = res.data.results || res.data;
      setResolutions(data);
    } catch (error) {
      addToast('error', 'Failed to load resolutions.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResolution = async () => {
    if (!resGrade || !resReason.trim()) return;
    try {
        setLoading(true);
        await gradesApi.requestResolution(resGrade.id, resReason);
        addToast('success', 'Resolution request submitted.');
        setIsResModalOpen(false);
        fetchResolutions();
    } catch (error) {
        addToast('error', error.response?.data?.error || 'Failed to submit request.');
    } finally {
        setLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!resGrade || !selectedGrade) return;
    try {
        setLoading(true);
        await gradesApi.submitResolvedGrade(resGrade.id, selectedGrade);
        addToast('success', 'Grade submitted for final approval.');
        setIsSubmitModalOpen(false);
        setSelectedGrade('');
        fetchResolutions();
    } catch (error) {
        addToast('error', error.response?.data?.error || 'Failed to submit grade.');
    } finally {
        setLoading(false);
    }
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const target = new Date(deadline);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const columns = [
    { header: 'Student', render: (row) => (
        <div>
            <div className="font-bold text-slate-800">{row.student_name}</div>
            <div className="text-[10px] font-mono text-slate-400">{row.student_idn}</div>
        </div>
    )},
    { header: 'Subject', render: (row) => row.subject_details?.code },
    { 
        header: 'Status', 
        render: (row) => (
            <div className="flex flex-col gap-1">
                <Badge variant={
                    row.resolution_status === 'COMPLETED' ? 'success' :
                    row.resolution_status === 'APPROVED' ? 'info' :
                    row.resolution_status === 'SUBMITTED' ? 'primary' : 'neutral'
                }>
                    {row.resolution_status || 'PENDING REQUEST'}
                </Badge>
            </div>
        )
    },
    {
        header: 'Days Remaining',
        render: (row) => {
            const days = getDaysRemaining(row.inc_deadline);
            if (days === null) return <span className="text-slate-300 text-[10px] italic">No deadline</span>;
            
            return (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <Badge variant={days < 0 ? 'dark' : days < 30 ? 'danger' : days < 90 ? 'warning' : 'neutral'}>
                            {days < 0 ? 'LAPSED' : `${days} Days`}
                        </Badge>
                    </div>
                    {row.inc_deadline && (
                        <span className="text-[9px] text-slate-400 mt-1 font-mono">{row.inc_deadline}</span>
                    )}
                </div>
            );
        }
    },
    {
        header: 'Approval Chain',
        render: (row) => (
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${row.resolution_requested_by_name ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <History size={12} />
                    </div>
                    <span className="text-[7px] mt-1 text-slate-400 font-bold uppercase">Requested</span>
                </div>
                <div className="h-px w-4 bg-slate-200"></div>
                <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${row.resolution_approved_by_name ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <UserCheck size={12} />
                    </div>
                    <span className="text-[7px] mt-1 text-slate-400 font-bold uppercase">Approved</span>
                </div>
                <div className="h-px w-4 bg-slate-200"></div>
                <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${row.resolution_status === 'COMPLETED' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <ClipboardCheck size={12} />
                    </div>
                    <span className="text-[7px] mt-1 text-slate-400 font-bold uppercase">Finalized</span>
                </div>
                {row.resolution_approved_by_name && (
                    <div className="ml-2 pl-2 border-l border-slate-100">
                        <div className="text-[8px] text-emerald-600 font-black italic">Verified by:</div>
                        <div className="text-[10px] text-slate-500 font-bold">{row.resolution_approved_by_name}</div>
                    </div>
                )}
            </div>
        )
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => {
            if (!row.resolution_status) {
                return (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary text-[10px] font-bold"
                        onClick={() => {
                            setResGrade(row);
                            setResReason('');
                            setIsResModalOpen(true);
                        }}
                    >
                        Resolve INC
                    </Button>
                );
            }
            if (row.resolution_status === 'APPROVED') {
                return (
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="text-[10px] font-bold"
                        onClick={() => {
                            setResGrade(row);
                            setSelectedGrade('');
                            setIsSubmitModalOpen(true);
                        }}
                        icon={<CheckCircle size={14} />}
                    >
                        Submit Grade
                    </Button>
                );
            }
            return <div className="text-[10px] text-slate-400 font-bold italic pr-2">Tracking Flow</div>;
        }
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">INC Resolution Tracking</h1>
          <p className="text-slate-500 mt-1">Monitor the approval flow and finalize grades for incomplete marks.</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Clock size={20} className="text-primary opacity-40" />
                <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase leading-none">Active Resolutions</div>
                    <div className="text-xl font-black text-slate-700 leading-none mt-1">{resolutions.length}</div>
                </div>
            </div>
        </div>
      </div>

      <Card>
        <Table 
          columns={columns}
          data={resolutions}
          loading={loading}
          emptyMessage="No grade resolutions found."
        />
      </Card>

      {/* Resolution Request Modal */}
      <Modal 
        isOpen={isResModalOpen} 
        onClose={() => setIsResModalOpen(false)}
        title="Request Grade Resolution"
      >
        <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Student</div>
                <div className="font-bold text-slate-700">{resGrade?.student_name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">{resGrade?.subject_details?.code} - {resGrade?.subject_details?.description}</div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Reason for Resolution</label>
                <textarea 
                    className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                    placeholder="e.g., Student submitted missing requirements, completed special project, etc."
                    value={resReason}
                    onChange={(e) => setResReason(e.target.value)}
                />
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-tight">
                    This request will be sent to the Registrar for initial approval. Once approved, you can enter the final grade in your Grade Entry module.
                </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsResModalOpen(false)} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleRequestResolution} 
                    disabled={loading || !resReason.trim()}
                >
                    Submit Request
                </Button>
            </div>
        </div>
      </Modal>
      
      {/* Grade Submission Modal (Phase 2) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Resolved Grade"
      >
        <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <div className="text-[10px] text-blue-400 font-bold uppercase">Subject</div>
                <div className="font-bold text-blue-700">{resGrade?.subject_details?.code} - {resGrade?.subject_details?.name}</div>
                <div className="text-[10px] text-blue-500 font-mono mt-1">Student: {resGrade?.student_name}</div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Input Final Grade</label>
                <select 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                >
                    <option value="">-- Select Grade --</option>
                    {[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0].map(val => (
                        <option key={val} value={val}>{val.toFixed(2)}</option>
                    ))}
                </select>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-3">
                <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-tight">
                    By submitting, this grade will be sent to the Program Head for final verification before updating the student's records permanently.
                </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsSubmitModalOpen(false)} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleGradeSubmission} 
                    disabled={loading || !selectedGrade}
                >
                    Finalize & Submit
                </Button>
            </div>
        </div>
      </Modal>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
         <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">1. Request Phase</h4>
            <p className="text-[11px] text-blue-600 leading-relaxed">
                Professor submits a request for resolution. Registrar verifies the student's eligibility and locks.
            </p>
         </div>
         <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2">2. Submission Phase</h4>
            <p className="text-[11px] text-emerald-600 leading-relaxed">
                Once approved, the Professor can input the final grade in the Grade Entry module.
            </p>
         </div>
         <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">3. Finalization</h4>
            <p className="text-[11px] text-amber-600 leading-relaxed">
                The Program Head or Dean performs the final review to close the INC record permanently.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ProfessorResolutions;
