import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Search, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ChevronRight,
    Loader2,
    Users,
    BookOpen,
    GraduationCap,
    AlertCircle,
    UserCheck,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

import DashboardAlerts from '../../components/ui/DashboardAlerts';

const HeadDashboard = () => {
    const { user } = useAuth();
    const { success, error, info, warning } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const data = await HeadService.getPendingEnrollments();
            
            // Group by student
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
        } finally {
            setLoading(false);
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

    const handleReject = async (subjectId) => {
        const reason = window.prompt('Reason for rejection:');
        if (!reason) return;

        try {
            setProcessing(true);
            await HeadService.rejectSubject(subjectId, reason);
            warning('Subject enrollment rejected');
            // Refresh detail view
            fetchEnrollments();
        } catch (err) {
            error('Rejection failed');
        } finally {
            setProcessing(false);
        }
    };

    const filtered = enrollments.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.program.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Head Dashboard" description="Departmental oversight and enrollment approval." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Dept Head Hub
                        <span className="text-indigo-600/20"><UserCheck className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Subject Approval & Academic Oversight
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white border border-gray-100 rounded-[28px] px-8 py-3 shadow-xl shadow-indigo-500/5 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Awaiting Review</p>
                            <p className="text-xl font-black text-indigo-600 tracking-tighter">{enrollments.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <StatBox icon={Users} label="Pending Students" value={enrollments.length} color="indigo" />
                <StatBox icon={BookOpen} label="Total Subjects" value={enrollments.reduce((acc, e) => acc + e.subjects.length, 0)} color="blue" />
                <StatBox icon={BarChart3} label="Subject Units" value={enrollments.reduce((acc, e) => acc + e.totalUnits, 0)} color="purple" />
                <StatBox icon={CheckCircle2} label="Processed Today" value="0" color="green" />
            </div>

            {/* Search */}
            <div className="relative group mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search by student name, number, or program..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-8 py-4 bg-white border border-gray-100 rounded-3xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-200 shadow-xl shadow-indigo-500/5 transition-all"
                />
            </div>

            {/* Enrollment List */}
            <div className="space-y-6">
                {filtered.length === 0 ? (
                    <div className="bg-white p-20 rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-500/5 text-center opacity-20">
                        <UserCheck className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No pending enrollments requiring approval</p>
                    </div>
                ) : filtered.map((e) => (
                    <div key={e.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all group">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-200">
                                    {e.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{e.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{e.number} • {e.program} - Year {e.year_level}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">{e.subjects.length} Subjects</span>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">{e.totalUnits} Units</span>
                                        {e.isPaid ? (
                                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-yellow-100 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Pending Payment</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setSelectedStudent(e)}
                                    className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    Review Details
                                </button>
                                <Button 
                                    variant="primary" 
                                    className="px-8" 
                                    icon={CheckCircle2}
                                    onClick={() => handleApproveAll(e)}
                                >
                                    APPROVE ALL
                                </Button>
                            </div>
                        </div>

                        {/* Subjects Preview */}
                        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap gap-3">
                            {e.subjects.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl">
                                    <span className="text-[9px] font-black text-indigo-600">{s.subject_code}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span className="text-[9px] font-bold text-gray-500 uppercase">{s.subject_units}U</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Approval Detail Drawer */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative w-full max-w-3xl bg-white rounded-[40px] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        <div className="p-10 border-b border-gray-50 shrink-0">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Subject Enrollment Review</p>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedStudent.name}</h2>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">{selectedStudent.number} • {selectedStudent.program}</p>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-10">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Section</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedStudent.subjects.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50/30 transition-all">
                                            <td className="px-6 py-6">
                                                <p className="font-black text-indigo-600 text-xs mb-0.5">{s.subject_code}</p>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight line-clamp-1">{s.subject_name}</p>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">{s.section_name}</span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="text-xs font-black text-gray-900">{s.subject_units}</span>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button 
                                                    onClick={() => handleReject(s.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50/30">
                                    <tr>
                                        <td colSpan="2" className="px-6 py-4 text-right font-black text-gray-400 text-[10px] uppercase">TOTAL LOAD:</td>
                                        <td className="px-6 py-4 text-center font-black text-indigo-600 text-lg">{selectedStudent.totalUnits}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="p-10 border-t border-gray-50 mt-auto shrink-0 flex gap-4">
                            <Button variant="secondary" className="flex-1 py-5" onClick={() => setSelectedStudent(null)}>CLOSE</Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 py-5" 
                                icon={CheckCircle2}
                                onClick={() => handleApproveAll(selectedStudent)}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'APPROVE ENROLLMENT'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatBox = ({ icon: Icon, label, value, color }) => {
    const colors = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        green: 'text-green-600 bg-green-50 border-green-100'
    };
    return (
        <div className={`p-6 bg-white border rounded-[32px] ${colors[color]} border-opacity-50 shadow-xl shadow-indigo-500/5`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-5 h-5 opacity-40" />
                <ArrowUpRight className="w-4 h-4 opacity-10" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
};

export default HeadDashboard;
