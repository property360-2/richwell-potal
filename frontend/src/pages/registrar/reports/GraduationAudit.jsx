/**
 * GraduationAudit.jsx
 *
 * Registrar-facing tool for auditing a student's curriculum completion status.
 * Searches for a student, runs the graduation eligibility check against the backend,
 * displays earned vs. required units, lists any missing subjects, and provides a
 * "Confirm Graduation" button that transitions the student to GRADUATED status.
 *
 * Connects to:
 *   - GET  /api/reports/graduation-check/?student_id=<id>
 *   - POST /api/students/<id>/confirm-graduation/
 */

import React, { useState } from 'react';
import { Award, Search, User, CheckCircle, XCircle, ChevronRight, BookOpen, Loader } from 'lucide-react';
import { reportsApi } from '../../../api/reports';
import { studentsApi } from '../../../api/students';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/shared/PageHeader';
import './Reports.css';

const GraduationAudit = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  /** @type {[{is_eligible, total_units_earned, total_units_required, missing_subjects}, Function]} */
  const [auditResult, setAuditResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null); // { type: 'success'|'error', text }

  /**
   * Searches for students by name or IDN and updates the left-panel result list.
   *
   * @param {React.FormEvent} e - Form submit event.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await studentsApi.getStudents({ search: searchQuery });
      setStudents(res.data.results || res.data);
    } catch (e) {
      console.error('Student search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Selects a student and fetches their graduation eligibility from the backend.
   * Resets any previous audit result and confirmation message before querying.
   *
   * @param {Object} student - Student record from the search results list.
   */
  const runAudit = async (student) => {
    setSelectedStudent(student);
    setAuditResult(null);
    setConfirmMessage(null);
    setAuditing(true);
    try {
      const res = await reportsApi.checkGraduation(student.id);
      setAuditResult(res.data);
    } catch (e) {
      console.error('Graduation audit failed:', e);
    } finally {
      setAuditing(false);
    }
  };

  /**
   * Calls the confirm-graduation endpoint to officially set the student's status
   * to GRADUATED. Runs only when the audit result shows is_eligible = true.
   * Shows a success or error message inline on the audit card.
   */
  const handleConfirmGraduation = async () => {
    if (!selectedStudent || !auditResult?.is_eligible) return;
    setConfirming(true);
    setConfirmMessage(null);
    try {
      await studentsApi.confirmGraduation(selectedStudent.id);
      setConfirmMessage({ type: 'success', text: 'Graduation confirmed. Student status updated to GRADUATED.' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to confirm graduation. Please try again.';
      setConfirmMessage({ type: 'error', text: detail });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="reports-page">
      <PageHeader
        title="Graduation Audit"
        description="Verify curriculum completion and eligibility for graduation."
        badge={<div className="header-icon-box bg-purple-50 text-purple-600"><Award /></div>}
      />

      <div className="reports-grid">
        {/* ── Left Panel: Student Search ── */}
        <Card className="search-card">
          <form onSubmit={handleSearch} className="search-form">
            <div className="w-full">
              <Input
                placeholder="Search Student..."
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="whitespace-nowrap shrink-0">Search</Button>
          </form>

          <div className="student-results">
            {students.map(s => (
              <div
                key={s.id}
                className={`student-item ${selectedStudent?.id === s.id ? 'active' : ''}`}
                onClick={() => runAudit(s)}
              >
                <User size={16} />
                <div className="info">
                  <span className="name">{s.user.last_name}, {s.user.first_name}</span>
                  <span className="idn">{s.idn}</span>
                </div>
                <ChevronRight size={16} className="ml-auto opacity-20" />
              </div>
            ))}
          </div>
        </Card>

        {/* ── Right Panel: Audit Result ── */}
        {auditing ? (
          <div className="loading-audit">
            <div className="spinner"></div>
            <p>Auditing curriculum requirements...</p>
          </div>
        ) : auditResult && (
          <Card className="audit-card animate-in zoom-in-95">
            {/* Status + Unit Stats */}
            <div className="audit-summary-box">
              <div className={`status-icon ${auditResult.is_eligible ? 'success' : 'pending'}`}>
                {auditResult.is_eligible ? <CheckCircle size={40} /> : <BookOpen size={40} />}
              </div>
              <h2>{auditResult.is_eligible ? 'Eligible for Graduation' : 'Requirements Pending'}</h2>
              <div className="stats-row">
                <div className="stat">
                  {/* BUG-01 Fix: was auditResult.total_units_earned — now matches backend */}
                  <span className="val">{auditResult.total_units_earned}</span>
                  <span className="lbl">Units Earned</span>
                </div>
                <div className="stat">
                  {/* BUG-01 Fix: was auditResult.total_units_required — now matches backend */}
                  <span className="val">{auditResult.total_units_required}</span>
                  <span className="lbl">Total Required</span>
                </div>
              </div>
            </div>

            {/* Missing Subjects List */}
            <div className="missing-section">
              <h3>{auditResult.is_eligible ? 'Curriculum Cleared' : 'Missing Subjects'}</h3>
              {/* BUG-01 Fix: was auditResult.missing_subjects — now matches backend */}
              {auditResult.missing_subjects.length > 0 ? (
                <div className="missing-list">
                  {auditResult.missing_subjects.map(ms => (
                    <div key={ms.code} className="missing-item">
                      <XCircle size={14} className="text-rose-500" />
                      <span className="code">{ms.code}</span>
                      <span className="name">{ms.name}</span>
                      {/* BUG-01 Fix: was ms.year / ms.semester — backend now returns year_level / semester */}
                      <Badge variant="ghost">Y{ms.year_level} S{ms.semester}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="success-state">
                  <CheckCircle size={16} /> All academic requirements met.
                </div>
              )}
            </div>

            {/* Confirm Graduation — GAP-01: button now wired */}
            {auditResult.is_eligible && (
              <>
                {confirmMessage && (
                  <p className={`text-sm mt-4 text-center ${confirmMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {confirmMessage.text}
                  </p>
                )}
                <Button
                  onClick={handleConfirmGraduation}
                  disabled={confirming || confirmMessage?.type === 'success'}
                  className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 text-lg"
                >
                  {confirming
                    ? <><Loader size={16} className="animate-spin mr-2 inline" /> Confirming...</>
                    : confirmMessage?.type === 'success' ? 'Graduation Confirmed ✓' : 'Confirm Graduation'
                  }
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GraduationAudit;
