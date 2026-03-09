import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  GraduationCap,
  History,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SubjectCrediting = () => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [student, setStudent] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [creditedSubjectIds, setCreditedSubjectIds] = useState([]);
  const [message, setMessage] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    try {
      setSearching(true);
      setStudent(null);
      setMessage(null);
      
      const res = await api.get(`students/students/?search=${searchTerm}`);
      const students = res.data.results || [];
      
      if (students.length === 0) {
        setMessage({ type: 'error', text: 'No student found with that ID or Name.' });
      } else {
        const found = students[0]; // Take the first match
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
      // 1. Get all subjects for student's curriculum
      const subjectsRes = await api.get(`academics/subjects/?curriculum=${foundStudent.curriculum}`);
      setCurriculumSubjects(subjectsRes.data.results || []);
      
      // 2. Get existing credits for this student
      const creditsRes = await api.get(`grades/advising/?student=${foundStudent.id}&is_credited=true`);
      const creditIds = (creditsRes.data.results || []).map(g => g.subject);
      setCreditedSubjectIds(creditIds);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCredit = async (subjectId) => {
    if (creditedSubjectIds.includes(subjectId)) return;
    
    try {
      await api.post('grades/crediting/credit/', {
        student_id: student.id,
        subject_id: subjectId
      });
      setCreditedSubjectIds([...creditedSubjectIds, subjectId]);
    } catch (err) {
      alert("Crediting failed: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subject Crediting</h1>
          <p className="text-slate-500">Credit subjects for transferee students away from the standard term enrollment</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search student by IDN or Full Name..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" isLoading={searching}>Search Student</Button>
        </form>
        
        {message && (
          <div className={`mt-4 p-3 rounded-md flex gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
             <AlertCircle size={18} />
             <span className="text-sm">{message.text}</span>
          </div>
        )}
      </Card>

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info */}
          <Card title="Student Information" className="h-fit">
            <div className="space-y-4">
               <div className="flex items-center gap-4 py-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg text-center">
                    {student.user_details?.first_name[0]}{student.user_details?.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{student.user_details?.first_name} {student.user_details?.last_name}</p>
                    <p className="text-sm text-slate-500">{student.idn}</p>
                  </div>
               </div>
               <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Program</span>
                    <span className="font-medium">{student.program_details?.code}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Curriculum</span>
                    <span className="font-medium italic text-xs">{student.curriculum_details?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Type</span>
                    <Badge variant="info">{student.student_type}</Badge>
                  </div>
               </div>
            </div>
          </Card>

          {/* Subject Checklist */}
          <div className="lg:col-span-2">
            <Card title="Curriculum Checklist">
              {loading ? (
                <div className="flex justify-center py-20"><LoadingSpinner /></div>
              ) : curriculumSubjects.length === 0 ? (
                <div className="py-20 text-center text-slate-500 italic">No subjects found for this curriculum.</div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                  {[1, 2, 3, 4].map(year => {
                    const yearSubjects = curriculumSubjects.filter(s => s.year_level === year);
                    if (yearSubjects.length === 0) return null;
                    
                    return (
                      <div key={year} className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Year {year}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {yearSubjects.map(subject => {
                            const isCredited = creditedSubjectIds.includes(subject.id);
                            return (
                              <div 
                                key={subject.id}
                                className={`p-3 border rounded-lg flex items-center justify-between transition-all ${
                                  isCredited ? 'bg-green-50 border-green-200' : 'hover:border-slate-300'
                                }`}
                              >
                                <div>
                                   <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-slate-800">{subject.code}</p>
                                      <span className="text-[10px] text-slate-400">{subject.units} u</span>
                                   </div>
                                   <p className="text-xs text-slate-600 truncate max-w-[150px]">{subject.name}</p>
                                </div>
                                {isCredited ? (
                                  <div className="text-green-600"><CheckCircle2 size={18} /></div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-[10px]"
                                    onClick={() => handleCredit(subject.id)}
                                  >
                                    Credit
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCrediting;
