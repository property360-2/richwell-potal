import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Search,
  CheckSquare,
  ClipboardList
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/shared/SearchBar';
import EmptyState from '../../components/shared/EmptyState';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import { format } from 'date-fns';

/**
 * Program Head interface for reviewing bulk subject crediting requests
 * initiated by the Registrar. Allows for expanding the request to see
 * individual subjects and grades, and approving/rejecting the entire request.
 */
const CreditingRequests = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('grades/crediting-requests/?status=PENDING');
      setRequests(res.data.results || res.data || []);
    } catch (error) {
      console.error("Error fetching crediting requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter(rowId => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure you want to approve this crediting request? The subjects will be permanently credited.")) return;
    try {
      await api.post(`grades/crediting-requests/${id}/approve/`);
      setRequests(requests.filter(r => r.id !== id));
    } catch (error) {
      alert(error.response?.data?.error || "Approval failed");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) return alert("Please provide a reason for rejection");
    try {
      await api.post(`grades/crediting-requests/${selectedRequest.id}/reject/`, {
        comment: rejectionReason
      });
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      alert("Rejection failed");
    }
  };

  const filteredRequests = requests.filter(r => 
    r.student_idn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="crediting-requests-container pb-8">
      <PageHeader 
        title="Subject Crediting Approvals"
        description="Review and approve transferee subject crediting requests"
      />

      <Card>
        <div className="mb-4 max-w-md">
            <SearchBar 
                placeholder="Search by IDN or Name..." 
                onSearch={setSearchTerm} 
            />
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState 
            title="No Pending Requests"
            message={`No pending subject crediting requests found.`}
            icon={<CheckSquare size={48} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">Student</th>
                  <th className="px-6 py-4 border-b border-slate-200">Date Requested</th>
                  <th className="px-6 py-4 border-b border-slate-200">Requested By</th>
                  <th className="px-6 py-4 border-b border-slate-200">Subjects</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                             {request.student_name ? request.student_name[0] : '?'}
                           </div>
                           <div>
                              <p className="font-medium text-slate-800">{request.student_name}</p>
                              <p className="text-sm text-slate-500">{request.student_idn}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.created_at ? format(new Date(request.created_at), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.requested_by_name || 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{request.items?.length || 0} items</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleRow(request.id)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            {expandedRows.includes(request.id) ? 'Collapse' : 'Review'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(request.id)}
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    {expandedRows.includes(request.id) && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="5" className="px-6 py-6 border-b border-slate-200">
                           <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm ml-11">
                              <h4 className="font-semibold text-sm mb-4 flex items-center gap-2 text-slate-700">
                                <ClipboardList size={16} className="text-blue-500" />
                                Subjects to be Credited
                              </h4>
                              {request.items && request.items.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                   <thead className="text-slate-500 border-b border-slate-200">
                                      <tr>
                                         <th className="pb-2 font-medium">Code</th>
                                         <th className="pb-2 font-medium">Title</th>
                                         <th className="pb-2 font-medium">Units</th>
                                         <th className="pb-2 font-medium">Grade</th>
                                      </tr>
                                   </thead>
                                    <tbody className="divide-y divide-slate-100">
                                       {request.items.map(item => (
                                          <tr key={item.id}>
                                             <td className="py-2.5 font-medium text-slate-800">{item.subject_code}</td>
                                             <td className="py-2.5 text-slate-600">{item.subject_title}</td>
                                             <td className="py-2.5 text-slate-600">{item.units}</td>
                                             <td className="py-2.5">
                                                <Badge variant="success" size="sm">{item.final_grade}</Badge>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                </table>
                              ) : (
                                <p className="text-sm text-slate-500">No subjects found in this request.</p>
                              )}
                              
                              {request.comment && (
                                <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-700 border border-slate-200">
                                   <span className="font-medium">Registrar Comment:</span> {request.comment}
                                </div>
                              )}
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Crediting Request"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting the subject crediting request for <strong>{selectedRequest?.student_name}</strong>.
          </p>
          <Input
            multiline
            style={{ height: '120px' }}
            placeholder="e.g., The transcript provided is incomplete."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditingRequests;
