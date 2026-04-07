import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Unlock,
  Filter,
  GraduationCap,
  Save
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/shared/PageHeader';

import './SubjectCrediting.css';

const SubjectCrediting = () => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [creditedSubjectIds, setCreditedSubjectIds] = useState([]);
  const [subjectGrades, setSubjectGrades] = useState({}); // { subjectId: "1.0" }
  
  const [pendingRequest, setPendingRequest] = useState(null);

  const [message, setMessage] = useState(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const { showToast } = useToast();
  
  // Filtering states
  const [yearFilter, setYearFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');

  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    }
  }, [page]);

  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
      // Reset to page 1 for new manual search
      if (page !== 1) {
        setPage(1);
        return; // useEffect will trigger handleSearch again
      }
    }
    
    if (!searchTerm) return;
    
    try {
      setSearching(true);
      setStudent(null);
      setSubjectGrades({});
      setMessage(null);
      setPendingRequest(null);
      
      const res = await api.get(`students/?search=${searchTerm}&page=${page}`);
      const students = res.data.results || res.data || [];
      setStudentResults(students);
      setTotalCount(res.data.count || students.length);
      setTotalPages(res.data.count ? Math.ceil(res.data.count / 20) : 1);
      
      if (students.length === 0) {
        setMessage({ type: 'error', text: 'No student found with that ID or Name.' });
      } else if (students.length === 1 && page === 1) {
        // Auto-select if only one result on page 1
        const found = students[0];
        setStudent(found);
        fetchCurriculumAndCredits(found);
        fetchPendingRequest(found);
      }
    } catch (error) {
       setMessage({ type: 'error', text: 'Search failed.' });
    } finally {
      setSearching(false);
    }
  };

  const fetchPendingRequest = async (foundStudent) => {
    try {
      const res = await api.get(`grades/crediting-requests/?student_id=${foundStudent.id}`);
      const requests = res.data.results || res.data || [];
      const pending = requests.find(r => r.status === 'PENDING');
      if (pending) {
        setPendingRequest(pending);
      } else {
        setPendingRequest(null);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  const fetchCurriculumAndCredits = async (foundStudent) => {
    try {
      setLoading(true);
      const subjectsRes = await api.get(`academics/subjects/?curriculum=${foundStudent.curriculum}&page_size=100`);
      setCurriculumSubjects(subjectsRes.data.results || subjectsRes.data || []);
      
      const creditsRes = await api.get(`grades/advising/?student=${foundStudent.id}&is_credited=true`);
      const results = creditsRes.data.results || creditsRes.data || [];
      
      const creditIds = results.map(g => g.subject);
      setCreditedSubjectIds(creditIds);

      // Map subject ID to final grade for already credited ones
      const gradesMap = {};
      results.forEach(g => {
        gradesMap[g.subject] = g.final_grade || "";
      });
      setSubjectGrades(gradesMap);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrade = (subjectId, value) => {
    setSubjectGrades({
      ...subjectGrades,
      [subjectId]: value
    });
  };

  const handleBulkSubmit = async () => {
    // Collect all subjects that have grades inputted but are NOT already credited
    const itemsToCredit = [];
    Object.keys(subjectGrades).forEach(subjectId => {
      const numId = parseInt(subjectId, 10);
      const grade = subjectGrades[subjectId];
      if (grade && grade.trim() !== "" && !creditedSubjectIds.includes(numId)) {
        itemsToCredit.push({
          subject_id: numId,
          final_grade: grade
        });
      }
    });

    if (itemsToCredit.length === 0) {
      showToast('error', 'Please enter at least one new grade to submit.');
      setIsSubmitModalOpen(false);
      return;
    }

    try {
      setLoading(true);
      await api.post('grades/crediting-requests/submit_bulk/', {
        student_id: student.id,
        items: itemsToCredit
      });
      
      showToast('success', 'Bulk crediting request submitted successfully!');
      setIsSubmitModalOpen(false);
      fetchPendingRequest(student);
    } catch (err) {
      showToast('error', err.response?.data?.error || err.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAdvising = async () => {
    try {
      setLoading(true);
      await api.post(`students/${student.id}/unlock-advising/`);
      setStudent({ ...student, is_advising_unlocked: true });
      setIsUnlockModalOpen(false);
      showToast('success', 'Advising process unlocked successfully!');
    } catch (err) {
      showToast('error', "Unlock failed: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    return curriculumSubjects.filter(subject => {
      const matchYear = yearFilter === 'ALL' || subject.year_level.toString() === yearFilter;
      const matchSem = semesterFilter === 'ALL' || subject.semester === semesterFilter;
      return matchYear && matchSem;
    });
  }, [curriculumSubjects, yearFilter, semesterFilter]);

  const groupedSubjects = useMemo(() => {
    const groups = {};
    filteredSubjects.forEach(subject => {
      const year = subject.year_level;
      const sem = subject.semester;
      const key = `${year}-${sem}`;
      
      if (!groups[key]) {
        const semesterLabel = sem === '1' ? 'First Semester' : sem === '2' ? 'Second Semester' : 'Summer Term';
        groups[key] = {
          title: `Year ${year} - ${semesterLabel}`,
          subjects: [],
          year,
          sem
        };
      }
      groups[key].subjects.push(subject);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const semOrder = { '1': 1, '2': 2, 'S': 3 };
      return semOrder[a.sem] - semOrder[b.sem];
    });
  }, [filteredSubjects]);

  const columns = [
    {
      header: 'Status',
      width: '120px',
      render: (row) => creditedSubjectIds.includes(row.id) ? (
        <Badge variant="success" size="sm">Credited</Badge>
      ) : (
        <Badge variant="neutral" size="sm">Pending</Badge>
      )
    },
    { header: 'Code', accessor: 'code', width: '100px' },
    { header: 'Subject Title', accessor: 'description' },
    { 
      header: 'Grade to Credit', 
      width: '150px',
      render: (row) => (
        <div className="flex justify-center items-center">
        <input 
          type="number"
          step="0.25"
          placeholder="0.00"
          value={subjectGrades[row.id] || ""}
          onChange={(e) => handleUpdateGrade(row.id, e.target.value)}
          disabled={creditedSubjectIds.includes(row.id) || pendingRequest}
          className={`inline-grade-input font-mono ${creditedSubjectIds.includes(row.id) ? 'bg-slate-50 text-slate-400 border-slate-200' : ''}`}
        />
        </div>
      )
    }
  ];

  return (
    <div className="subject-crediting-container pb-12">
      <PageHeader
        title="Subject Crediting"
        description="Simplify academic history and course equivalency"
      />

      {/* Global Search Bar */}
      <Card className="mb-6 p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end max-w-4xl mx-auto">
          <div className="flex-1 w-full">
            <Input 
              label="Student Lookup"
              placeholder="Enter IDN or Student Name..."
              icon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button 
            type="submit" 
            loading={searching} 
            size="lg" 
            className="px-8 min-w-[160px]"
          >
            Find
          </Button>
        </form>
        
        {message && (
          <div className="max-w-4xl mx-auto mt-4">
            <div className={`p-4 rounded-lg flex gap-3 border ${
              message.type === 'error' 
                ? 'bg-rose-50 text-rose-700 border-rose-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
               {message.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
               <span className="text-sm font-semibold">{message.text}</span>
            </div>
          </div>
        )}

        {studentResults.length > 1 && !student && (
          <div className="max-w-4xl mx-auto mt-6">
            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Search Results ({totalCount})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {studentResults.map(s => (
                <div 
                  key={s.id} 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => {
                    setStudent(s);
                    fetchCurriculumAndCredits(s);
                    fetchPendingRequest(s);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 group-hover:text-primary-600 tracking-tight">
                      {s.user.first_name} {s.user.last_name}
                    </span>
                    <span className="text-xs font-mono text-slate-500 uppercase">{s.idn} • {s.program_details?.code}</span>
                  </div>
                  <Badge variant="neutral" size="sm">Select</Badge>
                </div>
              ))}
            </div>
            
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

      {student && (
        <>
          {/* Unified Student Header Card */}
          <div className="student-header-card">
            <div className="student-info-minimal">
              <h2 className="student-name-main">{student.user.first_name} {student.user.last_name}</h2>
              <div className="student-meta-sub">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{student.idn}</span>
                <span className="text-slate-400">•</span>
                <span className="font-medium text-slate-700">{student.program_details?.code}</span>
                <span className="text-slate-400">•</span>
                <Badge variant={student.is_advising_unlocked ? 'success' : 'warning'} size="sm">
                  Advising {student.is_advising_unlocked ? 'Unlocked' : 'Locked'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {!student.is_advising_unlocked && (
                <Button 
                  variant="primary" 
                  size="md" 
                  className="gap-2"
                  onClick={() => setIsUnlockModalOpen(true)}
                  icon={Unlock}
                >
                  Unlock Advising Flow
                </Button>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="filter-label-inline">View Options:</span>
            </div>
            <div className="w-40">
              <Select 
                size="sm"
                value={yearFilter} 
                onChange={(e) => setYearFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Year Levels' },
                  { value: '1', label: '1st Year' },
                  { value: '2', label: '2nd Year' },
                  { value: '3', label: '3rd Year' },
                  { value: '4', label: '4th Year' },
                ]}
              />
            </div>
            <div className="w-44">
              <Select 
                size="sm"
                value={semesterFilter} 
                onChange={(e) => setSemesterFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Semesters' },
                  { value: '1', label: 'First Semester' },
                  { value: '2', label: 'Second Semester' },
                  { value: 'S', label: 'Summer Term' },
                ]}
              />
            </div>
            <div className="ml-auto">
              {!pendingRequest && (
                <Button 
                  variant="primary" 
                  icon={Save} 
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  disabled={Object.keys(subjectGrades).filter(k => subjectGrades[k] && !creditedSubjectIds.includes(parseInt(k))).length === 0}
                >
                  Submit Bulk Request
                </Button>
              )}
              {pendingRequest && (
                <div className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-1.5 rounded-md border border-warning-100">
                  <AlertCircle size={14} />
                  <span className="font-medium text-xs">Request Pending</span>
                </div>
              )}
            </div>
          </div>

          {groupedSubjects.map((group) => (
            <div key={group.title} className="subject-group-section mb-8">
              <div className="subject-group-header">
                <GraduationCap size={18} className="text-primary-600" />
                <h3>{group.title}</h3>
                <Badge variant="neutral" size="sm" className="ml-auto">
                  {group.subjects.length} Subjects
                </Badge>
              </div>
              <Card padding="0" className="overflow-hidden">
                <Table 
                  columns={columns} 
                  data={group.subjects} 
                  loading={loading} 
                  rowClassName={(row) => creditedSubjectIds.includes(row.id) ? 'row-credited' : ''}
                />
              </Card>
            </div>
          ))}

          {groupedSubjects.length === 0 && !loading && (
            <Card className="text-center py-12">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <AlertCircle size={48} strokeWidth={1} />
                <p>No subjects found for the selected filters.</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Confirmation Modal for Crediting */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Crediting Request"
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleBulkSubmit} loading={loading}>Submit for Approval</Button>
          </div>
        )}
      >
        <div className="confirmation-content">
          <div className="confirmation-icon-wrapper">
             <Save size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Bulk Submission</h3>
          <p className="text-slate-600 text-sm">
            Are you sure you want to submit these grades for crediting? The Program Head will need to review and approve this request before the subjects are officially encoded to this student's transcript.
          </p>
        </div>
      </Modal>

      {/* Confirmation Modal for Unlock */}
      <Modal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        title="Confirm Advising Unlock"
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsUnlockModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUnlockAdvising} loading={loading}>Confirm Unlock</Button>
          </div>
        )}
      >
        <div className="confirmation-content">
          <div className="confirmation-icon-wrapper">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Unlock Enrollment Flow?</h3>
          <p className="text-slate-600 text-sm">
            This will allow <strong>{student?.user.first_name} {student?.user.last_name}</strong> and their assigned academic advisor to proceed with subject selection and enrollment. 
            <br/><br/>
            Please ensure all transferable subjects have been correctly credited before proceeding.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SubjectCrediting;

