import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Plus, 
    Settings, 
    CheckCircle2, 
    Clock, 
    Trash2, 
    Edit2, 
    Filter,
    Loader2,
    CalendarDays,
    ArrowRightCircle,
    XCircle,
    LayoutDashboard,
    GraduationCap,
    AlertCircle,
    Search,
    ChevronRight,
    History
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import { AdminService } from './services/AdminService';
import TermModal from './modals/TermModal';

const TermManagement = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSemester, setEditingSemester] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSemesters();
    }, []);

    const fetchSemesters = async () => {
        try {
            setLoading(true);
            const data = await AdminService.getSemesters();
            // Backend might return wrapped object or direct array
            setSemesters(data.semesters || data || []);
        } catch (err) {
            error('Institutional portal failure: Could not reach config engine.');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id) => {
        if (!window.confirm('CRITICAL OVERRIDE: Activating this term will globally re-route all portal contexts. Proceed?')) return;
        try {
            await AdminService.activateSemester(id);
            success('Global term context switched successfully');
            fetchSemesters();
        } catch (err) {
            error(err.response?.data?.detail || 'Activation sequence failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('DATA PURGE: Are you sure? This action is irreversible and may corrupt historical records.')) return;
        try {
            await AdminService.deleteSemester(id);
            success('Term decommissioned');
            fetchSemesters();
        } catch (err) {
            error('Deletion rejected by system safety protocols');
        }
    };

    const openEdit = (s) => {
        setEditingSemester(s);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingSemester(null);
        setIsModalOpen(true);
    };

    const filteredSemesters = semesters.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.academic_year.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusTheme = (status) => {
        switch (status) {
            case 'ENROLLMENT_OPEN': return 'bg-emerald-500 text-white shadow-emerald-200';
            case 'GRADING_OPEN': return 'bg-purple-600 text-white shadow-purple-200';
            case 'CLOSED':
            case 'ARCHIVED': return 'bg-gray-900 text-white shadow-gray-200';
            default: return 'bg-blue-600 text-white shadow-blue-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-1000">
            <SEO title="Term Management" description="Institutional time matrices and academic period configurations." />
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Term Management</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Config Engine</span>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Institutional Timeline</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search periods..."
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" icon={Plus} onClick={openAdd} className="shadow-xl shadow-blue-500/20 px-8 py-4 h-auto rounded-2xl text-[10px] font-black tracking-widest">
                        NEW PERIOD
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <Settings className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Timeline Data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {filteredSemesters.map((semester) => (
                        <div key={semester.id} className={`group relative bg-white border-2 rounded-[48px] p-8 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:scale-[1.01] ${semester.is_current ? 'border-blue-600 ring-8 ring-blue-50' : 'border-gray-50'}`}>
                            {semester.is_current && (
                                <div className="absolute -top-4 left-12 bg-blue-600 text-white px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 flex items-center gap-2">
                                    <Activity className="w-3 h-3 animate-pulse" /> Primary Active Term
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{semester.name}</h2>
                                        {semester.is_deleted && <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Deleted</span>}
                                    </div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <History className="w-3.5 h-3.5" /> Academic Cycle {semester.academic_year}
                                    </p>
                                </div>
                                <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${getStatusTheme(semester.status)}`}>
                                    {semester.status?.replace('_', ' ') || 'SETUP'}
                                </div>
                            </div>

                            {/* Matrix Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                <TimelineCard label="Term Span" start={semester.start_date} end={semester.end_date} icon={CalendarDays} color="blue" />
                                <TimelineCard label="Enrollment" start={semester.enrollment_start_date} end={semester.enrollment_end_date} icon={Clock} color="emerald" />
                                <TimelineCard label="Grading Portal" start={semester.grading_start_date} end={semester.grading_end_date} icon={GraduationCap} color="purple" />
                            </div>

                            {/* Control Interface */}
                            <div className="flex flex-wrap items-center gap-4 pt-8 border-t border-gray-100/50">
                                {!semester.is_current && !semester.is_deleted && (
                                    <button 
                                        onClick={() => handleActivate(semester.id)}
                                        className="flex-1 min-w-[160px] px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-blue-500/20 active:scale-95"
                                    >
                                        <ArrowRightCircle className="w-4 h-4" /> ACTIVATE PERIOD
                                    </button>
                                )}
                                
                                <button 
                                    onClick={() => openEdit(semester)}
                                    className="p-4 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100 flex-1 flex items-center justify-center gap-2 group/btn"
                                >
                                    <Edit2 className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Override Matrix</span>
                                </button>

                                {!semester.is_current && !semester.is_deleted && (
                                    <button 
                                        onClick={() => handleDelete(semester.id)}
                                        className="p-4 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredSemesters.length === 0 && (
                        <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[64px] border-2 border-dashed border-gray-200">
                            <Calendar className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Timeline Engine Empty</h3>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mt-3">No matching academic periods found in the registry.</p>
                            <Button variant="primary" onClick={openAdd} className="mt-10 px-10">INITIALIZE FIRST TERM</Button>
                        </div>
                    )}
                </div>
            )}

            <TermModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                semester={editingSemester}
                onSuccess={fetchSemesters}
            />
        </div>
    );
};

const TimelineCard = ({ label, start, end, icon: Icon, color = "blue" }) => {
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '---';
    const themes = {
        blue: 'bg-blue-50/50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100',
        purple: 'bg-purple-50/50 text-purple-600 border-purple-100'
    };
    return (
        <div className={`p-5 rounded-[32px] border-2 ${themes[color]} transition-all hover:scale-105 duration-300`}>
            <div className="flex items-center gap-2.5 mb-4">
                <Icon className="w-4 h-4 opacity-70" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-none">{label}</span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center group/item">
                    <span className="text-[8px] font-black uppercase opacity-40 group-hover/item:opacity-100 transition-opacity">Launch</span>
                    <p className="text-[11px] font-black tracking-tight">{formatDate(start)}</p>
                </div>
                <div className="w-full h-px bg-current opacity-5"></div>
                <div className="flex justify-between items-center group/item">
                    <span className="text-[8px] font-black uppercase opacity-40 group-hover/item:opacity-100 transition-opacity">Expiry</span>
                    <p className="text-[11px] font-black tracking-tight">{formatDate(end)}</p>
                </div>
            </div>
        </div>
    );
};

export default TermManagement;
