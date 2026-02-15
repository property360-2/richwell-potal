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
    LayoutDashboard
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import SemesterModal from './SemesterModal';

const RegistrarSemesterManagement = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState([]);
    const [filteredYear, setFilteredYear] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSemester, setEditingSemester] = useState(null);

    useEffect(() => {
        fetchSemesters();
    }, []);

    const fetchSemesters = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/academic/semesters/');
            if (res.ok) {
                const data = await res.json();
                setSemesters(data.semesters || data || []);
            }
        } catch (err) {
            error('Failed to load academic terms');
        } finally {
            setLoading(false);
        }
    };

    const handleSetCurrent = async (id) => {
        try {
            const res = await fetch(`/api/v1/academic/semesters/${id}/set-current/`, { method: 'POST' });
            if (res.ok) {
                success('Academic term activated');
                fetchSemesters();
            }
        } catch (err) {
            error('Operation failed');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const res = await fetch(`/api/v1/academic/semesters/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                info(`Term status updated to ${status.replace('_', ' ')}`);
                fetchSemesters();
            }
        } catch (err) {
            error('Failed to update status');
        }
    };

    const deleteSemester = async (id) => {
        if (!window.confirm('Delete this semester? This will affect historical enrollment data.')) return;
        try {
            const res = await fetch(`/api/v1/academic/semesters/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                success('Semester deleted');
                fetchSemesters();
            }
        } catch (err) {
            error('Network error');
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

    const uniqueYears = [...new Set(semesters.map(s => s.academic_year))].sort().reverse();
    const filteredSemesters = filteredYear === 'all' 
        ? semesters 
        : semesters.filter(s => s.academic_year === filteredYear);

    const getStatusTheme = (status) => {
        switch (status) {
            case 'ENROLLMENT_OPEN': return 'bg-green-600 text-white shadow-green-200';
            case 'GRADING_OPEN': return 'bg-blue-600 text-white shadow-blue-200';
            case 'CLOSED': return 'bg-gray-600 text-white shadow-gray-200';
            default: return 'bg-amber-500 text-white shadow-amber-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Academic Terms" description="Manage institutional semesters and academic period configurations." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Academic Terms</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Calendar & Enrollment Sync</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={openAdd}>
                    CREATE NEW TERM
                </Button>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-1">
                    <button 
                        onClick={() => setFilteredYear('all')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${filteredYear === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        ALL YEARS
                    </button>
                    {uniqueYears.map(year => (
                        <button 
                            key={year}
                            onClick={() => setFilteredYear(year)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${filteredYear === year ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {filteredSemesters.map((semester) => (
                        <div key={semester.id} className={`group relative bg-white border-2 rounded-[40px] p-8 transition-all hover:shadow-2xl hover:scale-[1.01] ${semester.is_current ? 'border-blue-600 shadow-blue-500/10' : 'border-gray-50'}`}>
                            {semester.is_current && (
                                <div className="absolute -top-3 left-10 bg-blue-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    Active Term
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{semester.name}</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">SY {semester.academic_year}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${getStatusTheme(semester.status)}`}>
                                    {semester.status.replace('_', ' ')}
                                </div>
                            </div>

                            {/* Timeline Details */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <DateCard label="Term Duration" start={semester.start_date} end={semester.end_date} icon={CalendarDays} />
                                <DateCard label="Enrollment Window" start={semester.enrollment_start_date} end={semester.enrollment_end_date} icon={Clock} color="indigo" />
                            </div>

                            {/* Controls */}
                            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-gray-50">
                                {!semester.is_current && (
                                    <button 
                                        onClick={() => handleSetCurrent(semester.id)}
                                        className="flex-1 min-w-[140px] px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <ArrowRightCircle className="w-4 h-4" /> ACTIVATE
                                    </button>
                                )}
                                
                                <select 
                                    className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-200 appearance-none cursor-pointer text-gray-600"
                                    value={semester.status}
                                    onChange={(e) => handleStatusUpdate(semester.id, e.target.value)}
                                >
                                    <option value="SETUP">Switch to Setup</option>
                                    <option value="ENROLLMENT_OPEN">Open Enrollment</option>
                                    <option value="ENROLLMENT_CLOSED">Close Enrollment</option>
                                    <option value="GRADING_OPEN">Open Grading</option>
                                    <option value="CLOSED">Archive Term</option>
                                </select>

                                <div className="ml-auto flex gap-2">
                                    <button onClick={() => openEdit(semester)} className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {!semester.is_current && (
                                        <button onClick={() => deleteSemester(semester.id)} className="p-3 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredSemesters.length === 0 && (
                        <div className="lg:col-span-2 py-20 text-center bg-white rounded-[40px] border border-gray-50 shadow-sm">
                            <Calendar className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">No academic terms found</h3>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Initialize your first semester to begin.</p>
                        </div>
                    )}
                </div>
            )}

            <SemesterModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                semester={editingSemester}
                onSuccess={fetchSemesters}
            />
        </div>
    );
};

const DateCard = ({ label, start, end, icon: Icon, color = "blue" }) => {
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '---';
    const themes = {
        blue: 'bg-blue-50/50 text-blue-600 border-blue-100',
        indigo: 'bg-indigo-50/50 text-indigo-600 border-indigo-100'
    };
    return (
        <div className={`p-5 rounded-3xl border-2 ${themes[color]}`}>
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black opacity-40 uppercase">Start</p>
                    <p className="text-sm font-black tracking-tight">{formatDate(start)}</p>
                </div>
                <div className="w-px h-6 bg-current opacity-10"></div>
                <div className="text-right">
                    <p className="text-[10px] font-black opacity-40 uppercase">End</p>
                    <p className="text-sm font-black tracking-tight">{formatDate(end)}</p>
                </div>
            </div>
        </div>
    );
};

export default RegistrarSemesterManagement;
