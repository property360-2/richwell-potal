import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    AlertTriangle, 
    XCircle, 
    Search, 
    Play, 
    ShieldAlert, 
    ChevronRight,
    Loader2,
    Calendar,
    Users,
    CheckCircle2,
    BookOpen
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const RegistrarINCManagement = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [incRecords, setIncRecords] = useState([]);
    const [summary, setSummary] = useState({
        total_count: 0,
        expired_count: 0,
        expiring_soon_count: 0
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpiredOnly, setShowExpiredOnly] = useState(false);

    useEffect(() => {
        fetchINCData();
    }, [showExpiredOnly]);

    const fetchINCData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (showExpiredOnly) params.append('include_expired', 'true');
            
            const res = await fetch(`/api/v1/registrar/inc-report/?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setIncRecords(data.inc_records || []);
                setSummary({
                    total_count: data.total_count || 0,
                    expired_count: data.expired_count || 0,
                    expiring_soon_count: data.expiring_soon_count || 0
                });
            }
        } catch (err) {
            error('Failed to sync grading records');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessExpired = async () => {
        if (!window.confirm(`Are you sure you want to process ${summary.expired_count} expired INC grades? They will be converted to 5.00 (Failure).`)) return;

        try {
            setProcessing(true);
            const res = await fetch('/api/v1/registrar/process-expired-incs/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dry_run: false })
            });

            if (res.ok) {
                const data = await res.json();
                success(`Successfully processed ${data.processed_count} records`);
                fetchINCData();
            } else {
                error('Processing operation failed');
            }
        } catch (err) {
            error('Network failure during batch process');
        } finally {
            setProcessing(false);
        }
    };

    const filtered = incRecords.filter(r => 
        (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.student_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.subject_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.subject_title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="INC Report Management" description="Monitor and process incomplete grade resolutions across the institution." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">INC Report Center</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Grading Integrity & Expiration Tracking</p>
                </div>
                <div className="flex gap-4">
                    {summary.expired_count > 0 && (
                        <Button 
                            variant="danger" 
                            icon={ShieldAlert} 
                            onClick={handleProcessExpired}
                            loading={processing}
                        >
                            PROCESS EXPIRED ({summary.expired_count})
                        </Button>
                    )}
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <MetricCard 
                    label="Active INCs" 
                    value={summary.total_count - summary.expired_count} 
                    icon={Clock} 
                    color="blue" 
                />
                <MetricCard 
                    label="Expiring (30d)" 
                    value={summary.expiring_soon_count} 
                    icon={AlertTriangle} 
                    color="amber" 
                />
                <MetricCard 
                    label="Expired Records" 
                    value={summary.expired_count} 
                    icon={XCircle} 
                    color="rose" 
                />
            </div>

            {/* Action Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-8 flex flex-col md:flex-row gap-6 items-center">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filter by student, code or text..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                    />
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-2 pr-6 rounded-[24px]">
                    <button 
                        onClick={() => setShowExpiredOnly(!showExpiredOnly)}
                        className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${showExpiredOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {showExpiredOnly ? 'SHOWING EXPIRED' : 'INCLUDE EXPIRED'}
                    </button>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {filtered.length} Records Found
                    </span>
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Subject</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrollment Cycle</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Remaining</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" /></td>
                            </tr>
                        ) : filtered.map((record) => (
                            <tr key={`${record.student_number}-${record.subject_code}`} className={`hover:bg-gray-50/30 transition-colors group ${record.is_expired ? 'bg-rose-50/30' : ''}`}>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm
                                            ${record.is_expired ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {record.subject_code.slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{record.student_name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{record.subject_code} • {record.subject_title}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-tight">{record.semester}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{record.academic_year}</p>
                                </td>
                                <td className="px-8 py-5">
                                    {record.is_expired ? (
                                        <div className="flex items-center gap-2 text-rose-600">
                                            <ShieldAlert className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase">Expired</span>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center gap-2 ${record.days_until_expiration <= 30 ? 'text-amber-600' : 'text-blue-600'}`}>
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase">{record.days_until_expiration} Days Left</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2
                                        ${record.is_expired ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                          record.days_until_expiration <= 30 ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                          'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {record.is_expired ? 'Converted/Expired' : 'Active INC'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && !loading && (
                    <div className="py-20 text-center opacity-30">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">All incomplete records resolved</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, color }) => {
    const themes = {
        blue: 'text-blue-600 bg-blue-50/50 border-blue-100 shadow-blue-500/5',
        amber: 'text-amber-600 bg-amber-50/50 border-amber-100 shadow-amber-500/5',
        rose: 'text-rose-600 bg-rose-50/50 border-rose-100 shadow-rose-500/5'
    };

    return (
        <div className={`p-8 rounded-[40px] border-2 transition-all hover:scale-[1.02] flex items-center justify-between group ${themes[color]}`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{label}</p>
                <p className="text-5xl font-black tracking-tighter">{value}</p>
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all">
                <Icon className="w-8 h-8" />
            </div>
        </div>
    );
};

export default RegistrarINCManagement;
