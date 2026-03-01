import React, { useState, useEffect } from 'react';
import { 
    Award, 
    ArrowLeft, 
    Search, 
    ChevronDown, 
    Loader2, 
    History, 
    CheckCircle2, 
    XCircle, 
    MessageSquare,
    Clock,
    User,
    BookOpen,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    Shield,
    ChevronRight,
    Users,
    GraduationCap,
    Building,
    Filter,
    CheckSquare,
    Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const Resolutions = ({ hideTabs = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error, info, warning } = useToast();
    
    // Core State
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resolutions'); // 'resolutions' or 'students'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('ALL');
    
    // Resolutions State
    const [resolutions, setResolutions] = useState([]);
    const [selectedRes, setSelectedRes] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [notes, setNotes] = useState('');
    
    // Students State (Now serves as Student Directory)
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);

    // Enrollments State (Subject Approvals)
    const [enrollments, setEnrollments] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        initData();
    }, []);

    const initData = async () => {
        try {
            setLoading(true);
            const [resData, programData, studentData, enrollmentData] = await Promise.all([
                HeadService.getPendingResolutions(),
                HeadService.getPrograms(),
                HeadService.getStudents(),
                HeadService.getPendingEnrollments()
            ]);
            setResolutions(resData);
            setPrograms(programData);
            setStudents(studentData);
            
            // Format enrollments as they were in Students.jsx
            const grouped = {};
            enrollmentData.forEach(se => {
                const key = se.student_id;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: se.student_id,
                        name: se.student_name,
                        number: se.student_number,
                        program: se.program_code,
                        year_level: se.year_level,
                        is_irregular: se.is_irregular,
                        subjects: [],
                        totalUnits: 0,
                        isPaid: se.is_month1_paid
                    };
                }
                grouped[key].subjects.push(se);
                grouped[key].totalUnits += se.subject_units;
            });
            setEnrollments(Object.values(grouped));
            
        } catch (err) {
            console.error('Data init failed:', err);
            error('Failed to sync administrative data');
        } finally {
            setLoading(false);
        }
    };

    const fetchResolutions = async () => {
        try {
            const data = await HeadService.getPendingResolutions();
            setResolutions(data);
        } catch (err) {
            error('Failed to sync resolution queue');
        }
    };

    const handleAction = async (isApprove) => {
        if (!isApprove && !notes) {
            return warning('Please provide a reason for declining/cancellation');
        }

        let actionPrefix = '';
        if (selectedRes.status === 'PENDING_REGISTRAR_INITIAL') {
            actionPrefix = isApprove ? 'registrar_initial_approve' : 'reject';
        } else if (selectedRes.status === 'PENDING_HEAD') {
             actionPrefix = isApprove ? 'head_approve' : 'reject';
        } else if (selectedRes.status === 'PENDING_REGISTRAR_FINAL') {
             actionPrefix = isApprove ? 'registrar_final_approve' : 'cancel';
        } else {
             return error('Invalid resolution status');
        }

        try {
            setProcessing(true);
            const res = await HeadService.processResolution(selectedRes.id, actionPrefix, { notes, reason: notes });
            if (res) {
                if (isApprove) {
                    success('Action successfully processed.');
                } else {
                    success('Request declined');
                }
                setSelectedRes(null);
                setNotes('');
                fetchResolutions();
            }
        } catch (err) {
            error('Transaction was not finalized');
        } finally {
            setProcessing(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const data = await HeadService.getPendingEnrollments();
            const grouped = {};
            data.forEach(se => {
                const key = se.student_id;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: se.student_id,
                        name: se.student_name,
                        number: se.student_number,
                        program: se.program_code,
                        year_level: se.year_level,
                        is_irregular: se.is_irregular,
                        subjects: [],
                        totalUnits: 0,
                        isPaid: se.is_month1_paid
                    };
                }
                grouped[key].subjects.push(se);
                grouped[key].totalUnits += se.subject_units;
            });
            setEnrollments(Object.values(grouped));
        } catch (err) {
            error('Failed to sync pending enrollments');
        }
    };

    const handleApproveAll = async (student) => {
        try {
            setProcessing(true);
            const ids = student.subjects.map(s => s.id);
            await HeadService.bulkApprove(ids);
            success(`Enrollment for ${student.name} approved`);
            setSelectedStudent(null);
            fetchEnrollments();
        } catch (err) {
            error('Approval failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        
        try {
            setProcessing(true);
            const subjectIds = [];
            enrollments
                .filter(e => selectedIds.includes(e.id))
                .forEach(e => {
                    e.subjects.forEach(s => subjectIds.push(s.id));
                });
            
            const res = await HeadService.bulkApprove(subjectIds);
            success(`Approved enrollment for ${res.approved_count} subjects`);
            setSelectedIds([]);
            fetchEnrollments();
        } catch (err) {
            error('Bulk approval failed');
        } finally {
            setProcessing(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = (filteredItems) => {
        if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(e => e.id));
        }
    };

    // Helper: Categorize students by program
    const getGroupedStudents = () => {
        let filtered = students.filter(s => 
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.student_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (selectedProgram !== 'ALL') {
            filtered = filtered.filter(s => s.program_code === selectedProgram);
        }

        const grouped = {};
        programs.forEach(p => {
            const programStudents = filtered.filter(s => s.program_code === p.code);
            if (programStudents.length > 0) {
                grouped[p.code] = {
                    name: p.name,
                    students: programStudents
                };
            }
        });

        // Any students without program match
        const others = filtered.filter(s => !programs.find(p => p.code === s.program_code));
        if (others.length > 0) {
            grouped['OTHERS'] = {
                name: 'Other Programs',
                students: others
            };
        }

        return grouped;
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    const groupedStudents = getGroupedStudents();
    const filteredResolutions = resolutions.filter(res => {
        const matchesSearch = res.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            res.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            res.subject_code.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (selectedProgram === 'ALL') return matchesSearch;
        
        // Find if this student's program matches the selected filter
        // We might need to check the student object or rely on resolution data if it has program_code
        // Student objects in the directory have program_code. Let's assume the resolution student_number matches.
        const student = students.find(s => s.student_number === res.student_number);
        return matchesSearch && student?.program_code === selectedProgram;
    });

    const filteredEnrollments = enrollments.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.program.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (selectedProgram === 'ALL') return matchesSearch;
        return matchesSearch && e.program === selectedProgram;
    });

    const resolutionCount = filteredResolutions.length;
    const enrollmentCount = filteredEnrollments.length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Administrative Hub" description="Academic Record Oversight" />
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Academic Oversight
                        <span className="text-indigo-600/20"><Shield className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Program Records & Academic Amendments
                    </p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Program Filter */}
                    {(user?.role === 'ADMIN' || (user?.role === 'DEPARTMENT_HEAD' && user?.department_head_profile?.program_details?.length > 1)) && (
                        <div className="relative group w-full md:w-64">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                            <select 
                                aria-label="Filter by Program"
                                value={selectedProgram}
                                onChange={(e) => setSelectedProgram(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-200 shadow-xl shadow-indigo-500/5 transition-all appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Programs</option>
                                {(user?.role === 'ADMIN' ? programs : (user?.department_head_profile?.program_details || [])).map(p => (
                                    <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            aria-label="Search Context"
                            placeholder={activeTab === 'resolutions' ? "Search for a record..." : "Search students..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-200 shadow-xl shadow-indigo-500/5 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            {!hideTabs && (
                <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-3xl w-fit mb-10 border border-gray-100">
                    <button 
                        onClick={() => setActiveTab('resolutions')}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'resolutions' 
                                ? 'bg-white text-indigo-600 shadow-lg shadow-gray-200' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <History className="w-4 h-4" />
                        Resolutions
                        {resolutionCount > 0 && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('approvals')}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'approvals' 
                                ? 'bg-white text-indigo-600 shadow-lg shadow-gray-200' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Shield className="w-4 h-4" />
                        Subject Approvals
                        <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-md text-[8px] text-gray-500">{enrollmentCount}</span>
                    </button>
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'resolutions' ? (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-500/5 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Associate</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Subject</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade Adjustment</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stage</th>
                                <th className="px-10 py-6 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredResolutions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 tracking-tight">System All-Clear</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{searchTerm || selectedProgram !== 'ALL' ? 'No records match your filters' : 'No pending grade resolutions awaiting your review'}</p>
                                    </td>
                                </tr>
                            ) : filteredResolutions.map((res) => (
                                <tr key={res.id} className="hover:bg-gray-50/30 transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-sm shadow-sm uppercase group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                {res.student_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{res.student_name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{res.student_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-xs font-black text-indigo-600">{res.subject_code}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[200px]">{res.subject_title}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-500">{res.current_grade || 'INC'}</span>
                                            <ArrowRight className="w-3 h-3 text-gray-300" />
                                            <span className="px-3 py-1 bg-indigo-50 rounded-lg text-xs font-black text-indigo-600 border border-indigo-100">{res.proposed_grade}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit border ${
                                                res.status === 'PENDING_HEAD' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                res.status === 'PENDING_REGISTRAR_FINAL' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                res.status === 'PENDING_REGISTRAR_INITIAL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                                {res.status === 'PENDING_HEAD' ? 'Awaiting Head' : 
                                                 res.status === 'PENDING_REGISTRAR_FINAL' ? 'Awaiting Registrar Final' : 
                                                 res.status === 'PENDING_REGISTRAR_INITIAL' ? 'Awaiting Registrar Initial' : res.status}
                                            </span>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                                By: {res.requested_by_name}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <button 
                                            onClick={() => setSelectedRes(res)}
                                            className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
                                        >
                                            Review
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-500/5 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Profile</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program & Department</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.filter(s => {
                                const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    s.student_number?.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesProgram = selectedProgram === 'ALL' || s.program_code === selectedProgram;
                                return matchesSearch && matchesProgram;
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-24 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Users className="w-10 h-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 tracking-tight">No Students Found</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Try adjusting your filters or search criteria</p>
                                    </td>
                                </tr>
                            ) : students.filter(s => {
                                const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    s.student_number?.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesProgram = selectedProgram === 'ALL' || s.program_code === selectedProgram;
                                return matchesSearch && matchesProgram;
                            }).map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50/30 transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-sm shadow-sm uppercase group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                {student.last_name ? student.last_name[0] : '?'}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{student.last_name}, {student.first_name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{student.student_number || 'NO-ID'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-xs font-black text-indigo-600">{student.program_code}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[200px]">
                                            {programs.find(p => p.code === student.program_code)?.name || 'Direct Enrollment'}
                                        </p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-100 whitespace-nowrap">
                                                Year {student.year_level || '1'}
                                            </span >
                                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                                student.academic_status === 'REGULAR' 
                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {student.academic_status || 'REGULAR'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit border ${
                                            student.status === 'ENROLLED' 
                                                ? 'bg-green-50 text-green-600 border-green-100' 
                                                : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                        }`}>
                                            {student.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Resolution Modal */}
            {selectedRes && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedRes(null)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-500 flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="p-10 border-b border-gray-50 flex justify-between items-start shrink-0">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">Administrative Review</h3>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Grade Amendment Process • Case #{selectedRes.id.slice(0, 8)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedRes(null)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-3xl transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Two Column Layout Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
                            {/* Left: Resolution Info */}
                            <div className="flex-1 p-10 space-y-10 border-r border-gray-50">
                                <div className="grid grid-cols-2 gap-10">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Student Associate</p>
                                        <p className="text-lg font-black text-gray-900 leading-none">{selectedRes.student_name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedRes.student_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Subject</p>
                                        <p className="text-lg font-black text-indigo-600 leading-none">{selectedRes.subject_code}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{selectedRes.subject_title}</p>
                                    </div>
                                </div>

                                <div className="p-8 bg-indigo-50/50 rounded-[40px] border border-indigo-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5"><TrendingUp className="w-24 h-24 text-indigo-900" /></div>
                                    <div className="flex items-center justify-around relative z-10">
                                        <div className="text-center">
                                            <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Previous Grade</span>
                                            <span className="text-4xl font-black text-gray-400 tracking-tighter">{selectedRes.current_grade || 'INC'}</span>
                                        </div>
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Proposed Release</span>
                                            <span className="text-5xl font-black text-indigo-600 tracking-tighter">{selectedRes.proposed_grade || '?'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> Instructor Justification
                                        </h4>
                                    </div>
                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-[13px] font-bold text-gray-700 leading-relaxed italic">
                                        "{selectedRes.reason || 'No written justification provided for this record amendment.'}"
                                    </div>
                                </div>

                                {selectedRes.status === 'PENDING_REGISTRAR_FINAL' && selectedRes.head_notes && (
                                    <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                                        <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> Department Head Review
                                        </h4>
                                        <p className="text-[13px] font-bold text-green-700 leading-relaxed italic">
                                            "{selectedRes.head_notes}"
                                        </p>
                                        <p className="text-[9px] font-black text-green-400 uppercase mt-4">
                                            Verified by {selectedRes.reviewed_by_head_name}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="actionNotes" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Action Disposition Notes</label>
                                    <textarea 
                                        id="actionNotes"
                                        aria-label="Action Disposition Notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={selectedRes.status === 'PENDING_HEAD' ? "Provide feedback for the Registrar's final review..." : "Formalize your final decision for the academic record..."}
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[32px] text-sm font-bold focus:outline-none focus:bg-white focus:border-indigo-100 transition-all min-h-[120px]"
                                    />
                                </div>
                            </div>

                            {/* Right: Stage Timeline */}
                            <div className="w-full lg:w-80 bg-gray-50/50 p-10 shrink-0 border-l border-gray-50">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Record Lifecycle
                                </h4>
                                
                                <div className="space-y-10 relative">
                                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />
                                    
                                    {/* Step 1: Requested */}
                                    <div className="relative pl-10">
                                        <div className="absolute left-0 top-0 w-8 h-8 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center z-10 shadow-lg shadow-indigo-100">
                                            <User className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase">Amendment Filed</p>
                                        <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(selectedRes.created_at).toLocaleDateString()} {new Date(selectedRes.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter mt-1">Initiated by {selectedRes.requested_by_name}</p>
                                    </div>

                                    {/* Step 2: Registrar Initial */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 ${
                                            selectedRes.registrar_action_at 
                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                                                : 'bg-white border-gray-200'
                                        }`}>
                                            {selectedRes.registrar_action_at ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Building className="w-4 h-4 text-gray-300" />}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${selectedRes.registrar_action_at ? 'text-gray-900' : 'text-gray-300'}`}>Initial Review</p>
                                        {selectedRes.registrar_action_at && (
                                            <>
                                                <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(selectedRes.registrar_action_at).toLocaleDateString()}</p>
                                                <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter mt-1">Reg: {selectedRes.reviewed_by_registrar_name || 'Registrar'}</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Step 3: Grade Input */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 ${
                                            selectedRes.grade_input_at 
                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                                                : 'bg-white border-gray-200'
                                        }`}>
                                            {selectedRes.grade_input_at ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Award className="w-4 h-4 text-gray-300" />}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${selectedRes.grade_input_at ? 'text-gray-900' : 'text-gray-300'}`}>Grade Input</p>
                                        {selectedRes.grade_input_at && (
                                            <>
                                                <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(selectedRes.grade_input_at).toLocaleDateString()}</p>
                                                <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter mt-1">By: {selectedRes.grade_input_by_name || 'Prof'}</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Step 4: Department Head Stage */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 ${
                                            selectedRes.head_action_at 
                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                                                : 'bg-white border-gray-200'
                                        }`}>
                                            {selectedRes.head_action_at ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-gray-300" />}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${selectedRes.head_action_at ? 'text-gray-900' : 'text-gray-300'}`}>Department Review</p>
                                        {selectedRes.head_action_at && (
                                            <>
                                                <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(selectedRes.head_action_at).toLocaleDateString()}</p>
                                                <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter mt-1">Verified by Head</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Step 5: Registrar Final Stage */}
                                    <div className="relative pl-10">
                                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 ${
                                            selectedRes.registrar_final_at 
                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                                                : 'bg-white border-gray-200'
                                        }`}>
                                            {selectedRes.registrar_final_at ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Building className="w-4 h-4 text-gray-300" />}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${selectedRes.registrar_final_at ? 'text-gray-900' : 'text-gray-300'}`}>Registrar Finalization</p>
                                        {selectedRes.registrar_final_at && (
                                            <>
                                                <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(selectedRes.registrar_final_at).toLocaleDateString()}</p>
                                                <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter mt-1">Final Authorization</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Actions */}
                        <div className="p-10 border-t border-gray-50 flex gap-6 shrink-0 bg-white">
                            <button 
                                onClick={() => handleAction(false)}
                                disabled={processing}
                                className="px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-50 hover:bg-red-50 transition-all flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Decline Amendment
                            </button>
                            <button 
                                onClick={() => handleAction(true)}
                                disabled={processing}
                                className="flex-1 bg-indigo-600 py-5 rounded-3xl text-[11px] font-black text-white uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                            >
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        {selectedRes.status === 'PENDING_HEAD' ? 'Authorize & Forward to Registrar' : 
                                         selectedRes.status === 'PENDING_REGISTRAR_INITIAL' ? 'Initial Review: Authorize Grade Input' : 
                                         'Finalize & Update Academic Record'}
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approvals Content Area */}
            {activeTab === 'approvals' && (
                <div className="grid grid-cols-1 gap-4 pb-32">
                    {/* Controls Bar for Approvals */}
                    <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-2xl shadow-indigo-500/5 mb-8 flex flex-col md:flex-row items-center gap-4">
                        {/* Bulk Select Trigger */}
                        <button 
                            onClick={() => toggleSelectAll(filteredEnrollments)}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all w-full md:w-auto"
                        >
                            {selectedIds.length === filteredEnrollments.length && filteredEnrollments.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                                <Square className="w-4 h-4 text-gray-300" />
                            )}
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Select All</span>
                        </button>
                    </div>

                    {filteredEnrollments.length === 0 ? (
                        <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center opacity-40 mt-10">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No pending enrollments</p>
                        </div>
                    ) : filteredEnrollments.map((e) => (
                        <StudentCard 
                            key={e.id} 
                            student={e} 
                            isSelected={selectedIds.includes(e.id)}
                            onSelect={() => toggleSelect(e.id)}
                            onReview={() => setSelectedStudent(e)}
                            onApprove={() => handleApproveAll(e)}
                        />
                    ))}
                </div>
            )}

            {/* Floating Action Bar for Bulk Approvals */}
            {activeTab === 'approvals' && selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-gray-900 border border-white/10 text-white rounded-[32px] px-8 py-5 shadow-2xl flex items-center gap-10 backdrop-blur-xl bg-opacity-95">
                        <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
                                {selectedIds.length}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none">Students Selected</p>
                                <p className="text-xs font-bold text-white mt-1">Ready for bulk approval</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedIds([])}
                                className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <Button 
                                variant="primary" 
                                className="!bg-white !text-gray-900 px-8 py-4 !rounded-2xl"
                                icon={CheckCircle2}
                                onClick={handleBulkApprove}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'APPROVE ALL SELECTED'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Drawer for Approvals */}
            {activeTab === 'approvals' && selectedStudent && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative w-full max-w-3xl bg-white rounded-[40px] shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Drawer Header */}
                        <div className="p-10 border-b border-gray-50 flex justify-between items-start">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white text-2xl font-black shadow-2xl shadow-indigo-200">
                                    {selectedStudent.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Detailed Enrollment Review</p>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight">{selectedStudent.name}</h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">
                                        {selectedStudent.number} • {selectedStudent.program} • YEAR {selectedStudent.year_level}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                                <XCircle className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-grow overflow-y-auto p-10">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Subject Breakdown</h3>
                                {selectedStudent.subjects.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100/50 group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-black border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {s.subject_code}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{s.subject_name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{s.section_name} • {s.subject_units} Units</p>
                                            </div>
                                        </div>
                                        <button 
                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            onClick={() => {
                                                const reason = window.prompt("Reason for rejection:");
                                                if (reason) {
                                                    HeadService.rejectSubject(s.id, reason).then(() => {
                                                        success("Subject rejected");
                                                        fetchEnrollments();
                                                        setSelectedStudent(null);
                                                    });
                                                }
                                            }}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-10 border-t border-gray-50 bg-gray-50/30 flex gap-4">
                            <Button 
                                variant="secondary" 
                                className="flex-1 py-5 !rounded-2xl !bg-white border border-gray-100" 
                                onClick={() => setSelectedStudent(null)}
                            >
                                CLOSE
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-3 py-5 !rounded-2xl" 
                                icon={CheckCircle2}
                                onClick={() => handleApproveAll(selectedStudent)}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'APPROVE ALL SUBJECTS'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Component for Student Approvals List
const StudentCard = ({ student, isSelected, onSelect, onReview, onApprove }) => {
    return (
        <div className={`bg-white p-6 rounded-[32px] border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-indigo-200 shadow-xl shadow-indigo-500/5 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-gray-100'}`}>
            <div className="flex items-center gap-6">
                {/* Selection Checkbox */}
                <button onClick={onSelect} className="shrink-0 transition-transform active:scale-95">
                    {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-indigo-600" />
                    ) : (
                        <Square className="w-6 h-6 text-gray-200" />
                    )}
                </button>

                {/* Avatar */}
                <div className="relative">
                    <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 text-lg font-black border border-gray-100 group-hover:bg-indigo-600 transition-all">
                        {student.name.charAt(0)}
                    </div>
                    {student.is_irregular && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg" title="Irregular Student">
                            <AlertCircle className="w-3 h-3" />
                        </div>
                    )}
                </div>

                {/* Name & Metadata */}
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">{student.name}</h3>
                        {!student.isPaid && (
                           <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100">
                               <Clock className="w-2.5 h-2.5" /> Pending Payment
                           </span>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        {student.number} 
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        {student.program}
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        Year {student.year_level}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{student.subjects.length} Subjects</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{student.totalUnits} Units</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-none border-gray-50">
                <button 
                    onClick={onReview}
                    className="flex-1 lg:flex-none px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                >
                    REVIEW DETAILS
                </button>
                <Button 
                    variant="primary" 
                    className="flex-1 lg:flex-none px-8 py-4 !rounded-2xl shadow-lg shadow-indigo-100" 
                    icon={CheckCircle2}
                    onClick={onApprove}
                >
                    APPROVE
                </Button>
            </div>
        </div>
    );
};

export default Resolutions;
