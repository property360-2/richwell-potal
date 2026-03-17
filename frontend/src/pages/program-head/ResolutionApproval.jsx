import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, UserCheck, MessageSquare } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { gradesApi } from '../../api/grades';
import PageHeader from '../../components/shared/PageHeader';
import './ResolutionApproval.css';

const ResolutionApproval = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingResolutions, setPendingResolutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingResolutions();
  }, []);

  const fetchPendingResolutions = async () => {
    try {
      setLoading(true);
      // Fetch grades with SUBMITTED status (pending Head approval)
      const res = await gradesApi.getGrades({ 
        resolution_status: 'SUBMITTED'
      });
      setPendingResolutions(res.data.results || res.data);
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Failed to load resolution queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      await gradesApi.headApproveResolution(id);
      addToast('success', 'Grade resolution approved.');
      fetchPendingResolutions();
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      addToast('warning', 'Please provide a reason for rejection.');
      return;
    }
    try {
      setLoading(true);
      await gradesApi.headRejectResolution(selectedRes.id, rejectReason);
      addToast('info', 'Grade resolution rejected.');
      setIsRejectModalOpen(false);
      setSelectedRes(null);
      setRejectReason('');
      fetchPendingResolutions();
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Rejection failed.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      render: (row) => (
        <div className="py-1">
          <div className="font-bold text-slate-900">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono uppercase">{row.student_idn}</div>
        </div>
      )
    },
    {
      header: 'Subject & Section',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-700">{row.subject_details?.code}</div>
          <div className="text-xs text-slate-400">{row.section_details?.name}</div>
        </div>
      )
    },
    {
      header: 'New Grade',
      render: (row) => (
        <div className="flex items-center gap-2">
            <Badge variant="success" className="text-lg px-3 py-1">{row.final_grade?.toFixed(2)}</Badge>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Previously INC</div>
        </div>
      )
    },
    {
      header: 'Requested Reason',
      render: (row) => <div className="max-w-xs text-xs italic text-slate-500 line-clamp-2">{row.rejection_reason || 'N/A'}</div>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-danger hover:bg-danger/10"
              onClick={() => {
                setSelectedRes(row);
                setIsRejectModalOpen(true);
              }}
              icon={<XCircle size={16} />}
            >
                Reject
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => handleApprove(row.id)}
              icon={<CheckCircle size={16} />}
            >
                Approve
            </Button>
        </div>
      )
    }
  ];

  const filtered = pendingResolutions.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student_idn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="resolution-head-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Resolution Approval Queue"
        description="Review and give final approval for resolved Incomplete (INC) grades."
        badge={<UserCheck className="text-primary" size={32} />}
      />

      <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Decisions</span>
               </div>
               <div className="max-w-xs w-full">
                  <Input 
                    placeholder="Search by student..." 
                    size="sm" 
                    icon={<Search size={16} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
            <Table 
              columns={columns}
              data={filtered}
              loading={loading}
              emptyMessage="No grade resolutions currently pending your approval."
            />
          </Card>
      </div>

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                 <h3 className="text-xl font-bold text-slate-900 border-b pb-4 mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-danger" />
                    Reject Resolution
                 </h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Explain why the resolved grade for <strong>{selectedRes?.student_name}</strong> is being rejected. The professor will need to re-submit.
                 </p>
                 
                 <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Comment / Reason</label>
                        <Input 
                           multiline
                           style={{ height: '112px' }}
                           placeholder="Provide specific feedback..."
                           value={rejectReason}
                           onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                    <Button variant="ghost" onClick={() => {
                        setIsRejectModalOpen(false);
                        setSelectedRes(null);
                        setRejectReason('');
                    }}>Cancel</Button>
                    <Button 
                       variant="danger"
                       onClick={handleReject}
                    >
                        Confirm Rejection
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default ResolutionApproval;
