import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    Download, 
    Filter, 
    Search, 
    Calendar,
    ChevronDown,
    Loader2,
    FileText,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    LucidePieChart
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const HeadReports = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    const [semesters, setSemesters] = useState([]);
    const [programs, setPrograms] = useState([]);
    
    const [reportType, setReportType] = useState('enrollment');
    const [filters, setFilters] = useState({
        semester: '',
        program: '',
        dateFrom: '',
        dateTo: ''
    });
    
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        fetchReferenceData();
    }, []);

    const fetchReferenceData = async () => {
        try {
            const [semRes, progRes] = await Promise.all([
                fetch('/api/v1/academics/semesters/'),
                fetch('/api/v1/academics/programs/')
            ]);
            
            const semData = await semRes.json();
            const progData = await progRes.json();
            
            const sems = semData.results || semData || [];
            setSemesters(sems);
            setPrograms(progData.results || progData || []);
            
            const active = sems.find(s => s.is_current);
            if (active) setFilters(f => ({ ...f, semester: active.id }));
            
        } catch (err) {
            error('Failed to load filter parameters');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const data = await HeadService.getReports({ type: reportType, ...filters });
            if (data && data.success) {
                setReportData(data.results);
                success(`Generated ${data.count} records`);
            } else {
                setReportData([]);
                info('No records matching the filter criteria');
            }
        } catch (err) {
            error('Report generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = () => {
        if (!reportData || reportData.length === 0) return;
        
        const headers = Object.keys(reportData[0]);
        const csvContent = [
            headers.join(','),
            ...reportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Academic Reports" description="Institutional analytics and enrollment reports." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Analytics Hub
                        <span className="text-blue-600/20"><LucidePieChart className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Institutional Record Generation & Data Export
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button 
                        variant="secondary" 
                        icon={Download} 
                        onClick={handleExport}
                        disabled={!reportData || reportData.length === 0}
                    >
                        EXPORT TO CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Report Configuration</h3>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Term</label>
                                <select 
                                    value={filters.semester}
                                    onChange={(e) => setFilters(f => ({ ...f, semester: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-400 transition-all"
                                >
                                    <option value="">All Semesters</option>
                                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name} {s.academic_year}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Program Scope</label>
                                <select 
                                    value={filters.program}
                                    onChange={(e) => setFilters(f => ({ ...f, program: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-400 transition-all"
                                >
                                    <option value="">All Programs</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4">
                                <Button 
                                    variant="primary" 
                                    className="w-full py-4 text-[10px]" 
                                    icon={generating ? Loader2 : TrendingUp} 
                                    onClick={handleGenerate}
                                    disabled={generating}
                                >
                                    {generating ? 'GENERATING...' : 'GENERATE REPORT'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-indigo-50 rounded-[40px] border border-indigo-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white"><BarChart3 className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Efficiency Tip</span>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-600/70 leading-relaxed">
                            Filter by program to see deep-dives into departmental performance metrics.
                        </p>
                    </div>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Tabs */}
                    <div className="flex gap-4 p-2 bg-gray-100 rounded-[30px] w-fit">
                        {['enrollment', 'grades'].map(type => (
                            <button
                                key={type}
                                onClick={() => setReportType(type)}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${reportType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {type === 'enrollment' ? 'Enrollment Mastery' : 'Academic Performance'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden min-h-[600px]">
                        {!reportData ? (
                            <div className="h-[600px] flex flex-col items-center justify-center opacity-20">
                                <FileText className="w-16 h-16 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Select filters and generate your report</p>
                            </div>
                        ) : reportData.length === 0 ? (
                            <div className="h-[600px] flex flex-col items-center justify-center">
                                <div className="p-6 bg-red-50 rounded-full mb-4"><AlertCircle className="w-10 h-10 text-red-400" /></div>
                                <p className="text-[10px] font-black text-red-900 uppercase tracking-widest">No data available for this selection</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            {Object.keys(reportData[0]).slice(0, 6).map(h => (
                                                <th key={h} className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[150px]">{h.replace(/_/g, ' ')}</th>
                                            ))}
                                            <th className="px-8 py-6 text-right"><ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto" /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                {Object.values(row).slice(0, 6).map((val, i) => (
                                                    <td key={i} className="px-8 py-5">
                                                        {typeof val === 'string' && val.length > 50 ? (
                                                            <span className="text-[10px] font-bold text-gray-500">{val.slice(0, 50)}...</span>
                                                        ) : (
                                                            <span className={`text-[10px] font-black
                                                                ${i === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                                                {val}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-8 py-5"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeadReports;
