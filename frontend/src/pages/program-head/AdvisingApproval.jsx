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
  Square,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import SearchBar from '../../components/shared/SearchBar';
import EmptyState from '../../components/shared/EmptyState';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import './AdvisingApproval.css';


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
    e.student_idn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="advising-approval-container">
      <PageHeader 
        title="Subject Advising Approval"
        description="Review and approve student subject selections"
        actions={
          activeTab === 'REGULAR' && enrollments.length > 0 && (
            <Button 
              variant="primary" 
              onClick={handleBatchApproveRegular}
              icon={<CheckSquare size={18} />}
            >
              Approve All Regular
            </Button>
          )
        }
      />

      <Tabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: 'REGULAR', label: 'Regular Students', icon: Users },
          { id: 'IRREGULAR', label: 'Irregular Students', icon: Filter }
        ]}
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
        ) : filteredEnrollments.length === 0 ? (
          <EmptyState 
            title="No Pending Enrollments"
            message={`No pending ${activeTab.toLowerCase()} enrollments found.`}
            icon={<CheckSquare size={48} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Program</th>
                  <th className="px-6 py-4">Year Level</th>
                  <th className="px-6 py-4">Monthly Commitment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((enrollment) => (
                  <React.Fragment key={enrollment.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="student-info">
                           <div className="student-avatar">
                             {enrollment.student_name ? enrollment.student_name[0] : '?'}
                           </div>
                           <div>
                              <p className="student-name">{enrollment.student_name}</p>
                              <p className="student-idn">{enrollment.student_idn}</p>
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
                      <td className="px-6 py-4 text-right">
                        <div className="actions-cell">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleRow(enrollment.id)}
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {expandedRows.includes(enrollment.id) ? 'Collapse' : 'Review'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(enrollment.id)}
                          >
                            <CheckCircle size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setShowRejectModal(true);
                            }}
                          >
                            <XCircle size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    {expandedRows.includes(enrollment.id) && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="5" className="px-6 py-4">
                           <div className="expanded-row-content">
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <ClipboardList size={16} className="text-blue-500" />
                                Selected Subjects
                              </h4>
                              {enrollment.grades ? (
                                <>
                                  <table className="inner-table">
                                     <thead>
                                        <tr>
                                           <th>Code</th>
                                           <th>Name</th>
                                           <th>Units</th>
                                           <th>Is Retake</th>
                                        </tr>
                                     </thead>
                                      <tbody>
                                         {enrollment.grades.filter(g => !g.is_credited).map(grade => (
                                            <tr key={grade.id}>
                                               <td className="font-medium">{grade.subject_details?.code || grade.subject_code}</td>
                                               <td className="text-slate-600">{grade.subject_details?.description || grade.subject_details?.name}</td>
                                               <td>{grade.subject_details?.total_units || grade.subject_details?.units}</td>
                                               <td>
                                                  {grade.is_retake ? <Badge variant="error" size="sm">Yes</Badge> : 'No'}
                                               </td>
                                            </tr>
                                         ))}
                                      </tbody>
                                  </table>
                                  <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-sm">
                                     <span className="text-sm font-medium text-slate-600">Total Units for this Term:</span>
                                     <span className={`text-lg font-bold ${
                                       enrollment.grades.filter(g => !g.is_credited).reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0) > 30 
                                       ? 'text-red-600' : 'text-blue-600'
                                     }`}>
                                       {enrollment.grades.filter(g => !g.is_credited).reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0)}
                                     </span>
                                  </div>
                                </>
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                                  <LoadingSpinner size="sm" />
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
        title="Reject Advising"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting the subject selection of <strong>{selectedEnrollment?.student_name}</strong>.
          </p>
          <Input
            multiline
            style={{ height: '120px' }}
            placeholder="e.g., Missing prerequisites for CS102. Please re-check."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject Advising</Button>
          </div>
        </div>
      </Modal>
    </div>
  );

};

export default AdvisingApproval;
