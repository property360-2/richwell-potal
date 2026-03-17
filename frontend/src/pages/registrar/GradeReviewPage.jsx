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

const GradeReviewPage = () => {
  const { termId, sectionId, subjectId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [roster, setRoster] = useState([]);
  const [meta, setMeta] = useState({
    sectionName: 'Loading...',
    subjectName: 'Loading...',
    subjectCode: '...'
  });

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getGrades({ 
        term: termId,
        section: sectionId,
        subject: subjectId
      });
      
      const students = res.data?.results || res.data || [];
      setRoster(students);

      if (students.length > 0) {
        const first = students[0];
        setMeta({
          sectionName: first.section_details?.name || `Section ${sectionId}`,
          subjectName: first.subject_details?.name || 'Subject',
          subjectCode: first.subject_details?.code || ''
        });
      }
    } catch (error) {
      showToast('error', 'Failed to load grade roster');
    } finally {
      setLoading(false);
    }
  }, [termId, sectionId, subjectId, showToast]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

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

  const columns = [
    { 
      header: 'Student', 
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User size={14} />
          </div>
          <div>
            <div className="font-bold text-slate-900">{r.student_name}</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{r.student_idn}</div>
          </div>
        </div>
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
        description={`Final review of student grades for ${meta.sectionName}`}
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
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Hash size={14} className="text-slate-400" />
                Student Grade Roster
              </h3>
              <Badge variant="info">{roster.length} Students</Badge>
            </div>
            <Table 
              columns={columns}
              data={roster}
              loading={loading}
            />
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
                    <span className="font-bold text-slate-800">{roster.length}</span>
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
