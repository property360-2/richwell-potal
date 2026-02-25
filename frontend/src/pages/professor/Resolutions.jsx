import React, { useState, useEffect } from 'react';
import { 
    FileCheck2, 
    Loader2, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    ChevronDown,
    Calendar,
    Users,
    BookOpen,
    Search,
    Timer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import SEO from '../../components/shared/SEO';
import ProfessorLayout from './ProfessorLayout';
import ProfessorService from './services/ProfessorService';
import ResolutionStatus from '../../components/shared/ResolutionStatus';

const ProfessorResolutions = () => {
    const { user } = useAuth();
    const { error } = useToast();

    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState(null);
    const [incStudents, setIncStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentForResolution, setSelectedStudentForResolution] = useState(null);

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
                fetchIncStudents(current.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            error('Failed to load semesters');
            setLoading(false);
        }
    };

    const fetchIncStudents = async (semesterId) => {
        try {
            setLoading(true);
            // Fetch students with INC status from the grading endpoint
            const data = await api.get(`/admissions/grading/students/?semester=${semesterId}&status=INC`);
            setIncStudents(data?.students || []);
        } catch (err) {
            error('Failed to load INC records');
        } finally {
            setLoading(false);
        }
    };

    const handleSemesterChange = (id) => {
        setSelectedSemesterId(id);
        fetchIncStudents(id);
    };

    const filtered = incStudents.filter(s => 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subject_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const totalInc = incStudents.length;
    const withResolution = incStudents.filter(s => s.pending_resolution).length;
    const expiringSoon = incStudents.filter(s => s.days_remaining !== null && s.days_remaining <= 30 && s.days_remaining > 0).length;
    const expired = incStudents.filter(s => s.is_expired).length;

    return (
        <ProfessorLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
                <SEO title="Grade Resolution" description="Track INC grades and resolution status." />
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Grade Resolution</h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                            INC Records & Retake Eligibility
                        </p>
                    </div>

                    <div className="w-full md:w-64 relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"><Calendar className="w-4 h-4" /></div>
                        <select 
                            value={selectedSemesterId || ''}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                        >
                            {semesters.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.academic_year}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><ChevronDown className="w-4 h-4" /></div>
                    </div>
                </div>

                {/* Stats */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <StatCard label="Total INC" value={totalInc} icon={FileCheck2} color="blue" />
                        <StatCard label="With Resolution" value={withResolution} icon={Clock} color="amber" />
                        <StatCard label="Expiring Soon" value={expiringSoon} icon={AlertTriangle} color="orange" />
                        <StatCard label="Expired" value={expired} icon={XCircle} color="red" />
                    </div>
                )}

                {/* Search */}
                {!loading && totalInc > 0 && (
                    <div className="mb-8">
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search by student name, number, or subject code..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-16 pr-8 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-16 text-center">
                        <div className="opacity-20">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                {totalInc === 0 ? 'No INC records for this term' : 'No results match your search'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((student) => (
                            <IncStudentCard 
                                key={student.subject_enrollment_id} 
                                student={student} 
                                onResolve={() => setSelectedStudentForResolution(student)}
                            />
                        ))}
                    </div>
                )}

                {/* Resolution Modal */}
                {selectedStudentForResolution && (
                    <ResolveGradeModal 
                        student={selectedStudentForResolution}
                        onClose={() => setSelectedStudentForResolution(null)}
                        onSuccess={() => {
                            setSelectedStudentForResolution(null);
                            fetchIncStudents(selectedSemesterId);
                        }}
                    />
                )}
            </div>
        </ProfessorLayout>
    );
};

