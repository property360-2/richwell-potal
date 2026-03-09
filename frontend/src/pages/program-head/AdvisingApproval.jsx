import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Search,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

const AdvisingApproval = () => {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('REGULAR'); // REGULAR or IRREGULAR
  const [expandedRows, setExpandedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEnrollments();
  }, [activeTab]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      // We filter by pending advising status and the active tab (regular/irregular)
      const res = await api.get(`students/enrollments/?advising_status=PENDING&is_regular=${activeTab === 'REGULAR'}`);
      setEnrollments(res.data.results || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = async (id) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter(rowId => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
      // If expanding, make sure we have the grade details for this student
      const enrollment = enrollments.find(e => e.id === id);
      if (enrollment && !enrollment.grades) {
         try {
            const gradesRes = await api.get(`grades/advising/?student=${enrollment.student}&term=${enrollment.term}`);
            const updatedEnrollments = enrollments.map(e => 
              e.id === id ? { ...e, grades: gradesRes.data.results } : e
            );
            setEnrollments(updatedEnrollments);
         } catch (err) {
            console.error("Error fetching grades:", err);
         }
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`grades/approvals/${id}/approve/`);
      setEnrollments(enrollments.filter(e => e.id !== id));
    } catch (error) {
      alert(error.response?.data?.error || "Approval failed");
    }
  };

  const handleBatchApproveRegular = async () => {
    if (!window.confirm("Approve all pending regular students?")) return;
    try {
      setLoading(true);
      await api.post('grades/approvals/batch_approve_regular/');
      fetchEnrollments();
    } catch (error) {
      alert("Batch approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) return alert("Please provide a reason");
    try {
      await api.post(`grades/approvals/${selectedEnrollment.id}/reject/`, {
        reason: rejectionReason
      });
      setEnrollments(enrollments.filter(e => e.id !== selectedEnrollment.id));
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      alert("Rejection failed");
    }
  };

  const filteredEnrollments = enrollments.filter(e => 
    e.student_idn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subject Advising Approval</h1>
          <p className="text-slate-500">Review and approve student subject selections</p>
        </div>
        
        {activeTab === 'REGULAR' && enrollments.length > 0 && (
          <Button 
            variant="primary" 
            onClick={handleBatchApproveRegular}
            className="flex items-center gap-2"
          >
            <CheckSquare size={18} /> Approve All Regular
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'REGULAR' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('REGULAR')}
        >
          Regular Students
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'IRREGULAR' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('IRREGULAR')}
        >
          Irregular Students
        </button>
      </div>

      <Card>
        <div className="mb-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by IDN or Name..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><LoadingSpinner /></div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="py-20 text-center text-slate-500 italic">No pending {activeTab.toLowerCase()} enrollments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Program</th>
                  <th className="px-6 py-4">Year Level</th>
                  <th className="px-6 py-4">Commitment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((enrollment) => (
                  <React.Fragment key={enrollment.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                             {enrollment.student_name[0]}
                           </div>
                           <div>
                              <p className="font-semibold text-slate-900">{enrollment.student_name}</p>
                              <p className="text-xs text-slate-500">{enrollment.student_idn}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{enrollment.program_code}</td>
                      <td className="px-6 py-4">
                        <Badge variant="ghost">Year {enrollment.year_level || '?'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        ₱{enrollment.monthly_commitment}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleRow(enrollment.id)}
                          className="text-blue-600"
                        >
                          {expandedRows.includes(enrollment.id) ? 'Collapse' : 'Review'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(enrollment.id)}
                        >
                          <CheckCircle size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedEnrollment(enrollment);
                            setShowRejectModal(true);
                          }}
                        >
                          <XCircle size={18} />
                        </Button>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    {expandedRows.includes(enrollment.id) && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="5" className="px-6 py-4">
                           <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <ClipboardList size={16} className="text-blue-500" />
                                Selected Subjects
                              </h4>
                              {enrollment.grades ? (
                                <table className="w-full text-sm">
                                   <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                                      <tr>
                                         <th className="px-3 py-2">Code</th>
                                         <th className="px-3 py-2">Name</th>
                                         <th className="px-3 py-2">Units</th>
                                         <th className="px-3 py-2">Is Retake</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                      {enrollment.grades.map(grade => (
                                         <tr key={grade.id}>
                                            <td className="px-3 py-2 font-medium">{grade.subject_details.code}</td>
                                            <td className="px-3 py-2 text-slate-600">{grade.subject_details.name}</td>
                                            <td className="px-3 py-2">{grade.subject_details.units}</td>
                                            <td className="px-3 py-2">
                                               {grade.is_retake ? <Badge variant="error" size="sm">Yes</Badge> : 'No'}
                                            </td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                              ) : (
                                <div className="flex justify-center p-4"><LoadingSpinner size="sm" /></div>
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
        title="Reject Advising"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting the subject selection of <strong>{selectedEnrollment?.student_name}</strong>.
          </p>
          <textarea
            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 h-32"
            placeholder="e.g., Missing prerequisites for CS102. Please re-check."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject Advising</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdvisingApproval;
