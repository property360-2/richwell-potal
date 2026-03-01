import React, { useState, useEffect } from 'react';
import { 
    Award, 
    Search, 
    ChevronDown, 
    Loader2, 
    History, 
    Edit3,
    Save,
    Info,
    Archive,
    Clock,
    Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import SEO from '../../components/shared/SEO';
import ProfessorLayout from './ProfessorLayout';
import ProfessorService from './services/ProfessorService';
import ResolutionStatus from '../../components/shared/ResolutionStatus';

const ProfessorGrades = () => {
    const { user } = useAuth();
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState(null);
    const [selectedSS, setSelectedSS] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        try {
            const data = await api.get(endpoints.semesters);
            const semList = data.results || data || [];
            setSemesters(semList);
            const current = semList.find(s => s.is_current) || semList[0];
            if (current) {
                setSelectedSemesterId(current.id);
                fetchSections(current.id);
            }
        } catch (err) {
            error('Failed to sync academic terms');
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async (semesterId) => {
        try {
            const data = await ProfessorService.getGradingSections(semesterId);
            if (data) setSections(data.sections || []);
        } catch (err) {
            error('Failed to load assigned load');
        }
    };

    const fetchStudents = async (ssId) => {
        try {
            setLoadingStudents(true);
            const data = await ProfessorService.getGradingStudents(ssId);
            if (data) setStudents(data.students || []);
        } catch (err) {
            error('Failed to load student roster');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleGradeSubmit = async (studentId, gradeValue) => {
        if (!gradeValue) return;

        try {
            setProcessingId(studentId);
            let status = 'ENROLLED';
            if (gradeValue === 'DROPPED') status = 'DROPPED';
            else if (gradeValue === 'INC') status = 'INC';
            else {
                const n = parseFloat(gradeValue);
                status = n <= 3.0 ? 'PASSED' : 'FAILED';
            }

            const res = await ProfessorService.submitGrade({
                subject_enrollment_id: studentId,
                grade: gradeValue === 'INC' || gradeValue === 'DROPPED' ? null : parseFloat(gradeValue),
                status: status,
                remarks: gradeValue === 'INC' ? 'Incomplete requirements' : ''
            });

            if (res && res.success) {
                success('Grade recorded successfully');
                setStudents(prev => prev.map(s => 
                    s.subject_enrollment_id === studentId 
                    ? { ...s, current_grade: gradeValue, current_status: status } 
                    : s
                ));
            }
        } catch (err) {
            error('Failed to transmit grade record');
        } finally {
            setProcessingId(null);
        }
    };

    const gradeOptions = [
        { v: '1.00', l: '1.00 - Excellent' },
        { v: '1.25', l: '1.25 - Superior' },
        { v: '1.50', l: '1.50 - Very Good' },
        { v: '1.75', l: '1.75 - Very Good' },
        { v: '2.00', l: '2.00 - Good' },
        { v: '2.25', l: '2.25 - Good' },
        { v: '2.50', l: '2.50 - Fair' },
        { v: '2.75', l: '2.75 - Fair' },
        { v: '3.00', l: '3.00 - Pass' },
        { v: '5.00', l: '5.00 - Failure' },
        { v: 'INC', l: 'INC - Incomplete' },
        { v: 'DROPPED', l: 'DROPPED' }
    ];

    const activeSemester = semesters.find(s => s.id === selectedSemesterId);
    let isGradingOpen = true;
    let gradingMessage = "Dates not configured. Grading is Open.";
    
    if (activeSemester && activeSemester.grading_start_date && activeSemester.grading_end_date) {
        const now = new Date();
        const start = new Date(activeSemester.grading_start_date);
        const end = new Date(activeSemester.grading_end_date);
        end.setHours(23, 59, 59, 999);
        
        isGradingOpen = now >= start && now <= end;
        
        const formatStr = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        if (isGradingOpen) {
            gradingMessage = `Grading is openly available until ${formatStr(activeSemester.grading_end_date)}.`;
        } else if (now < start) {
            gradingMessage = `Grading periods opens on ${formatStr(activeSemester.grading_start_date)}.`;
        } else {
            gradingMessage = `Grading period closed on ${formatStr(activeSemester.grading_end_date)}.`;
        }
    }

    if (loading) return (
        <ProfessorLayout>
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        </ProfessorLayout>
    );

    return (
        <ProfessorLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
                <SEO title="Grade Submission" description="Official grade reporting and submission utility." />
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            {selectedSS ? 'Section Grading' : 'Grade Submission'}
                        </h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                            {selectedSS ? `${selectedSS.subject_code} • ${selectedSS.section_name}` : 'Academic Performance Reporting'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {selectedSS && (
                            <button 
                                onClick={() => { setSelectedSS(null); setStudents([]); setSearchTerm(''); }}
                                className="px-5 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all"
                            >
                                ← Back to Sections
                            </button>
                        )}
                        {!selectedSS && (
                            <div className="w-full md:w-64 relative group">
                                <select 
                                    aria-label="Select Semester"
                                    value={selectedSemesterId || ''}
                                    onChange={(e) => {
                                        setSelectedSemesterId(e.target.value);
                                        fetchSections(e.target.value);
                                    }}
                                    className="w-full pl-6 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                                >
                                    {semesters.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.academic_year}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform"><ChevronDown className="w-4 h-4" /></div>
                            </div>
                        )}
                    </div>
                </div>

                {!selectedSS ? (
                    /* Sections List */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sections.length === 0 ? (
                            <div className="lg:col-span-3 py-20 text-center opacity-20">
                                <Archive className="w-16 h-16 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No assigned sections found for this term</p>
                            </div>
                        ) : sections.map((sec) => (
                            <div 
                                key={sec.section_subject_id}
                                onClick={() => {
                                    setSelectedSS(sec);
                                    fetchStudents(sec.section_subject_id);
                                }}
                                className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 hover:shadow-blue-500/10 hover:border-blue-100 transition-all cursor-pointer group"
                            >
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                    {sec.subject_code?.slice(0, 3)}
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">{sec.subject_code}</h3>
                                <p className="text-xs font-bold text-gray-500 mb-6 line-clamp-1">{sec.subject_title}</p>
                                
                                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sec.section_name}</span>
                                    <div className="flex items-center gap-1 text-blue-600 font-black text-[10px]">
                                        <Users className="w-3.5 h-3.5" />
                                        {sec.enrolled_count || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Grading Form */
                    <div className="space-y-8">
                        {/* Filter / Search */}
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 flex flex-col md:flex-row gap-6">
                            <div className="relative group flex-1">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input 
                                    type="text" 
                                    aria-label="Search Students"
                                    placeholder="Search student name or number..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-16 pr-8 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                                />
                            </div>
                            <div className={`flex items-center gap-4 px-6 rounded-2xl border ${isGradingOpen ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50/50 border-red-100'}`}>
                                 <Info className={`w-4 h-4 ${isGradingOpen ? 'text-blue-600' : 'text-red-600'}`} />
                                 <p className={`text-[10px] font-bold leading-none uppercase tracking-tighter ${isGradingOpen ? 'text-blue-900/60' : 'text-red-900/60'}`}>
                                    Grading is currently <span className={`font-black ${isGradingOpen ? 'text-blue-600' : 'text-red-600'}`}>{isGradingOpen ? 'Open' : 'Closed'}</span> for this term.
                                    <span className="block mt-1 normal-case tracking-normal">{gradingMessage}</span>
                                 </p>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Information</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Current Grade</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingStudents ? (
                                        <tr><td colSpan="3" className="py-20 text-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" /></td></tr>
                                    ) : students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map((student) => (
                                        <tr key={student.subject_enrollment_id} className="hover:bg-gray-50/30 transition-all group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 text-xs shadow-sm">
                                                        {student.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{student.full_name}</p>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{student.student_number || 'TEMP_RECORD'}</p>
                                                        
                                                        {student.pending_resolution && (
                                                            <div className="mt-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-2">
                                                                <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                                                                    <Clock className="w-2.5 h-2.5" /> Resolution
                                                                </p>
                                                                <ResolutionStatus 
                                                                    status={student.pending_resolution.status} 
                                                                    resolution={student.pending_resolution}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <div className="w-48 mx-auto relative">
                                                    <select 
                                                        aria-label="Grade Input"
                                                        value={student.current_grade || student.proposed_grade || ''}
                                                        disabled={processingId === student.subject_enrollment_id || !isGradingOpen}
                                                        onChange={(e) => handleGradeSubmit(student.subject_enrollment_id, e.target.value)}
                                                        className={`w-full px-5 py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest appearance-none focus:outline-none transition-all
                                                            ${student.current_grade ? 'bg-green-50 border-green-100 text-green-700' : 'bg-white border-gray-100 text-gray-900 focus:border-blue-100 shadow-sm'}
                                                            ${!isGradingOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <option value="">Ungraded</option>
                                                        {gradeOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                                    </select>
                                                    {processingId === student.subject_enrollment_id && (
                                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-3 bg-white border border-gray-50 rounded-xl text-gray-300 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100">
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-3 bg-white border border-gray-50 rounded-xl text-gray-300 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100">
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </ProfessorLayout>
    );
};

export default ProfessorGrades;
