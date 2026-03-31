import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Award, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  Printer, 
  Download, 
  ChevronLeft,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { reportsApi } from '../../api/reports';
import PageHeader from '../../components/shared/PageHeader';
import './SummaryOfGrades.css';

const SummaryOfGrades = ({ isStudent = false }) => {
  const { studentId: paramId } = useParams();
  const studentId = isStudent ? null : paramId;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [studentId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getAcademicSummary({ student_id: studentId });
      setData(res.data);
    } catch (err) {
      addToast('error', 'Failed to load academic records.');
      if (!isStudent) navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex bg-slate-50 min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
  
  if (!data) return null;
  const { student, stats, semesters = [], curriculum_progress = [] } = data;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASSED': return <Badge variant="success" className="badge-passed px-3 font-semibold">Passed</Badge>;
      case 'FAILED': return <Badge variant="error" className="badge-failed px-3 font-semibold">Failed</Badge>;
      case 'INC': return <Badge variant="warning" className="badge-inc px-3 font-semibold">Incomplete</Badge>;
      case 'DROPPED': return <Badge variant="neutral" className="badge-dropped px-3 font-semibold">Dropped</Badge>;
      case 'NOT_TAKEN': return <Badge variant="ghost" className="text-slate-400 border-slate-200 px-3 font-semibold">Not Taken</Badge>;
      default: return <Badge variant="neutral" className="px-3 font-semibold">{status}</Badge>;
    }
  };

  return (
    <div className="summary-grades-container animate-in fade-in duration-500 pb-12">
      <PageHeader 
        title={isStudent ? "Academic Records" : "Student Summary"}
        description={isStudent 
          ? "Comprehensive view of your full grade history." 
          : "View full academic transcript and curriculum progress."
        }
      />

      {/* Navigation & Actions Header */}
      {!isStudent && (
        <div className="flex items-center justify-between mb-6 mt-4 pb-2 border-b border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/students')}
            icon={<ChevronLeft size={18} />}
            className="text-slate-500 hover:text-slate-900 px-0"
          >
            Back to Student List
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>Print</Button>
            <Button variant="outline" size="sm" icon={<Download size={16} />}>Export</Button>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="flex items-center justify-between mb-6 mt-4 pb-4 border-b border-slate-100">
           <div className="flex-1"></div>
           <Button variant="outline" size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>Print Records</Button>
        </div>
      )}

      {/* Unified Student Header Card */}
      <div className="student-summary-header-card">
        <div className="summary-info-main">
          <div className="flex items-center gap-3">
             <h2 className="student-name-text">{student.name}</h2>
             <span className="idn-badge-mini">{student.idn}</span>
          </div>
          <div className="student-metadata-small">
            <GraduationCap size={14} className="text-primary/60" />
            <span>{student.program}</span>
            <span className="text-slate-300 mx-1">•</span>
            <span>Year {student.year_level}</span>
            <span className="text-slate-300 mx-1">•</span>
            <span className="font-bold text-emerald-600">{student.academic_standing}</span>
          </div>
        </div>
      </div>

      {/* Grades Table Section */}
      <div className="transcript-section">
        <div className="flex items-center gap-3 mb-6">
            <div className="section-indicator"></div>
            <h2 className="section-title-minimal">Academic Transcript</h2>
        </div>

        {semesters.length > 0 ? semesters.map((sem, index) => (
          <div key={index} className="semester-group">
            <div className="semester-sub-header">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary/40" />
                <span className="semester-text-label">{sem.title}</span>
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="text-slate-400 uppercase tracking-tighter">Units: <span className="text-slate-700">{sem.total_units}</span></span>
                <span className="text-slate-400 uppercase tracking-tighter">Term GPA: <span className="text-primary">{sem.gpa}</span></span>
              </div>
            </div>
            
            <div className="clean-table-wrapper shadow-sm">
              <Table 
                columns={[
                  { header: 'Code', accessor: 'code', className: 'font-bold text-slate-800' },
                  { header: 'Subject Title', accessor: 'subject' },
                  { header: 'Units', accessor: 'units', align: 'center', className: 'text-slate-600' },
                  { header: 'Term', accessor: 'term_code', align: 'center', className: 'text-slate-400 italic text-xs' },
                  { header: 'Grade', accessor: 'grade', align: 'center', className: 'font-mono font-black text-primary' },
                  { 
                    header: 'Status', 
                    align: 'center',
                    render: (row) => (
                      <div className="flex flex-col items-center">
                        {getStatusBadge(row.status_code)}
                        {row.resolution_status && (
                          <div className="flex flex-col items-center mt-1.5 pt-1.5 border-t border-slate-50 w-full">
                            <span className={`res-status-tag ${row.resolution_status.toLowerCase()}`}>
                                {row.resolution_status}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }
                ]}
                data={sem.grades}
                border={false}
                compact
              />
            </div>
          </div>
        )) : (
            <Card className="py-12 text-center bg-slate-50 border-dashed">
                <p className="text-slate-400 font-medium">No academic records found for this student.</p>
            </Card>
        )}
      </div>

      {/* Curriculum Progress Section */}
      {curriculum_progress.length > 0 && (
        <div className="curriculum-mini-tracker">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Curriculum Progress</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter mt-1">Percentage completion per year level</p>
                </div>
                <Award size={24} className="text-primary/20" />
            </div>
            <div className="progress-minimal-grid">
                {curriculum_progress.map((p, i) => (
                    <div key={i} className="progress-item-clean">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year {p.year}</span>
                            <span className="text-xs font-bold text-slate-900">{p.percentage}%</span>
                        </div>
                        <div className="progress-track-clean">
                            <div 
                              className="progress-fill-clean" 
                              style={{ width: `${p.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default SummaryOfGrades;
