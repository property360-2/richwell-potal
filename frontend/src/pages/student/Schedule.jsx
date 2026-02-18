import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    List, 
    Grid, 
    Clock, 
    MapPin, 
    User as UserIcon,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { useSchedule } from '../../hooks/useSchedule';

const DAYS = [
    { code: 'MON', name: 'Monday', short: 'Mon' },
    { code: 'TUE', name: 'Tuesday', short: 'Tue' },
    { code: 'WED', name: 'Wednesday', short: 'Wed' },
    { code: 'THU', name: 'Thursday', short: 'Thu' },
    { code: 'FRI', name: 'Friday', short: 'Fri' },
    { code: 'SAT', name: 'Saturday', short: 'Sat' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 19; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

const COLORS = [
    'border-blue-500 bg-blue-50 text-blue-700',
    'border-indigo-500 bg-indigo-50 text-indigo-700',
    'border-purple-500 bg-purple-50 text-purple-700',
    'border-pink-500 bg-pink-50 text-pink-700',
    'border-rose-500 bg-rose-50 text-rose-700',
    'border-emerald-500 bg-emerald-50 text-emerald-700',
    'border-teal-500 bg-teal-50 text-teal-700',
    'border-cyan-500 bg-cyan-50 text-cyan-700'
];

const StudentSchedule = () => {
    const { user } = useAuth();
    const { error } = useToast();

    const { data: scheduleData, isLoading: loading, error: queryError } = useSchedule();
    const schedule = scheduleData?.schedule || [];
    const semesterInfo = scheduleData?.semester || '';

    useEffect(() => {
        if (queryError) {
            error('Failed to load schedule');
        }
    }, [queryError]);

    const getSubjectColor = (code) => {
        const uniqueCodes = [...new Set(schedule.map(s => s.subject_code))];
        const index = uniqueCodes.indexOf(code);
        return COLORS[index % COLORS.length];
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Class Schedule</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">{semesterInfo || 'Current Semester'}</p>
                </div>
                
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-full md:w-auto">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Grid className="w-4 h-4" /> TIMETABLE
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List className="w-4 h-4" /> LIST VIEW
                    </button>
                </div>
            </div>

            {schedule.length === 0 ? (
                <div className="bg-white rounded-[40px] border border-gray-100 p-20 text-center shadow-2xl shadow-gray-500/5">
                    <Calendar className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">No classes scheduled</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Finish your enrollment to see your classes.</p>
                </div>
            ) : (
                viewMode === 'grid' ? <Timetable schedule={schedule} getColor={getSubjectColor} /> : <ListView schedule={schedule} getColor={getSubjectColor} />
            )}
        </div>
    );
};

const Timetable = ({ schedule, getColor }) => {
    return (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-x-auto">
            <div className="min-w-[1000px]">
                <div className="grid grid-cols-7 border-b border-gray-50">
                    <div className="p-6 bg-gray-50/50 border-r border-gray-50"></div>
                    {DAYS.map(day => (
                        <div key={day.code} className="p-6 text-center border-r border-gray-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{day.short}</p>
                            <p className="font-black text-gray-900">{day.name}</p>
                        </div>
                    ))}
                </div>

                <div className="relative">
                    {TIME_SLOTS.map(time => (
                        <div key={time} className="grid grid-cols-7 border-b border-gray-50 min-h-[100px]">
                            <div className="p-4 text-center bg-gray-50/30 border-r border-gray-50">
                                <span className="text-[10px] font-black text-gray-400">{time}</span>
                            </div>
                            {DAYS.map(day => (
                                <div key={day.code} className="border-r border-gray-50 relative group">
                                    {renderSlot(day.code, time, schedule, getColor)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const renderSlot = (day, time, schedule, getColor) => {
    const slot = schedule.find(s => {
        if (s.day !== day) return false;
        const [sh, sm] = s.start_time.split(':');
        const [th, tm] = time.split(':');
        return sh === th && sm === tm;
    });

    if (!slot) return null;

    const start = parseInt(slot.start_time.split(':')[0]);
    const end = parseInt(slot.end_time.split(':')[0]);
    const duration = end - start;

    return (
        <div 
            className={`absolute inset-1 rounded-2xl border-l-[6px] p-4 z-10 animate-in zoom-in-95 duration-300 ${getColor(slot.subject_code)}`}
            style={{ height: `calc(${duration * 100}% + ${(duration - 1) * 1}px - 8px)` }}
        >
            <div className="h-full flex flex-col justify-between overflow-hidden">
                <div>
                    <p className="font-black text-xs leading-tight mb-1">{slot.subject_code}</p>
                    <p className="text-[9px] font-bold uppercase leading-tight opacity-80 truncate">{slot.subject_title}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1 opacity-70">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[8px] font-black">{slot.room || 'TBA'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ListView = ({ schedule, getColor }) => {
    const grouped = DAYS.reduce((acc, day) => {
        const daySlots = schedule.filter(s => s.day === day.code).sort((a, b) => a.start_time.localeCompare(b.start_time));
        if (daySlots.length > 0) acc.push({ day, slots: daySlots });
        return acc;
    }, []);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
            {grouped.map(({ day, slots }) => (
                <div key={day.code}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xs font-black">
                            {day.short}
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{day.name}</h3>
                        <div className="h-px flex-1 bg-gray-100"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {slots.map((slot, i) => (
                            <div key={i} className={`bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-500/5 border-l-[6px] ${getColor(slot.subject_code)} transition-transform hover:scale-[1.02]`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/50 px-3 py-1 rounded-lg">
                                        <p className="text-[10px] font-black">{slot.start_time} - {slot.end_time}</p>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">{slot.section}</span>
                                </div>
                                <p className="font-black text-gray-900 mb-1">{slot.subject_code}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 truncate">{slot.subject_title}</p>
                                <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/40 rounded-lg">
                                            <UserIcon className="w-3 h-3" />
                                        </div>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter truncate max-w-[120px]">{slot.professor_name || 'TBA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/40 rounded-lg">
                                            <MapPin className="w-3 h-3" />
                                        </div>
                                        <span className="text-[9px] font-black text-gray-600 uppercase">{slot.room || 'TBA'}</span>
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

export default StudentSchedule;
