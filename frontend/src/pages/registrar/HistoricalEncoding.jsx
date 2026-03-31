import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Search, 
  CheckCircle2, 
  FileText, 
  History, 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import api from '../../api/axios';
import { gradesApi } from '../../api/grades';
import { academicsApi } from '../../api/academics';
import { termsApi } from '../../api/terms';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import Modal from '../../components/ui/Modal';

const HistoricalEncoding = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [student, setStudent] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Data State
  const [source, setSource] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [rows, setRows] = useState([
    { id: Date.now(), subject_id: '', grade: '', code: '', description: '' }
  ]);

  useEffect(() => {
    fetchActiveTerm();
  }, []);

  const fetchActiveTerm = async () => {
    try {
      const res = await termsApi.getActiveTerm();
      setActiveTerm(res.data?.results?.[0] || res.data?.[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm) return;
    
    try {
      setSearching(true);
      setStudent(null);
      const res = await api.get(`students/?search=${searchTerm}`);
      const students = res.data.results || [];
      
      if (students.length === 0) {
        addToast('error', 'No student found.');
      } else {
        const found = students[0];
        setStudent(found);
        fetchCurriculum(found.curriculum);
      }
    } catch (error) {
       addToast('error', 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const fetchCurriculum = async (curriculumId) => {
    try {
      const res = await api.get(`academics/subjects/?curriculum=${curriculumId}&page_size=200`);
      setCurriculumSubjects(res.data.results || res.data || []);
    } catch (e) {
      addToast('error', 'Failed to load curriculum subjects.');
    }
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), subject_id: '', grade: '', code: '', description: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    // Clear errors for this row when user makes changes
    setRowErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors[id]) {
        delete newErrors[id][field];
        if (Object.keys(newErrors[id]).length === 0) delete newErrors[id];
      }
      return newErrors;
    });

    setRows(rows.map(row => {
      if (row.id === id) {
        if (field === 'subject_id') {
          const subject = curriculumSubjects.find(s => s.id.toString() === value);
          return { 
            ...row, 
            [field]: value, 
            code: subject?.code || '', 
            description: subject?.description || '' 
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const validate = () => {
    if (!student) return false;
    if (!source) {
      addToast('warning', 'Please provide a source reference (e.g., TOR Doc ID).');
      return false;
    }

    const errors = {};
    const seenSubjects = new Set();
    let hasError = false;

    rows.forEach(row => {
      const rowErrors = {};
      
      // Check for empty fields in active rows
      if (row.subject_id || row.grade) {
        if (!row.subject_id) {
          rowErrors.subject_id = 'Required';
          hasError = true;
        }
        if (!row.grade) {
          rowErrors.grade = 'Required';
          hasError = true;
        } else {
          const gradeNum = parseFloat(row.grade);
          if (isNaN(gradeNum) || gradeNum < 1.0 || gradeNum > 5.0) {
            rowErrors.grade = 'Invalid (1.0-5.0)';
            hasError = true;
          }
        }

        // Duplicate check
        if (row.subject_id) {
          if (seenSubjects.has(row.subject_id)) {
            rowErrors.subject_id = 'Duplicate subject';
            hasError = true;
          }
          seenSubjects.add(row.subject_id);
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[row.id] = rowErrors;
      }
    });

    setRowErrors(errors);

    if (hasError) {
      addToast('error', 'Please correct the errors in the rows below.');
      return false;
    }

    const validRows = rows.filter(r => r.subject_id && r.grade);
    if (validRows.length === 0) {
      addToast('warning', 'Add at least one complete subject record.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    try {
      setLoading(true);
      const payload = rows
        .filter(r => r.subject_id && r.grade)
        .map(r => ({ subject_id: r.subject_id, final_grade: r.grade }));
      
      await gradesApi.bulkHistoricalEncode(student.id, payload, source);
      
      addToast('success', 'Historical records successfully encoded!');
      // Reset
      setRows([{ id: Date.now(), subject_id: '', grade: '', code: '', description: '' }]);
      setSource('');
      setShowSummary(false);
      // Re-search to show updated status
      handleSearch();
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Failed to save historical records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="historical-encoding-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Historical TOR Encoding"
        description="Backfill academic history for legacy or transferee students."
        badge={<History className="text-primary" size={32} />}
      />

      <Card className="mb-8 p-6 bg-gradient-to-br from-white to-slate-50/50">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end max-w-4xl mx-auto">
          <div className="flex-1 w-full">
            <Input 
              label="Find Student"
              placeholder="Search by IDN or Name..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full font-bold"
            />
          </div>
          <Button 
            type="submit" 
            loading={searching} 
            size="lg" 
            className="px-8"
            icon={Search}
          >
            Load Student
          </Button>
        </form>
      </Card>

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
             <Card className="sticky top-6">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {student.user.first_name[0]}{student.user.last_name[0]}
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.user.first_name} {student.user.last_name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{student.idn}</p>
                   </div>
                </div>
                <div className="p-4 space-y-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Current Standing</span>
                      <div className="flex items-center justify-between">
                         <Badge variant="ghost" size="sm" className="text-xs">{student.latest_enrollment?.year_level || 'N/A'} Year</Badge>
                         <Badge variant={student.latest_enrollment?.is_regular ? 'success' : 'warning'} size="sm">
                            {student.latest_enrollment?.is_regular ? 'Regular' : 'Irregular'}
                         </Badge>
                      </div>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Program</span>
                      <p className="text-xs font-semibold text-slate-700">{student.program_details?.code}</p>
                   </div>
                   <div className="pt-4 mt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        Encoded records will strictly bypass the Program Head and Dean review process as they are verified from official physical documents.
                      </p>
                   </div>
                </div>
             </Card>
          </div>

          <div className="lg:col-span-3">
            <Card padding="0">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                 <div className="flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={18} />
                    <h2 className="font-bold text-slate-800 text-sm">ENCODING WORKSPACE</h2>
                 </div>
                 <div className="w-full md:w-64">
                    <Input 
                      placeholder="Source (e.g. TOR #12345)"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      size="sm"
                      className="bg-white"
                    />
                 </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Subject Selection</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-[10px] w-32">Grade</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-[10px] w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className={`border-b border-slate-50 transition-colors ${rowErrors[row.id] ? 'bg-rose-50/20' : 'hover:bg-slate-50/30'}`}>
                        <td className="p-4 align-top">
                          <Select 
                            value={row.subject_id}
                            onChange={(e) => updateRow(row.id, 'subject_id', e.target.value)}
                            error={rowErrors[row.id]?.subject_id}
                            options={[
                              { value: '', label: 'Select Subject...' },
                              ...curriculumSubjects.map(s => ({
                                value: s.id,
                                label: `${s.code} - ${s.description}`
                              }))
                            ]}
                            className="w-full"
                          />
                        </td>
                        <td className="p-4 align-top">
                           <Input 
                              type="number"
                              step="0.25"
                              placeholder="1.0"
                              value={row.grade}
                              error={rowErrors[row.id]?.grade}
                              onChange={(e) => updateRow(row.id, 'grade', e.target.value)}
                              className="font-mono text-center"
                           />
                        </td>
                        <td className="p-4 text-right align-top pt-5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-500 hover:bg-rose-50"
                            onClick={() => removeRow(row.id)}
                            icon={<Trash2 size={16} />}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 flex items-center justify-between bg-slate-50/20">
                <Button 
                   variant="ghost" 
                   icon={<PlusCircle size={20} />}
                   onClick={addRow}
                   className="text-primary hover:bg-primary/5"
                >
                  Add Another Row
                </Button>
                
                <Button 
                   variant="primary" 
                   size="lg" 
                   icon={<ChevronRight size={20} />}
                   className="px-10 shadow-lg shadow-primary/20"
                   onClick={() => setShowSummary(true)}
                >
                   Review & Save
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Summary Confirmation Modal */}
      <Modal 
        isOpen={showSummary} 
        onClose={() => setShowSummary(false)}
        title="Review Historical Records"
        maxWidth="max-w-xl"
      >
         <div className="p-2">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 mb-6">
               <AlertCircle className="text-amber-500 shrink-0" size={20} />
               <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  Review the summary below carefully. These records will be saved as <strong>PASSED</strong> directly into the student's historical transcript.
               </p>
            </div>

            <div className="space-y-3 mb-8">
               {rows.filter(r => r.subject_id && r.grade).map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{row.code}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[250px]">{row.description}</span>
                     </div>
                     <Badge variant={parseFloat(row.grade) <= 3.0 ? 'success' : 'danger'} size="lg" className="font-mono px-3">
                        {parseFloat(row.grade).toFixed(2)}
                     </Badge>
                  </div>
               ))}
            </div>

            <div className="flex gap-4">
               <Button 
                 variant="ghost" 
                 className="flex-1" 
                 onClick={() => setShowSummary(false)}
               >
                  Go Back
               </Button>
               <Button 
                 variant="primary" 
                 className="flex-3" 
                 loading={loading}
                 onClick={handleSubmit}
                 icon={<ShieldCheck size={18} />}
               >
                  Confirm & Finalize Backfill
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default HistoricalEncoding;
