import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { studentsApi } from '../../api/students';
import { useAuth } from '../../hooks/useAuth';
import './StudentPortal.css';

const Timetable = () => {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTerm, setCurrentTerm] = useState(null);

    const days = ['M', 'T', 'W', 'TH', 'F', 'S'];
    const dayLabels = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'TH': 'Thursday', 'F': 'Friday', 'S': 'Saturday' };
    const timeSlots = [];
    for (let h = 7; h <= 20; h++) {
        timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    }

    useEffect(() => {
        // Fetch active term first then schedule
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            // Mocking term ID for now or fetching from user profile
            const termId = user?.student_profile?.latest_enrollment?.term || 1; 
            const res = await studentsApi.getSchedule(termId);
            setSchedule(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getSubjectForSlot = (day, time) => {
        const hour = parseInt(time.split(':')[0]);
        return schedule.find(s => {
            if (!s.days.includes(day)) return false;
            const startHour = parseInt(s.start_time.split(':')[0]);
            const endHour = parseInt(s.end_time.split(':')[0]);
            return hour >= startHour && hour < endHour;
        });
    };

    // Helper to assign a consistent color class to a subject
    const getSubjectColorClass = (code) => {
        const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = ['subject-1', 'subject-2', 'subject-3', 'subject-4', 'subject-5', 'subject-6'];
        return colors[hash % colors.length];
    };

    if (loading) return <div className="p-8">Loading timetable...</div>;

    return (
        <div className="student-portal-container">
            <div className="portal-section">
                <div className="section-header">
                    <h3 className="section-title"><Calendar size={20} className="text-blue-500" /> Weekly Class Schedule</h3>
                    <div className="flex gap-2">
                         <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">1st Sem 2023-2024</span>
                    </div>
                </div>

                <div className="timetable-grid">
                    {/* Header */}
                    <div className="timetable-header-cell">Time</div>
                    {days.map(d => (
                        <div key={d} className="timetable-header-cell">{dayLabels[d]}</div>
                    ))}

                    {/* Body */}
                    {timeSlots.map(time => (
                        <React.Fragment key={time}>
                            <div className="timetable-time-cell">{time}</div>
                            {days.map(day => {
                                const subject = getSubjectForSlot(day, time);
                                const isStart = subject && subject.start_time.startsWith(time.split(':')[0]);
                                
                                return (
                                    <div key={`${day}-${time}`} className="timetable-cell">
                                        {isStart && (
                                            <div 
                                                className={`subject-block ${getSubjectColorClass(subject.subject_code)}`}
                                                style={{ 
                                                    height: `${(parseInt(subject.end_time.split(':')[0]) - parseInt(subject.start_time.split(':')[0])) * 60 - 8}px`,
                                                    position: 'absolute',
                                                    top: '4px',
                                                    left: '4px',
                                                    right: '4px',
                                                    zIndex: 10
                                                }}
                                            >
                                                <h4>{subject.subject_code}</h4>
                                                <span className="font-bold">{subject.room}</span>
                                                <span className="text-[10px] truncate">{subject.professor}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                         <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={18}/></div>
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Total Hours</p>
                             <p className="font-bold text-slate-900">24 Hours / Week</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                         <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><MapPin size={18}/></div>
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Primary Room</p>
                             <p className="font-bold text-slate-900">Room 302 (Main)</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                         <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><User size={18}/></div>
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Adviser</p>
                             <p className="font-bold text-slate-900">Ms. Jane Doe</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timetable;
