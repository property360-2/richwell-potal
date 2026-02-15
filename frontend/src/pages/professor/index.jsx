import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Calendar, 
    Clock, 
    Award, 
    ChevronRight, 
    ArrowUpRight,
    Users,
    GraduationCap,
    Loader2,
    CalendarDays,
    Info,
    LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import ProfessorService from './services/ProfessorService';

const ProfessorDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeSemester, setActiveSemester] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        schedule: {},
        assigned_sections: []
    });

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const semester = await ProfessorService.getActiveSemester();
            setActiveSemester(semester);
            
            if (semester) {
                const data = await ProfessorService.getDashboardData(user.id, semester.id);
                if (data) setDashboardData(data);
            }
        } catch (err) {
            error('Failed to load instructor dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    const sections = dashboardData.assigned_sections || [];
    const subjects = user?.professor_profile?.assigned_subjects || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Professor Dashboard" description="Teaching schedule and grade management center." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Instructor Hub
                        <span className="text-blue-600/20"><LayoutDashboard className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        {activeSemester ? `${activeSemester.name} ${activeSemester.academic_year}` : 'No Active Semester'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" icon={CalendarDays} onClick={() => navigate('/professor/schedule')}>FULL SCHEDULE</Button>
                    <Button variant="primary" icon={Award} onClick={() => navigate('/professor/grades')}>SUBMIT GRADES</Button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Load & Stats */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Active Sections Card */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 opacity-50" />
                        <div className="relative">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Curriculum Load</h3>
                            <div className="space-y-6">
                                {sections.length === 0 ? (
                                    <div className="py-12 text-center opacity-20">
                                        <BookOpen className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase">No active sections</p>
                                    </div>
                                ) : sections.map((sec, idx) => (
                                    <SectionItem key={idx} section={sec} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatBox icon={Users} label="Students" value={sections.reduce((acc, s) => acc + (s.student_count || 0), 0)} color="blue" />
                        <StatBox icon={BookOpen} label="Subjects" value={subjects.length} color="indigo" />
                    </div>
                </div>

                {/* Right: Modern Timetable */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Weekly Timetable</h3>
                                <p className="text-xs font-bold text-gray-900 mt-1">Teaching Engagements</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                                <Clock className="w-3 h-3" /> 
                                Real-time Insight
                            </div>
                        </div>

                        <div className="space-y-8">
                            <WeeklyStaticGrid schedule={dashboardData.schedule} />
                        </div>
                    </div>

                    {/* Help/Notice Area */}
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] text-white shadow-xl shadow-blue-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl"><Info className="w-5 h-5" /></div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest mb-1">Grading Notice</h4>
                                <p className="text-[11px] font-bold text-blue-100/80 leading-relaxed">
                                    Grade submission for the current semester is now active. Please ensure all records are submitted before the institutional locking period.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionItem = ({ section }) => (
    <div className="flex items-center justify-between group/item cursor-pointer">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 font-black text-blue-600 text-xs group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                {section.subject_code?.slice(0, 3)}
            </div>
            <div>
                <p className="text-sm font-black text-gray-900 leading-tight group-hover/item:text-blue-600 transition-colors">{section.section_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <GraduationCap className="w-3 h-3 text-gray-300" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{section.subject_code}</span>
                </div>
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-200 group-hover/item:text-blue-400 group-hover/item:translate-x-1 transition-all" />
    </div>
);

const StatBox = ({ icon: Icon, label, value, color }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100'
    };
    return (
        <div className={`p-6 rounded-[32px] border ${colors[color]} shadow-lg shadow-blue-500/5`}>
            <div className="flex items-center justify-between mb-4 font-black">
                <Icon className="w-5 h-5 opacity-40" />
                <ArrowUpRight className="w-4 h-4 opacity-20" />
            </div>
            <p className="text-2xl font-black tracking-tighter leading-none">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">{label}</p>
        </div>
    );
};

const WeeklyStaticGrid = ({ schedule }) => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const activeDays = days.filter(d => schedule[d] && schedule[d].length > 0);

    if (activeDays.length === 0) {
        return (
            <div className="py-20 text-center opacity-20">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    Clear Schedule<br/>No Teaching Engagements Found
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {activeDays.map(day => (
                <div key={day} className="flex gap-8 group/day">
                    <div className="w-16 shrink-0 pt-2">
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] group-hover/day:text-blue-600 transition-colors">{day}</span>
                    </div>
                    <div className="flex-grow space-y-4 pb-8 border-b border-gray-50 last:border-0">
                        {schedule[day].map((slot, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border border-gray-100 rounded-[28px] hover:shadow-xl hover:shadow-blue-500/5 transition-all gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-900 shadow-inner">
                                        {slot.start_time} - {slot.end_time}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{slot.subject_code}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{slot.section}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-300">
                                    <div className="px-3 py-1 bg-indigo-50/50 rounded-lg border border-indigo-100/50 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                        ROOM {slot.room || 'TBA'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProfessorDashboard;
