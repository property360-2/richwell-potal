import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, UserCheck, MessageSquare } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/shared/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { gradesApi } from '../../api/grades';
import Pagination from '../../components/ui/Pagination';
import './ResolutionApproval.css';

/**
 * ResolutionApproval Component (Program Head)
 * 
 * This component allows Program Heads to review and approve or reject grade resolution requests
 * submitted by instructors (e.g., changing INC to a numeric grade).
 * 
 * Features:
 * - Server-side pagination and search
 * - Grade approval with automated status updates
 * - Grade rejection with feedback mechanism (modal)
 */
const ResolutionApproval = () => {
  const { addToast } = useToast();
  
  // State for data and loading
  const [pendingResolutions, setPendingResolutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // State for rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch data when page or search term changes (with debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPendingResolutions();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm]);

  /**
   * Fetches pending grade resolutions from the API.
   * Standardizes response format for paginated and non-paginated results.
   */
  const fetchPendingResolutions = async () => {
    try {
      setLoading(true);
      // Fetch grades with SUBMITTED status (pending Head approval)
      const res = await gradesApi.getGrades({ 
        resolution_status: 'SUBMITTED',
        search: searchTerm,
        page: page
      });
      
      if (res.data.results) {
        setPendingResolutions(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20)); // Assume default page size of 20
      } else {
        setPendingResolutions(res.data);
        setTotalPages(1);
      }
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Failed to load resolution queue.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approves a grade resolution request.
   * @param {number} id - The ID of the grade record to approve.
   */
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

  /**
   * Rejects a grade resolution request with a mandatory reason.
   */
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

  // Table column configuration
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
      header: 'Proposed Upgrade',
      render: (row) => (
        <div className="flex items-center gap-2">
            <Badge variant="success" className="text-lg px-3 py-1 font-bold">{Number(row.resolution_new_grade || 0).toFixed(2)}</Badge>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-tight">
               Previously<br/>INC
            </div>
        </div>
      )
    },
    {
      header: 'Requested By',
      render: (row) => (
        <div className="text-xs">
           <div className="font-semibold text-slate-700">{row.professor_name || 'Professor'}</div>
           <div className="text-slate-400">Instructor</div>
        </div>
      )
    },
    {
      header: 'Reason',
      render: (row) => <div className="max-w-xs text-xs italic text-slate-500 line-clamp-2" title={row.resolution_reason}>{row.resolution_reason || 'No reason provided'}</div>
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
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1); // Reset to page 1 for new search
                    }}
                  />
                </div>
              </div>
              
              <Table 
                columns={columns}
                data={pendingResolutions}
                loading={loading}
                emptyMessage="No grade resolutions currently pending your approval."
              />

              {/* Pagination Section */}
              {totalPages > 1 && (
                <div className="pagination-wrapper mt-4 pt-4 border-t border-slate-100 p-4">
                  <Pagination 
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
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