const IncStudentCard = ({ student, onResolve }) => {
    const daysRemaining = student.days_remaining;
    const isExpired = student.is_expired;
    const retakeDate = student.retake_eligibility_date;
    const resolution = student.pending_resolution;

    // Determine urgency
    let urgencyColor = 'gray';
    let urgencyLabel = 'Active';
    if (isExpired) {
        urgencyColor = 'red';
        urgencyLabel = 'Expired — Eligible for Retake';
    } else if (daysRemaining !== null && daysRemaining <= 30) {
        urgencyColor = 'orange';
        urgencyLabel = `${daysRemaining} days remaining`;
    } else if (daysRemaining !== null) {
        urgencyColor = 'blue';
        urgencyLabel = `${daysRemaining} days remaining`;
    }

    return (
        <div className={`bg-white p-8 rounded-[32px] border shadow-lg shadow-blue-500/5 transition-all hover:shadow-xl ${
            isExpired ? 'border-red-100' : resolution ? 'border-amber-100' : 'border-gray-100'
        }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Student & Subject Info */}
                <div className="flex items-start gap-5">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 text-sm flex-shrink-0 border border-gray-100">
                        {student.full_name?.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 tracking-tight text-base mb-1">{student.full_name}</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                            {student.student_number || 'N/A'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                {student.subject_code}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">{student.subject_title}</span>
                        </div>
                    </div>
                </div>

                {/* Status & Dates */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                    {/* Retake Date */}
                    <div className="text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Retake Eligibility</p>
                        {retakeDate ? (
                            <p className={`text-sm font-black tracking-tight ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                {new Date(retakeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-gray-300">Not set</p>
                        )}
                    </div>

                    {/* Days Remaining Badge */}
                    <div className={`px-4 py-2.5 rounded-2xl border text-center min-w-[140px] ${
                        urgencyColor === 'red' ? 'bg-red-50 border-red-100' :
                        urgencyColor === 'orange' ? 'bg-orange-50 border-orange-100' :
                        urgencyColor === 'blue' ? 'bg-blue-50 border-blue-100' :
                        'bg-gray-50 border-gray-100'
                    }`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Timer className={`w-3.5 h-3.5 ${
                                urgencyColor === 'red' ? 'text-red-500' :
                                urgencyColor === 'orange' ? 'text-orange-500' :
                                urgencyColor === 'blue' ? 'text-blue-500' :
                                'text-gray-400'
                            }`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                urgencyColor === 'red' ? 'text-red-600' :
                                urgencyColor === 'orange' ? 'text-orange-600' :
                                urgencyColor === 'blue' ? 'text-blue-600' :
                                'text-gray-500'
                            }`}>
                                {urgencyLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resolve Action */}
                {!resolution && !isExpired && (
                    <div className="mt-4 lg:mt-0 flex-shrink-0 flex items-center justify-end">
                        <button 
                            onClick={onResolve}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            <FileCheck2 className="w-4 h-4" />
                            Resolve
                        </button>
                    </div>
                )}
            </div>

            {/* Resolution Status (if any) */}
            {resolution && (
                <div className="mt-6 pt-6 border-t border-gray-50">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Resolution</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <ResolutionStatus status={resolution.status} resolution={resolution} />
                                <span className="text-[10px] text-gray-500 font-bold">
                                    Proposed: <span className="text-blue-600 font-black">{resolution.proposed_grade}</span>
                                </span>
                                {resolution.remarks && (
                                    <span className="text-[10px] text-gray-400 italic">"{resolution.remarks}"</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg shadow-blue-500/5">
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 bg-${color}-50 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
        </div>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const ResolveGradeModal = ({ student, onClose, onSuccess }) => {
    const { error, success } = useToast();
    const [loading, setLoading] = useState(false);
    const [newGrade, setNewGrade] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await ProfessorService.createResolution({
                subject_enrollment: student.subject_enrollment_id,
                proposed_grade: newGrade,
                proposed_status: 'PASSED', // Standardizing as passed once a numeric grade > 3.0 is given
                reason: reason
            });
            success('Grade resolution submitted successfully!');
            onSuccess();
        } catch (err) {
            error(err.response?.data?.detail || 'Failed to submit resolution');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Resolve Grade</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                            {student.full_name} • {student.subject_code}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100 transition-colors">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">New Grade</label>
                        <select
                            required
                            value={newGrade}
                            onChange={(e) => setNewGrade(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        >
                            <option value="">Select passing grade...</option>
                            {['1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00'].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Reason for Change</label>
                        <textarea
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why the grade is being changed (e.g., 'Completed missing project within deadline')"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm h-32 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !newGrade || !reason}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Submit Resolution
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfessorResolutions;
