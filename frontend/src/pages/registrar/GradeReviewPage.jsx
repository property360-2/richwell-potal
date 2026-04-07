/**
 * Richwell Portal — Grade Review Page
 * 
 * This page allows the Registrar to review student grades for a specific section and subject.
 * It supports server-side pagination and search to efficiently handle large rosters and
 * provides the interface to finalize and lock grades for the selected class.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Layers, FileText, User, Hash } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { gradesApi } from '../../api/grades';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';

/**
 * GradeReviewPage Component
 * 
 * Renders a detailed roster of students and their grades for a given subject/section.
 * Includes search capabilities and allows the registrar to lock the grades.
 */
const GradeReviewPage = () => {
  const { termId, sectionId, subjectId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State for data and navigation
  const [loading, setLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [roster, setRoster] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [meta, setMeta] = useState({
    sectionName: 'Loading...',
    subjectName: 'Loading...',
    subjectCode: '...',
    professorName: '...'
  });

  /**
   * Fetches the student roster from the server with current search and pagination filters.
   */
  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getSectionStudents(sectionId, subjectId, {
        page,
        search: searchTerm
      });
      
      const data = res.data;
      const students = data.results || data || [];
      setRoster(students);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || students.length);

      if (students.length > 0) {
        const first = students[0];
        setMeta({
          sectionName: first.section_details?.name || `Section ${sectionId}`,
          subjectName: first.subject_details?.name || 'Subject',
          subjectCode: first.subject_details?.code || '',
          professorName: first.professor_name || 'TBA'
        });
      }
    } catch (error) {
      console.error('Failed to load grade roster.', error);
      showToast('error', 'Failed to load grade roster');
    } finally {
      setLoading(false);
    }
  }, [sectionId, subjectId, page, searchTerm, showToast]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  /**
   * Triggers the finalization process for the entire section/subject roster.
   * This locks the grades and prevents further professor edits.
   */
  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize these grades? This action is permanent and will lock the grades for this section.')) {
        return;
    }
    
    try {
      setIsFinalizing(true);
      await gradesApi.finalizeSection({
        term: termId,
        subject: subjectId,
        section: sectionId
      });
      showToast('success', 'Grades finalized successfully!');
      navigate('/registrar/grades');
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Finalization failed.');
    } finally {
      setIsFinalizing(false);
    }
  };

  /**
   * Column definitions for the roster table.
   */
  const columns = [
    { 
      header: 'ID Number', 
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <User size={18} />
          </div>
          <span className="font-mono text-sm text-slate-600 uppercase tracking-tight">{r.student_idn}</span>
        </div>
      )
    },
    { 
      header: 'Name', 
      render: (r) => (
        <span className="font-bold text-slate-900 text-sm">{r.student_name}</span>
      )
    },
    { 
      header: 'Midterm', 
      align: 'center',
      render: (r) => (
        <span className={`font-mono font-bold ${r.midterm_grade ? 'text-slate-900' : 'text-slate-300'}`}>
          {r.midterm_grade || '--'}
        </span>
      )
    },
    { 
      header: 'Final', 
      align: 'center',
      render: (r) => (
        <span className={`font-mono font-bold ${r.final_grade ? 'text-primary' : 'text-slate-300'}`}>
          {r.final_grade || '--'}
        </span>
      )
    },
    { 
      header: 'Status', 
      render: (r) => {
        const status = r.grade_status;
        const variant = status === 'PASSED' ? 'success' : 
                        status === 'FAILED' ? 'danger' : 
                        status === 'INC' ? 'warning' : 'neutral';
        return <Badge variant={variant}>{r.grade_status_display}</Badge>;
      }
    }
  ];

  if (loading && roster.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          icon={<ChevronLeft size={18} />} 
          onClick={() => navigate('/registrar/grades')}
        >
          Back to Dashboard
        </Button>
      </div>

      <PageHeader
        title={`${meta.subjectCode}: ${meta.subjectName}`}
        description={
          <div className="flex flex-col gap-1">
            <div className="text-slate-500">
              Final review of student grades for <span className="font-bold text-slate-700">{meta.sectionName}</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
               <User size={14} />
               <span>Professor: {meta.professorName}</span>
            </div>
          </div>
        }
        badge={<div className="p-3 bg-primary/10 text-primary rounded-xl"><FileText size={24} /></div>}
        actions={
          <div className="flex gap-3">
            <Button 
                variant="primary" 
                size="lg" 
                icon={<Layers size={20} />} 
                loading={isFinalizing}
                onClick={handleFinalize}
                className="shadow-lg shadow-primary/20"
            >
                Finalize All Grades
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
            <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Hash size={14} className="text-slate-400" />
                  Student Grade Roster
                </h3>
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  {totalCount} Total Students
                </div>
              </div>
              <div className="flex items-center gap-4">
                <SearchBar 
                  placeholder="Search by name or IDN..."
                  onSearch={(val) => {
                    setSearchTerm(val);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <Table 
              columns={columns}
              data={roster}
              loading={loading}
              emptyMessage={searchTerm ? "No students match your search criteria." : "This roster is currently empty."}
            />
            
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Page {page} of {totalPages}
                </div>
                <Pagination 
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Review Summary" className="border-none shadow-xl shadow-slate-200/50">
            <div className="space-y-4">
               <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-emerald-800 font-bold flex items-center gap-2 mb-1">
                     <CheckCircle size={16} />
                     Ready for Finalization
                  </div>
                  <p className="text-xs text-emerald-600 leading-relaxed text-pretty">
                    All students in this section have submitted grades. Please verify the accuracy before locking.
                  </p>
               </div>

               <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                    <span className="text-slate-500">Section</span>
                    <span className="font-bold text-slate-800">{meta.sectionName}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                    <span className="text-slate-500">Subject Code</span>
                    <span className="font-bold text-slate-800">{meta.subjectCode}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-slate-500">Total Enrolled</span>
                    <span className="font-bold text-slate-800">{totalCount}</span>
                  </div>
               </div>
            </div>
          </Card>

          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
             <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
               <Layers size={20} />
             </div>
             <div>
               <h4 className="text-sm font-bold text-amber-900 mb-1">Permanent Action</h4>
               <p className="text-xs text-amber-700 leading-relaxed">
                 Once finalized, grades for this section and subject cannot be changed by the professor. 
                 Only official Resolution Requests can unlock them.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeReviewPage;
