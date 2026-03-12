import React, { useState } from 'react';
import { Award, Search, User, CheckCircle, XCircle, ChevronRight, BookOpen } from 'lucide-react';
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
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await studentsApi.getStudents({ search: searchQuery });
      setStudents(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async (student) => {
    setSelectedStudent(student);
    setAuditing(true);
    try {
      const res = await reportsApi.checkGraduation(student.id);
      setAuditResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditing(false);
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

        {auditing ? (
          <div className="loading-audit">
            <div className="spinner"></div>
            <p>Auditing curriculum requirements...</p>
          </div>
        ) : auditResult && (
          <Card className="audit-card animate-in zoom-in-95">
             <div className="audit-summary-box">
                <div className={`status-icon ${auditResult.is_eligible ? 'success' : 'pending'}`}>
                   {auditResult.is_eligible ? <CheckCircle size={40} /> : <BookOpen size={40} />}
                </div>
                <h2>{auditResult.is_eligible ? 'Eligible for Graduation' : 'Requirements Pending'}</h2>
                <div className="stats-row">
                   <div className="stat">
                      <span className="val">{auditResult.total_units_earned}</span>
                      <span className="lbl">Units Earned</span>
                   </div>
                   <div className="stat">
                      <span className="val">{auditResult.total_units_required}</span>
                      <span className="lbl">Total Required</span>
                   </div>
                </div>
             </div>

             <div className="missing-section">
                <h3>{auditResult.is_eligible ? 'Curriculum Cleared' : 'Missing Subjects'}</h3>
                {auditResult.missing_subjects.length > 0 ? (
                  <div className="missing-list">
                     {auditResult.missing_subjects.map(ms => (
                       <div key={ms.code} className="missing-item">
                          <XCircle size={14} className="text-rose-500" />
                          <span className="code">{ms.code}</span>
                          <span className="name">{ms.name}</span>
                          <Badge variant="ghost">Y{ms.year} S{ms.semester}</Badge>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="success-state">
                     <CheckCircle size={16} /> All academic requirements met.
                  </div>
                )}
             </div>

             {auditResult.is_eligible && (
               <Button className="w-full mt-6 bg-slate-900 hover:bg-black text-white py-4 text-lg">
                  Confirm Graduation
               </Button>
             )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GraduationAudit;
