import React, { useState, useEffect } from 'react';
import { 
    Lock, 
    Unlock, 
    Search, 
    Filter, 
    AlertCircle, 
    CheckCircle2, 
    ShieldAlert, 
    Loader2,
    BookOpen,
    Info
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const RegistrarGradeFinalization = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [sections, setSections] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ready'); // all, ready, finalized, pending

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/academic/sections-finalization/');
            if (res.ok) {
                const data = await res.json();
                setSections(data.sections || data || []);
            }
        } catch (err) {
            error('Failed to sync finalization registry');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async (section) => {
        if (!window.confirm(`Are you sure you want to finalize grades for ${section.subject_code} - ${section.section_name}? This action locks the grades and prevents professor edits.`)) return;

        try {
            setProcessingId(section.section_id);
            const res = await fetch(`/api/v1/academic/sections/${section.section_id}/finalize-grades/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id: section.subject_id })
            });

            if (res.ok) {
                success(`${section.subject_code} grades finalized and locked`);
                fetchSections();
            } else {
                const errData = await res.json();
                if (errData.ungraded_students) {
                    error(`Cannot finalize: ${errData.ungraded_students.length} students are missing grades.`);
                } else {
                    error(errData.error || 'Finalization attempt failed');
                }
            }
        } catch (err) {
            error('Communication error during locking process');
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = sections.filter(s => {
        const matchesSearch = s.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.subject_title.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' ? true :
                            statusFilter === 'ready' ? s.is_ready && s.status !== 'Finalized' :
                            statusFilter === 'finalized' ? s.status === 'Finalized' :
                            statusFilter === 'pending' ? !s.is_ready && s.status !== 'Finalized' : true;

        return matchesSearch && matchesStatus;
    });

    const readyCount = sections.filter(s => s.is_ready && s.status !== 'Finalized').length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Grade Finalization" description="Institutional grade locking and final record auditing." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Grade Finalization</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Authority Level Grade Locking & Auditing</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 px-6 rounded-[24px] border border-gray-100 shadow-xl shadow-blue-500/5">
                    <div className="text-center border-r border-gray-100 pr-6 mr-3 py-2">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Ready to Lock</p>
                        <p className="text-2xl font-black text-blue-600 leading-none">{readyCount}</p>
                    </div>
                    <div className="text-center py-2">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sections</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{sections.length}</p>
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-10 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative group flex-1">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Filter by subject code, section name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-8 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex bg-gray-50 p-1.5 rounded-[20px] shadow-inner">
                        <FilterButton active={statusFilter === 'all'} label="ALL" onClick={() => setStatusFilter('all')} />
                        <FilterButton active={statusFilter === 'ready'} label="READY" onClick={() => setStatusFilter('ready')} />
                        <FilterButton active={statusFilter === 'pending'} label="PENDING" onClick={() => setStatusFilter('pending')} />
                        <FilterButton active={statusFilter === 'finalized'} label="LOCKED" onClick={() => setStatusFilter('finalized')} />
                    </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-blue-900/60 leading-relaxed">
                        A section is marked as <span className="text-blue-600 font-black tracking-tighter uppercase px-1">Ready</span> when the professor has graded all enrolled students. Finalizing grades triggers institutional credit recording and prevents further modifications.
                    </p>
                </div>
            </div>

            {/* Sections Data Grid */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-24 flex justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>
                ) : (
                    filtered.map((section) => (
                        <FinalizationCard 
                            key={`${section.section_id}-${section.subject_id}`}
                            section={section}
                            isProcessing={processingId === section.section_id}
                            onFinalize={() => handleFinalize(section)}
                        />
                    ))
                )}
                {!loading && filtered.length === 0 && (
                    <div className="py-24 text-center opacity-20">
                        <CheckCircle2 className="w-20 h-20 mx-auto mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Queue cleared for selected status</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const FilterButton = ({ active, label, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
            ${active ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
    >
        {label}
    </button>
);

const FinalizationCard = ({ section, isProcessing, onFinalize }) => {
    const isReady = section.is_ready;
    const isFinalized = section.status === 'Finalized';
    
    // Calculate grading progress
    const total = section.stats?.total || 1;
    const graded = section.stats?.graded || 0;
    const progress = Math.min(100, Math.round((graded / total) * 100));

    return (
        <div className={`p-6 bg-white border border-gray-100 rounded-[32px] transition-all flex flex-col md:flex-row items-center justify-between gap-6
            ${isReady && !isFinalized ? 'ring-2 ring-blue-600 border-transparent shadow-2xl shadow-blue-500/10' : 'hover:shadow-xl'}`}>
            
            <div className="flex items-center gap-6 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner
                    ${isFinalized ? 'bg-gray-100 text-gray-400' : isReady ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {isFinalized ? <Lock className="w-6 h-6" /> : isReady ? <Unlock className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none">{section.subject_code}</h4>
                        <span className="text-gray-200">•</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{section.section_name}</span>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border-2
                            ${isFinalized ? 'bg-gray-50 text-gray-400 border-gray-100' : isReady ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {section.status}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 leading-none">{section.subject_title}</p>
                    
                    {/* Performance Micro-Metrics */}
                    <div className="flex items-center gap-4 mt-3">
                        <MetricPill label="Passed" value={section.stats?.passed || 0} color="green" />
                        <MetricPill label="Failed" value={section.stats?.failed || 0} color="red" />
                        <MetricPill label="INC" value={section.stats?.inc || 0} color="amber" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-10 w-full md:w-auto">
                <div className="w-full md:w-40 flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Submission Progress</span>
                        <span className="text-[11px] font-black text-gray-900 leading-none">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex-shrink-0">
                    {isFinalized ? (
                        <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2 opacity-50 cursor-not-allowed">
                            <Lock className="w-4 h-4 text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LOCKED</span>
                        </div>
                    ) : (
                        <Button 
                            variant={isReady ? "primary" : "secondary"}
                            disabled={!isReady || isProcessing}
                            loading={isProcessing}
                            onClick={onFinalize}
                            icon={Lock}
                            className="py-4 px-8 rounded-2xl"
                        >
                            FINALIZE GRADES
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricPill = ({ label, value, color }) => {
    const colors = {
        green: 'text-green-600 bg-green-50 border-green-100',
        red: 'text-red-600 bg-red-50 border-red-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100'
    };
    return (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter ${colors[color]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
            {label}: {value}
        </span>
    );
};

export default RegistrarGradeFinalization;
