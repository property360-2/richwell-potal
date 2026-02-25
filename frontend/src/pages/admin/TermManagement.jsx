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
    History,
    Activity
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
            const semesterData = data?.semesters || data?.results || data;
            setSemesters(Array.isArray(semesterData) ? semesterData : []);
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
            error(err.message || 'Activation sequence failed');
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

    const filteredSemesters = (Array.isArray(semesters) ? semesters : []).filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.academic_year?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <div className="bg-white border border-gray-100 rounded-[42px] overflow-hidden shadow-2xl shadow-gray-200/50">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Institutional Period</th>
                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Academic Span</th>
                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Enrollment Phase</th>
                                    <th className="px-6 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Grading Matrix</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSemesters.map((semester) => (
                                    <tr 
                                        key={semester.id} 
                                        className={`group border-b border-gray-50 transition-all hover:bg-gray-50/80 ${semester.is_current ? 'bg-blue-50/20' : ''}`}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${semester.is_current ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-gray-900 tracking-tight">{semester.name}</span>
                                                        {semester.is_current && (
                                                            <div className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest animate-pulse">ACTIVE</div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{semester.academic_year}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-left">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusTheme(semester.status)}`}>
                                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                                {semester.status?.replace('_', ' ') || 'SETUP'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <DateWindow start={semester.start_date} end={semester.end_date} color="blue" />
                                        </td>
                                        <td className="px-6 py-6">
                                            <DateWindow start={semester.enrollment_start_date} end={semester.enrollment_end_date} color="emerald" />
                                        </td>
                                        <td className="px-6 py-6">
                                            <DateWindow start={semester.grading_start_date} end={semester.grading_end_date} color="purple" />
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!semester.is_current && !semester.is_deleted && (
                                                    <button 
                                                        onClick={() => handleActivate(semester.id)}
                                                        title="Activate Period"
                                                        className="p-3 bg-gray-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => openEdit(semester)}
                                                    title="Edit configuration"
                                                    className="p-3 bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {!semester.is_current && !semester.is_deleted && (
                                                    <button 
                                                        onClick={() => handleDelete(semester.id)}
                                                        title="Delete Term"
                                                        className="p-3 bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSemesters.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <XCircle className="w-16 h-16 text-gray-100" />
                                                <div>
                                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Timeline Engine Empty</h3>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">No matching academic periods found in the registry.</p>
                                                </div>
                                                <Button variant="primary" onClick={openAdd} className="mt-4">INITIALIZE FIRST TERM</Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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

const DateWindow = ({ start, end, color }) => {
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '---';
    const themes = {
        blue: 'text-blue-600 px-2 py-1 bg-blue-50/50 rounded-lg',
        emerald: 'text-emerald-600 px-2 py-1 bg-emerald-50/50 rounded-lg',
        purple: 'text-purple-600 px-2 py-1 bg-purple-50/50 rounded-lg'
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase text-gray-300 w-6">ST</span>
                <span className={`text-[10px] font-black tracking-tight ${themes[color]}`}>{formatDate(start)}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase text-gray-300 w-6">EN</span>
                <span className={`text-[10px] font-black tracking-tight ${themes[color]}`}>{formatDate(end)}</span>
            </div>
        </div>
    );
};

export default TermManagement;
