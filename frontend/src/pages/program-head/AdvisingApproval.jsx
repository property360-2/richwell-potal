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
  ArrowRight,
  Edit2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import './AdvisingApproval.css';


const AdvisingApproval = () => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEnrollments();
  }, [activeTab, page]);

  // Reset page when search or tab changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      // We filter by pending advising status and the active tab (regular/irregular)
      const res = await api.get(`students/enrollments/?advising_status=PENDING&is_regular=${activeTab === 'REGULAR'}&search=${searchTerm}&page=${page}`);

      if (res.data.results) {
        setEnrollments(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setEnrollments(res.data);
        setTotalPages(1);
      }
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

  const handleOverrideUnits = async () => {
    try {
      const res = await api.post(`grades/approvals/${selectedForOverride.id}/override_max_units/`, {
        max_units: overrideUnits
      });
      
      // Update local state
      setEnrollments(enrollments.map(e => 
        e.id === selectedForOverride.id ? { ...e, max_units_override: overrideUnits } : e
      ));
      
      setShowOverrideModal(false);
      alert("Max units updated successfully");
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update units");
    }
  };

  const enrollmentsList = enrollments || [];


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
        ) : enrollmentsList.length === 0 ? (
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
                {enrollmentsList.map((enrollment) => (
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
                              {activeTab === 'IRREGULAR' && enrollment.regularity_reason && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                  <AlertCircle className="text-amber-600 mt-0.5" size={18} />
                                  <div>
                                    <p className="text-sm font-semibold text-amber-900">Irregularity Status</p>
                                    <p className="text-sm text-amber-800">{enrollment.regularity_reason}</p>
                                  </div>
                                </div>
                              )}

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
                                  <div className="mt-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg flex-1 flex justify-between items-center shadow-sm">
                                       <span className="text-sm font-medium text-slate-600">Total Units for this Term:</span>
                                       <span className={`text-lg font-bold ${
                                         enrollment.grades.filter(g => !g.is_credited).reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0) > (enrollment.max_units_override || 30) 
                                         ? 'text-red-600' : 'text-blue-600'
                                       }`}>
                                         {enrollment.grades.filter(g => !g.is_credited).reduce((sum, g) => sum + (g.subject_details?.total_units || 0), 0)}
                                       </span>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex-1 flex justify-between items-center shadow-sm">
                                       <div className="flex flex-col">
                                          <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Unit Limit</span>
                                          <span className="text-sm font-bold text-slate-700">
                                            {enrollment.max_units_override || 30} Max Units
                                          </span>
                                       </div>
                                       <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          icon={<Edit2 size={14} />}
                                          onClick={() => {
                                            setSelectedForOverride(enrollment);
                                            setOverrideUnits(enrollment.max_units_override || 30);
                                            setShowOverrideModal(true);
                                          }}
                                       >
                                          Adjust
                                       </Button>
                                    </div>
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
            
            {totalPages > 1 && (
              <div className="pagination-wrapper mt-6 pt-4 border-t border-slate-100">
                <Pagination 
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
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

      {/* Unit Override Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Adjust Maximum Unit Limit"
      >
        <div className="flex flex-col gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
             <p className="text-sm text-blue-800 leading-relaxed">
               Allowing <strong>{selectedForOverride?.student_name}</strong> to exceed the standard unit limit. 
               This applies only to the current term.
             </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">New Unit Limit (1 - 36)</label>
            <Input
              type="number"
              min="1"
              max="36"
              value={overrideUnits}
              onChange={(e) => setOverrideUnits(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleOverrideUnits}
              disabled={overrideUnits < 1 || overrideUnits > 36}
            >
              Update Limit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

};

export default AdvisingApproval;
