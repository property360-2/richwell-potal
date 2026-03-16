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

  const { student, stats, semesters, curriculum_progress } = data;

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
    <div className="summary-grades-container animate-in fade-in duration-500">
      {/* Navigation Header */}
      {!isStudent && (
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/students')}
            icon={<ChevronLeft size={20} />}
            className="hover:translate-x-[-4px] transition-transform"
          >
            Back to Student List
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" icon={<Printer size={18} />} onClick={() => window.print()}>Print Summary</Button>
            <Button variant="primary" icon={<Download size={18} />}>Export TOR</Button>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
           <div>
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Academic Records</h1>
              <p className="text-slate-500 mt-1">View your full grade history and credited subjects.</p>
           </div>
           <Button variant="outline" icon={<Printer size={18} />} onClick={() => window.print()}>Print Records</Button>
        </div>
      )}

      {/* Student Info Card */}
      <div className="student-info-card">
        <div className="student-info-left">
          <div className="student-id-badge">ID: {student.idn}</div>
          <h1>{student.name}</h1>
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <GraduationCap size={20} className="text-primary" />
            <span className="text-lg">{student.program}</span>
          </div>
        </div>
        <div className="student-info-right">
          <div className="info-item">
            <span className="info-label">Year Level</span>
            <span className="info-value">Year {student.year_level}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Reg. Status</span>
            <span className="info-value">{student.status}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Standing</span>
            <span className="info-value text-emerald-600">{student.academic_standing}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-600">
            <Layers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_units_earned}</span>
            <span className="stat-label">Units Earned</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-indigo-50 text-indigo-600">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.current_gpa}</span>
            <span className="stat-label">General GPA</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.subjects_passed}</span>
            <span className="stat-label">Passed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-rose-50 text-rose-600">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.subjects_failed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Grades Table Section */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-1 bg-primary rounded-full"></div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Academic Transcript Summary
            </h2>
        </div>

        {semesters.length > 0 ? semesters.map((sem, index) => (
          <div key={index} className="semester-section">
            <div className="semester-header">
              <div className="semester-title">
                <Calendar size={20} className="text-primary/60" />
                <span>{sem.title}</span>
              </div>
              <div className="semester-summary">
                <div className="summary-pill">Semester Units: <span>{sem.total_units}</span></div>
                <div className="summary-pill">GPA: <span>{sem.gpa}</span></div>
              </div>
            </div>
            <Card className="overflow-hidden border-none shadow-xl rounded-2xl">
              <Table 
                columns={[
                  { header: 'Subject Code', accessor: 'code', className: 'font-bold text-slate-800' },
                  { header: 'Subject Description', accessor: 'subject' },
                  { header: 'Units', accessor: 'units', align: 'center', className: 'font-semibold text-slate-600' },
                  { header: 'Term Taken', accessor: 'term_code', align: 'center', className: 'text-slate-500 italic text-sm' },
                  { header: 'Final Grade', accessor: 'grade', align: 'center', className: 'font-mono font-black text-primary' },
                  { 
                    header: 'Status', 
                    align: 'center',
                    render: (row) => getStatusBadge(row.status_code)
                  }
                ]}
                data={sem.grades}
                border={false}
              />
            </Card>
          </div>
        )) : (
            <Card className="py-12 text-center bg-slate-50 border-dashed">
                <p className="text-slate-400 font-medium">No academic records found for this student.</p>
            </Card>
        )}
      </div>

      {/* Curriculum Progress Section */}
      {curriculum_progress.length > 0 && (
        <div className="curriculum-progress-section shadow-2xl">
            <div className="curriculum-header flex items-center justify-between">
                <div>
                    <h2>Curriculum Progress Tracker</h2>
                    <p className="text-slate-400 mt-1">Real-time completion tracking per year level.</p>
                </div>
                <Award size={48} className="text-primary opacity-20" />
            </div>
            <div className="progress-grid">
                {curriculum_progress.map((p, i) => (
                    <div key={i} className="year-progress bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                            <span className="year-label uppercase tracking-widest text-[10px]">Year Level {p.year}</span>
                            <span className="progress-value">{p.percentage}%</span>
                        </div>
                        <div className="progress-bar-container">
                            <div 
                            className="progress-bar-fill shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]" 
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
