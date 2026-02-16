import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Search, 
    Filter, 
    ArrowRight, 
    Loader2, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    LayoutGrid,
    List
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SchedulingService } from '../services/SchedulingService';
import { useToast } from '../../../context/ToastContext';
import SchedulingEngine from './SchedulingEngine';

const SchedulesTab = () => {
    const { error: showError } = useToast();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, unscheduled, partial, complete
    const [selectedSection, setSelectedSection] = useState(null);
    const [viewMode, setViewMode] = useState('grid');

    const fetchSections = async () => {
        setLoading(true);
        try {
            // Fetch all sections to show progress
            // Note: In a real app we might need to filter by current semester
            const data = await SchedulingService.getSectionsProgress();
            setSections(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load sections for scheduling.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSections();
    }, []);

    const calculateProgress = (section) => {
        if (!section.subjects) return 0;
        const total = section.subjects.length;
        const scheduled = section.subjects.filter(s => s.schedule_slots && s.schedule_slots.length > 0).length;
        return {
            percentage: Math.round((scheduled / total) * 100),
            count: scheduled,
            total: total
        };
    };

    const filteredSections = sections.filter(section => {
        const matchesSearch = section.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             section.program_code?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const progress = calculateProgress(section);
        const matchesFilter = 
            filter === 'all' ? true :
            filter === 'unscheduled' ? progress.count === 0 :
            filter === 'partial' ? progress.count > 0 && progress.count < progress.total :
            filter === 'complete' ? progress.count === progress.total : true;
            
        return matchesSearch && matchesFilter;
    });

    if (selectedSection) {
        return (
            <SchedulingEngine 
                section={selectedSection} 
                onBack={() => {
                    setSelectedSection(null);
                    fetchSections(); // Refresh progress when coming back
                }} 
            />
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-500 rounded-[22px] flex items-center justify-center shadow-lg shadow-indigo-100 -rotate-3">
                        <Calendar className="text-white rotate-3" size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Scheduling Dashboard</h2>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Resource Distribution & Planning</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search section..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border-2 border-gray-100 text-gray-700 text-sm font-bold rounded-[20px] pl-12 pr-6 py-3.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-full md:w-[280px] shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-5 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2.5 px-4 py-2.5 text-indigo-600 bg-indigo-50 rounded-2xl mr-2">
                    <Filter size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest leading-none">Status Filter</span>
                </div>

                {['all', 'unscheduled', 'partial', 'complete'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filter === f 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        {f}
                    </button>
                ))}

                <div className="ml-auto flex items-center bg-gray-50 p-1.5 rounded-2xl">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm text-center">
                    <div className="relative">
                        <Loader2 className="text-indigo-600 animate-spin mb-4" size={56} />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-4">Analysing section workloads...</p>
                </div>
            ) : filteredSections.length > 0 ? (
                <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "flex flex-col gap-4"
                }>
                    {filteredSections.map(section => {
                        const progress = calculateProgress(section);
                        const isComplete = progress.percentage === 100;
                        const isNew = progress.count === 0;

                        return (
                            <div 
                                key={section.id} 
                                onClick={() => setSelectedSection(section)}
                                className="group bg-white rounded-[32px] border border-gray-100 p-8 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col h-full"
                            >
                                {/* Progress Indicator (Background) */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-1000" 
                                    style={{ width: `${progress.percentage}%` }}
                                ></div>

                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-[0.15em] rounded-full">
                                                {section.program_code}
                                            </span>
                                            <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-[0.15em] rounded-full">
                                                Year {section.year_level}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors italic tracking-tighter">
                                            {section.name}
                                        </h3>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                        isComplete ? 'bg-green-50 text-green-600' : 
                                        isNew ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {isComplete ? <CheckCircle2 size={24} /> : 
                                         isNew ? <AlertCircle size={24} /> : <Clock size={24} />}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduling Progress</span>
                                        <span className="text-sm font-black text-gray-900">{progress.percentage}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden flex">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${
                                                isComplete ? 'bg-green-500' : 'bg-indigo-500'
                                            }`}
                                            style={{ width: `${progress.percentage}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 font-bold italic">
                                        {progress.count} of {progress.total} subjects plotted
                                    </p>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {section.subjects?.length || 0} Total Units
                                    </span>
                                    <div className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px] group-hover:gap-3 transition-all">
                                        Manage
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 text-center">
                    <div className="p-6 bg-white rounded-[24px] shadow-sm mb-6">
                        <Calendar size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">No Sections Matching Filters</h3>
                    <p className="text-gray-500 text-sm font-medium mb-8">Try adjusting your filters or search query.</p>
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setSearchQuery('');
                            setFilter('all');
                        }}
                        className="rounded-2xl px-10 border-none bg-white shadow-sm"
                    >
                        Reset All Filters
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SchedulesTab;
