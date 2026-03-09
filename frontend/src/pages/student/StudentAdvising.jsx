import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const StudentAdvising = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [isRegular, setIsRegular] = useState(true);
  
  // For irregular selection
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Get active term
      const termRes = await api.get('terms/?is_active=true');
      const term = termRes.data.results[0];
      setActiveTerm(term);

      if (term) {
        // 2. Check enrollment for this term
        const enrollmentRes = await api.get(`students/enrollments/me/?term=${term.id}`);
        const enrollData = enrollmentRes.data;
        
        if (enrollData) {
          setEnrolled(true);
          setEnrollment(enrollData);
          setIsRegular(enrollData.is_regular);
          
          // 3. Get existing advising grades if any
          const gradesRes = await api.get(`grades/advising/?term=${term.id}`);
          setGrades(gradesRes.data.results || []);
          
          // 4. If irregular and no advising yet, fetch available subjects
          if (!enrollData.is_regular && (!gradesRes.data.results || gradesRes.data.results.length === 0)) {
             const subjectsRes = await api.get(`academics/subjects/?semester=${term.semester_type}`);
             setAvailableSubjects(subjectsRes.data.results || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching advising data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAdvise = async () => {
    try {
      setLoading(true);
      const res = await api.post('grades/advising/auto_advise/');
      setGrades(res.data);
      // Re-fetch to get full details if needed
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.error || "Auto-advising failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdvise = async () => {
    try {
      setLoading(true);
      const res = await api.post('grades/advising/manual_advise/', {
        subject_ids: selectedSubjectIds
      });
      setGrades(res.data);
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.error || "Manual advising failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (id) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(sid => sid !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  const calculateTotalUnits = () => {
    if (grades.length > 0) {
      return grades.reduce((sum, g) => sum + (g.subject_details?.units || 0), 0);
    }
    
    // For selection phase
    const selected = availableSubjects.filter(s => selectedSubjectIds.includes(s.id));
    return selected.reduce((sum, s) => sum + s.units, 0);
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  if (!enrolled) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Enrollment Required</h2>
        <p className="text-slate-600 mt-2">You must enroll for the current term before you can proceed to subject advising.</p>
        <Button className="mt-6" onClick={() => window.location.href = '/student'}>Go to Dashboard</Button>
      </div>
    );
  }

  const advisingStatus = enrollment?.advising_status;
  const hasAdvising = grades.length > 0;
  const totalUnits = calculateTotalUnits();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subject Advising</h1>
          <p className="text-slate-500">Pick your subjects for {activeTerm?.code} ({activeTerm?.semester_type_display})</p>
        </div>
        
        {advisingStatus && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Status:</span>
            <Badge 
              variant={
                advisingStatus === 'APPROVED' ? 'success' : 
                advisingStatus === 'REJECTED' ? 'error' : 'warning'
              }
            >
              {advisingStatus}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Selection/List Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* If already submitted / approved */}
          {hasAdvising ? (
            <Card title="Your Advising Subjects">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Units</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map(grade => (
                      <tr key={grade.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{grade.subject_details?.code}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {grade.subject_details?.name}
                          {grade.is_retake && <Badge variant="error" className="ml-2">Retake</Badge>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{grade.subject_details?.units}</td>
                        <td className="px-4 py-3">
                           <Badge variant={grade.grade_status === 'ENROLLED' ? 'info' : 'warning'}>
                             {grade.grade_status}
                           </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {advisingStatus === 'REJECTED' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700">
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Reason for Rejection:</p>
                    <p className="text-sm">{grades[0]?.rejection_reason || "No specific reason provided."}</p>
                    <Button 
                      variant="ghost" 
                      className="mt-2 text-xs h-8"
                      onClick={() => setGrades([])}
                    >
                      Reset and Re-select
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            /* Not yet advised */
            isRegular ? (
              <Card className="text-center py-10">
                <ClipboardList size={48} className="mx-auto text-blue-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Ready for Auto-Advising</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                  As a regular student, your curriculum subjects will be automatically selected based on your current year level.
                </p>
                <Button 
                  className="mt-8" 
                  size="lg"
                  onClick={handleAutoAdvise}
                  isLoading={loading}
                >
                  Generate My Subjects
                </Button>
              </Card>
            ) : (
              /* Irregular Selection */
              <Card title="Available Subjects">
                 <div className="p-1 mb-4 flex gap-4">
                    <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         type="text" 
                         placeholder="Search by code or name..."
                         className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {availableSubjects
                      .filter(s => s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(subject => {
                        const isSelected = selectedSubjectIds.includes(subject.id);
                        return (
                          <div 
                            key={subject.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                               isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => toggleSubject(subject.id)}
                          >
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800">{subject.code}</span>
                                  <Badge variant="ghost" className="text-[10px]">{subject.units} Units</Badge>
                               </div>
                               <p className="text-sm text-slate-600 mt-1">{subject.name}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                               isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                            }`}>
                               {isSelected && <CheckCircle2 size={16} />}
                            </div>
                          </div>
                        );
                      })}
                 </div>
              </Card>
            )
          )}
        </div>

        {/* Sidebar Summary Column */}
        <div className="space-y-6">
          <Card title="Advising Summary">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Student ID</span>
                <span className="font-semibold text-slate-800">{enrollment?.student_idn}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Program</span>
                <span className="font-semibold text-slate-800">{enrollment?.program_code}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Year Level</span>
                <span className="font-semibold text-slate-800">{enrollment?.year_level || 'Calculating...'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Study Type</span>
                <Badge variant="ghost">{isRegular ? 'Regular' : 'Irregular'}</Badge>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-900 font-bold">Total Units</span>
                  <span className={`text-xl font-bold ${totalUnits > 40 ? 'text-red-600' : 'text-blue-600'}`}>
                    {totalUnits}
                  </span>
                </div>
                {totalUnits > 35 && totalUnits <= 40 && (
                   <p className="text-[10px] text-amber-600 flex items-center gap-1">
                     <AlertCircle size={12} /> High unit load (warning)
                   </p>
                )}
                {totalUnits > 40 && (
                   <p className="text-[10px] text-red-600 flex items-center gap-1">
                     <AlertCircle size={12} /> Exceeds 40 units limit
                   </p>
                )}
              </div>

              {!hasAdvising && !isRegular && (
                <Button 
                  className="w-full mt-2" 
                  disabled={selectedSubjectIds.length === 0 || totalUnits > 40}
                  onClick={handleManualAdvise}
                  isLoading={loading}
                >
                  Submit for Approval
                </Button>
              )}
            </div>
          </Card>

          <Card className="bg-blue-600 text-white border-none">
             <div className="flex gap-3">
                <Info className="shrink-0" />
                <div>
                   <p className="text-sm font-semibold">Advising Tip</p>
                   <p className="text-xs opacity-90 mt-1">
                     Regular students get their subjects auto-filled. Irregular students must verify prerequisites before submission.
                   </p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentAdvising;
