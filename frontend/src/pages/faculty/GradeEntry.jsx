import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Save, AlertCircle, CheckCircle2, MoreHorizontal } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { gradesApi } from '../../api/grades';
import './GradeEntry.css';

const GradeEntry = () => {
  const { addToast } = useToast();
  const [sections, setSections] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // ID of student being saved
  const [searchTerm, setSearchTerm] = useState('');

  // Resolution modal state
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resGrade, setResGrade] = useState(null);
  const [resReason, setResReason] = useState('');

  useEffect(() => {
    fetchMySections();
  }, []);

  const fetchMySections = async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getProfessorSections();
      setSections(res.data);
    } catch (error) {
      addToast('error', 'Failed to load assigned sections.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPair = async (pair) => {
    setSelectedPair(pair);
    try {
      setLoading(true);
      const res = await gradesApi.getSectionStudents(pair.section.id, pair.subject.id);
      setStudents(res.data.results || res.data);
    } catch (error) {
      addToast('error', 'Failed to load student roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeUpdate = async (gradeId, type, value, isInc = false) => {
    try {
      setSaving(gradeId);
      if (type === 'midterm') {
        await gradesApi.submitMidterm(gradeId, value);
      } else {
        await gradesApi.submitFinal(gradeId, value, isInc);
      }
      addToast('success', 'Grade updated successfully.');
      // Refresh roster
      handleSelectPair(selectedPair);
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Failed to update grade.');
    } finally {
      setSaving(null);
    }
  };

  const getGradeValue = (val) => val === null || val === undefined ? '' : val;

  const columns = [
    {
      header: 'Student',
      render: (row) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono uppercase">{row.student_idn}</div>
        </div>
      )
    },
    {
      header: 'Midterm',
      render: (row) => (
        <div className="flex items-center gap-2">
            <input 
              type="number" 
              step="0.25" 
              min="1.0" 
              max="5.0"
              className="grade-input"
              defaultValue={getGradeValue(row.midterm_grade)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val !== row.midterm_grade) {
                    handleGradeUpdate(row.id, 'midterm', val);
                }
              }}
              disabled={row.grade_status !== 'ENROLLED' && row.grade_status !== 'ADVISING'}
            />
        </div>
      )
    },
    {
      header: 'Final Grade',
      render: (row) => (
        <div className="flex items-center gap-2">
             <select 
                className="grade-select"
                defaultValue={row.grade_status === 'INC' ? 'INC' : row.grade_status === 'NO_GRADE' ? 'NG' : getGradeValue(row.final_grade)}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'INC') {
                        handleGradeUpdate(row.id, 'final', null, true);
                    } else if (val === 'NG') {
                        handleGradeUpdate(row.id, 'final', null, false);
                    } else {
                        handleGradeUpdate(row.id, 'final', parseFloat(val), false);
                    }
                }}
                disabled={row.grade_status !== 'ENROLLED' && row.grade_status !== 'ADVISING'}
            >
                <option value="">--</option>
                {[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0].map(v => (
                    <option key={v} value={v}>{v.toFixed(2)}</option>
                ))}
                <option value="INC">INC</option>
                <option value="NG">NG</option>
             </select>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={
            row.grade_status === 'PASSED' ? 'success' : 
            row.grade_status === 'FAILED' ? 'danger' : 
            row.grade_status === 'INC' ? 'warning' : 'info'
        }>
          {row.grade_status_display}
        </Badge>
      )
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => (
            row.grade_status === 'INC' && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary text-xs"
                    onClick={() => {
                        setResGrade(row);
                        setIsResModalOpen(true);
                    }}
                >
                    Resolve INC
                </Button>
            )
        )
    }
  ];

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_idn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grade-entry-container p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Section List */}
        <div className="lg:w-1/3 xl:w-1/4 space-y-4">
          <Card className="sticky top-6">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-primary" />
                Your Assigned Loads
              </h2>
            </div>
            <div className="p-2 space-y-1 overflow-auto max-h-[calc(100vh-200px)]">
              {sections.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPair(pair)}
                  className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                    selectedPair === pair 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="font-bold truncate">{pair.subject.code}</div>
                    <div className={`text-xs ${selectedPair === pair ? 'text-white/80' : 'text-slate-400'} truncate`}>
                      {pair.section.name}
                    </div>
                  </div>
                  <ChevronRight size={16} className={`group-hover:translate-x-1 transition-transform ${selectedPair === pair ? 'text-white' : 'text-slate-300'}`} />
                </button>
              ))}
              {sections.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  No subjects assigned for this term.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Main: Roster & Entry */}
        <div className="flex-1 space-y-6">
          {selectedPair ? (
            <>
              <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <div>
                  <Badge variant="primary" className="mb-2">ACTIVE ROSTER</Badge>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {selectedPair.subject.name}
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{selectedPair.subject.code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-700">{selectedPair.section.name}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrollment</div>
                   <div className="text-3xl font-black text-primary leading-none">{students.length}</div>
                </div>
              </div>

              <Card>
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="max-w-xs w-full">
                    <Input 
                      placeholder="Search students..." 
                      icon={<Search size={18} />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <AlertCircle size={14} />
                    Auto-saves on change
                  </div>
                </div>
                <Table 
                   columns={columns}
                   data={filteredStudents}
                   loading={loading}
                />
              </Card>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center group">
               <div className="p-6 bg-slate-50 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                 <MoreHorizontal size={40} className="text-slate-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-800">No Section Selected</h3>
               <p className="text-slate-500 mt-2 max-w-sm">
                 Please select one of your assigned loads from the sidebar to start entering grades for your students.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Modal (Mock/Simplified for now) */}
      {isResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 border-b pb-4 mb-4">Request Grade Resolution</h3>
              <p className="text-sm text-slate-500 mb-6">
                Request to resolve the <strong>Incomplete (INC)</strong> grade for <strong>{resGrade?.student_name}</strong>.
              </p>
              
              <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Reason for Resolution</label>
                   <textarea 
                     className="w-full rounded-xl border-slate-200 h-24 p-3 focus:ring-primary focus:border-primary text-sm shadow-inner bg-slate-50"
                     placeholder="e.g., Student completed missing requirements (Project X submitted on Mar 10)"
                     value={resReason}
                     onChange={(e) => setResReason(e.target.value)}
                   />
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <Button variant="ghost" onClick={() => setIsResModalOpen(false)}>Cancel</Button>
                <Button 
                   onClick={async () => {
                     try {
                        await gradesApi.requestResolution(resGrade.id, resReason);
                        addToast('success', 'Resolution request submitted.');
                        setIsResModalOpen(false);
                        handleSelectPair(selectedPair);
                     } catch (e) {
                        addToast('error', 'Failed to submit request.');
                     }
                   }}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GradeEntry;
