import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    ArrowLeft, 
    Clock, 
    MapPin, 
    BookOpen,
    Loader2,
    Search,
    ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/shared/SEO';
import ProfessorService from './services/ProfessorService';

const ProfessorSchedule = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState(null);
    const [schedule, setSchedule] = useState({});

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        try {
            const res = await fetch('/api/v1/academics/semesters/');
            if (res.ok) {
                const data = await res.json();
                const semList = data.results || data || [];
                setSemesters(semList);
                const current = semList.find(s => s.is_current) || semList[0];
                if (current) {
                    setSelectedSemesterId(current.id);
                    fetchSchedule(current.id);
                }
            }
        } catch (err) {
            error('Failed to load terms');
        }
    };

    const fetchSchedule = async (semesterId) => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await ProfessorService.getDashboardData(user.id, semesterId);
            if (data) setSchedule(data.schedule || {});
        } catch (err) {
            error('Failed to sync schedule records');
        } finally {
            setLoading(false);
        }
    };

    const handleSemesterChange = (id) => {
        setSelectedSemesterId(id);
        fetchSchedule(id);
    };

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Teaching Schedule" description="Full weekly teaching schedule and room assignments." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/professor/dashboard')}
                        className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Teaching Schedule</h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Academic Engagement Planning</p>
                    </div>
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
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform"><ChevronDown className="w-4 h-4" /></div>
                </div>
            </div>

            {loading ? (
                <div className="h-96 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {days.map(day => (
                        <DayCard key={day} day={day} slots={schedule[day] || []} />
                    ))}
                </div>
            )}
        </div>
    );
};

const DayCard = ({ day, slots }) => {
    const hasSlots = slots.length > 0;

    return (
        <div className={`bg-white rounded-[40px] border border-gray-100 p-8 shadow-2xl shadow-blue-500/5 transition-all
            ${hasSlots ? 'ring-2 ring-blue-600/5' : 'opacity-60 bg-gray-50/50 grayscale'}`}>
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">{day}</h3>
                {hasSlots && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100">
                        {slots.length} SESSIONS
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {slots.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full border border-gray-200 border-dashed flex items-center justify-center text-gray-300 mb-3 font-black text-[9px]">OFF</div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No engagements</p>
                    </div>
                ) : slots.map((slot, idx) => (
                    <div key={idx} className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[10px] font-black text-gray-900 shadow-inner px-2 py-0.5 bg-white border border-gray-100 rounded-md">
                                {slot.start_time} - {slot.end_time}
                            </span>
                        </div>
                        <h4 className="font-black text-sm text-gray-900 tracking-tight leading-none mb-2">{slot.subject_code}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-4">{slot.section}</p>
                        
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-100 rounded-lg text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-500">{slot.room || 'TBA'}</span>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfessorSchedule;
