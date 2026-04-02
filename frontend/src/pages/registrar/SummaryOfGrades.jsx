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
  CheckCircle,
  FileText
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

/**
 * SummaryOfGrades Component
 * 
 * Provides a comprehensive view of a student's academic history.
 * Supports both registrar view (for specific student) and student self-view.
 */
const SummaryOfGrades = ({ isStudent = false }) => {
  const { studentId: paramId } = useParams();
  const studentId = isStudent ? '' : paramId; // Use empty string instead of null to avoid 'null' query param
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
      // If studentId is empty, the backend will auto-detect from token (for students)
      const params = studentId ? { student_id: studentId } : {};
      const res = await reportsApi.getAcademicSummary(params);
      setData(res.data);
    } catch (err) {
      addToast('error', 'Failed to load academic records.');
      if (!isStudent) navigate('/registrar/students');
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
  const { student, semesters = [], curriculum_progress = [] } = data;

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

  // Group semesters by year level for cleaner hierarchy
  const years = [...new Set(semesters.map(s => s.year_level))].sort();

  return (
    <div className="summary-grades-container animate-in fade-in duration-500 pb-12">
      <PageHeader 
        title={isStudent ? `Academic Records` : `Student Summary: ${student?.name}`}
        description={isStudent 
          ? "Your comprehensive academic transcript and curriculum completion status." 
          : "Detailed view of student grades and program progress."
        }
      />

      {/* Navigation & Header Card */}
      <div className="student-summary-header-card mt-6">
        <div className="summary-info-main">
          <div className="flex items-center gap-3">
             <h2 className="student-name-text">{student?.name}</h2>
             <span className="idn-badge-mini">{student?.idn}</span>
          </div>
          <div className="student-metadata-small">
            <GraduationCap size={14} className="text-primary/60" />
            <span>{student?.program}</span>
            <span className="text-slate-300 mx-1">•</span>
            <span className="font-bold text-emerald-600">{student?.academic_standing}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            icon={<Printer size={16} />} 
            onClick={() => window.print()}
            className="bg-white"
          >
            Print Record
          </Button>
          {!isStudent && (
            <Button variant="outline" size="sm" icon={<Download size={16} />} className="bg-white">Export</Button>
          )}
        </div>
      </div>

      {/* Transcripts by Year */}
      <div className="transcript-section">
        {years.length > 0 ? years.map(year => (
          <div key={year} className="year-group mb-12">
             <div className="flex items-center gap-3 mb-6">
                <div className="section-indicator h-6 w-1 bg-primary/20 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{year}</h2>
             </div>

             {semesters.filter(s => s.year_level === year).map((sem, sIdx) => (
               <div key={sIdx} className="semester-block mb-8 last:mb-0">
                 <div className="semester-sub-header mb-3 flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{sem.title}</span>
                 </div>

                 <div className="clean-table-wrapper rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                   <Table 
                     columns={[
                       { header: 'Code', accessor: 'code', className: 'font-bold text-slate-700 w-[120px]' },
                       { header: 'Subject Title', accessor: 'subject', className: 'text-slate-600' },
                       { header: 'Units', accessor: 'units', align: 'center', className: 'text-slate-500 w-[80px]' },
                       { header: 'Grade', accessor: 'grade', align: 'center', className: 'font-mono font-black text-primary w-[100px]' },
                       { 
                         header: 'Status', 
                         align: 'center',
                         className: 'w-[140px]',
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
             ))}
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <BookOpen size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No academic records found for this student.</p>
          </div>
        )}
      </div>

      {/* Progress Cards */}
      {curriculum_progress?.length > 0 && (
        <div className="curriculum-mini-tracker mt-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Award size={20} />
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Curriculum Progress</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {curriculum_progress.map((p, i) => (
              <div key={i} className="progress-card">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year {p.year}</span>
                  <span className="text-xs font-bold text-slate-900">{p.percentage}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out" 
                    style={{ width: `${p.percentage}%` }}
                  />
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
