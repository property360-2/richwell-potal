import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  GraduationCap,
  History,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';

import './SubjectCrediting.css';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';

const SubjectCrediting = () => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [student, setStudent] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [creditedSubjectIds, setCreditedSubjectIds] = useState([]);
  const [subjectGrades, setSubjectGrades] = useState({}); // { subjectId: "1.0" }
  const [message, setMessage] = useState(null);
  const { showToast } = useToast();
  
  // Filtering states
  const [yearFilter, setYearFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    try {
      setSearching(true);
      setStudent(null);
      setSubjectGrades({});
      setMessage(null);
      
      const res = await api.get(`students/?search=${searchTerm}`);
      const students = res.data.results || [];
      
      if (students.length === 0) {
        setMessage({ type: 'error', text: 'No student found with that ID or Name.' });
      } else {
        const found = students[0];
        setStudent(found);
        fetchCurriculumAndCredits(found);
      }
    } catch (error) {
       setMessage({ type: 'error', text: 'Search failed.' });
    } finally {
      setSearching(false);
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

      // Map subject ID to final grade
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

  const handleSubmitCredit = async (subjectId) => {
    const grade = subjectGrades[subjectId];
    if (!grade) {
      showToast('error', 'Please enter a grade first.');
      return;
    }

    try {
      setLoading(true);
      await api.post('grades/crediting/credit/', {
        student_id: student.id,
        subject_id: subjectId,
        final_grade: grade
      });
      
      if (!creditedSubjectIds.includes(subjectId)) {
        setCreditedSubjectIds([...creditedSubjectIds, subjectId]);
      }
      showToast('success', 'Subject credited successfully!');
    } catch (err) {
      showToast('error', err.response?.data?.error || "Crediting failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUncredit = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove the credit for this subject?')) return;

    try {
      setLoading(true);
      await api.post('grades/crediting/uncredit/', {
        student_id: student.id,
        subject_id: subjectId
      });
      
      setCreditedSubjectIds(creditedSubjectIds.filter(id => id !== subjectId));
      setSubjectGrades({
        ...subjectGrades,
        [subjectId]: ''
      });
      showToast('success', 'Credit removed successfully.');
    } catch (err) {
      showToast('error', err.response?.data?.error || "Removal failed");
    } finally {
      setLoading(false);
    }
  };


  const handleUnlockAdvising = async () => {
    try {
      setLoading(true);
      await api.post(`students/${student.id}/unlock_advising/`);
      setStudent({ ...student, is_advising_unlocked: true });
      setMessage({ type: 'success', text: 'Advising process unlocked for student successfully!' });
    } catch (err) {
      alert("Unlock failed: " + (err.response?.data?.error || "Unknown error"));
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

  const columns = [
    {
      header: 'Status',
      width: '100px',
      render: (row) => creditedSubjectIds.includes(row.id) ? (
        <Badge variant="success" size="sm">Credited</Badge>
      ) : (
        <Badge variant="neutral" size="sm">Not Credited</Badge>
      )
    },
    { header: 'Code', accessor: 'code', width: '100px' },
    { header: 'Subject Title', accessor: 'description' },
    { 
      header: 'Level/Sem', 
      width: '120px',
      render: (row) => `Y${row.year_level} - S${row.semester}` 
    },
    { 
      header: 'Grade', 
      width: '120px',
      render: (row) => (
        <Input 
          type="number"
          step="0.25"
          placeholder="0.00"
          value={subjectGrades[row.id] || ""}
          onChange={(e) => handleUpdateGrade(row.id, e.target.value)}
          className="text-center font-mono"
        />
      )
    },
    {
      header: 'Action',
      width: '140px',
      align: 'right',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <Button 
            variant={creditedSubjectIds.includes(row.id) ? "ghost" : "primary"}
            size="sm"
            onClick={() => handleSubmitCredit(row.id)}
            className="text-xs"
          >
            {creditedSubjectIds.includes(row.id) ? 'Update' : 'Credit'}
          </Button>
          
          {creditedSubjectIds.includes(row.id) && (
            <Button 
              variant="danger"
              size="sm"
              onClick={() => handleUncredit(row.id)}
              className="px-2"
              title="Remove Credit"
            >
              <RotateCcw size={14} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="subject-crediting-container">
      <PageHeader
        title="Subject Crediting"
        description="Academic history and course equivalency management"
      />

      <Card className="mb-8 p-8 bg-gradient-to-br from-white to-slate-50/50">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end max-w-3xl mx-auto">
          <div className="flex-1 w-full">
            <Input 
              label="Student Identification"
              placeholder="Enter IDN or Student Name..."
              icon={Search}
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
            icon={Search}
          >
            Find Student
          </Button>
        </form>
        
        {message && (
          <div className="max-w-3xl mx-auto">
            <div className={`mt-6 p-4 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2 border ${
              message.type === 'error' 
                ? 'bg-rose-50 text-rose-700 border-rose-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
               {message.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
               <span className="text-sm font-semibold">{message.text}</span>
            </div>
          </div>
        )}
      </Card>

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="student-profile-summary">
              <div className="profile-header-minimal">
                <div className="avatar-minimal">
                  {student.user.first_name[0]}{student.user.last_name[0]}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{student.user.first_name} {student.user.last_name}</h2>
                  <p className="text-slate-500 text-xs font-mono">{student.idn}</p>
                </div>
              </div>
              <div className="profile-details-minimal">
                <div className="min-info-row">
                  <span className="min-label">Program</span>
                  <span className="min-value">{student.program_details?.code}</span>
                </div>
                <div className="min-info-row">
                  <span className="min-label">Type</span>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="ghost">{student.student_type}</Badge>
                    <Badge variant={student.latest_enrollment?.is_regular ? 'info' : 'warning'} size="sm">
                      {student.latest_enrollment?.is_regular ? 'Regular' : 'Irregular'}
                    </Badge>
                  </div>
                </div>
                <div className="min-info-row border-none mt-2">
                  <span className="min-label">Advising</span>
                  <Badge variant={student.is_advising_unlocked ? 'success' : 'warning'} size="sm">
                    {student.is_advising_unlocked ? 'Unlocked' : 'Locked'}
                  </Badge>
                </div>
              </div>
            </div>

            {student.student_type === 'TRANSFEREE' && !student.is_advising_unlocked && (
              <div className="minimal-action-card">
                <GraduationCap className="text-amber-500 mb-2" size={24} />
                <h3 className="font-bold text-slate-800 text-sm">Finish Crediting?</h3>
                <p className="text-slate-500 text-xs mt-1 mb-4">
                  Unlock advising to allow subject selection.
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full"
                  onClick={handleUnlockAdvising}
                  loading={loading}
                >
                  Unlock Advising
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <Card padding="0">
              <div className="table-controls p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Academic Curriculum Checklist</h3>
                <div className="flex gap-3">
                  <Select 
                    size="sm"
                    value={yearFilter} 
                    onChange={(e) => setYearFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'All Years' },
                      { value: '1', label: '1st Year' },
                      { value: '2', label: '2nd Year' },
                      { value: '3', label: '3rd Year' },
                      { value: '4', label: '4th Year' },
                    ]}
                  />
                  <Select 
                    size="sm"
                    value={semesterFilter} 
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'All Semesters' },
                      { value: '1', label: '1st Semester' },
                      { value: '2', label: '2nd Semester' },
                      { value: 'S', label: 'Summer' },
                    ]}
                  />
                </div>
              </div>
              <Table 
                columns={columns} 
                data={filteredSubjects} 
                loading={loading} 
                rowClassName={(row) => creditedSubjectIds.includes(row.id) ? 'row-credited' : ''}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCrediting;



