import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { studentsApi } from '../../api/students';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
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
      setLoading(true);
      const termRes = await api.get('terms/?is_active=true');
      const term = termRes.data.results?.[0] || termRes.data[0];
      setCurrentTerm(term);

      if (term) {
        const res = await studentsApi.getSchedule(term.id);
        setSchedule(res.data);
      }
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

  if (loading) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (currentTerm && !currentTerm.schedule_published) {
    return (
      <div className="student-portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Calendar size={64} style={{ color: 'var(--color-border)', marginBottom: 'var(--space-6)' }} />
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Schedule Still Finalizing</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              The Dean is still finalizing the room assignments and professors for this term. 
              Your detailed timetable will be visible here once it is officially published.
            </p>
        </div>
      </div>
    );
  }

    const sectionName = schedule.length > 0 ? schedule[0].section_name : '';

    return (
        <div className="student-portal-container">
            <div className="portal-section">
                <div className="section-header">
                    <div>
                        <h3 className="section-title">
                            <Calendar size={20} className="text-blue-500" /> 
                            Weekly Class Schedule
                        </h3>
                        {sectionName && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 600, marginLeft: '32px', marginTop: '4px' }}>
                                Section: <span style={{ color: 'var(--color-primary)' }}>{sectionName}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                         <Badge variant="neutral">{currentTerm?.academic_year} {currentTerm?.semester_type === '1' ? '1st Sem' : currentTerm?.semester_type === '2' ? '2nd Sem' : 'Summer'}</Badge>
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
                                                    zIndex: 10,
                                                    justifyContent: 'flex-start',
                                                    alignItems: 'flex-start',
                                                    padding: '10px'
                                                }}
                                            >
                                                <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>{subject.room}</span>
                                                <h4 style={{ fontSize: '12px', margin: '0 0 4px 0', lineHeight: 1.2 }}>{subject.subject_code}</h4>
                                                <span style={{ fontSize: '10px', opacity: 0.8, marginTop: 'auto' }}>{subject.professor}</span>
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
                             <p className="text-xs font-bold text-slate-500 uppercase">Section</p>
                             <p className="font-bold text-slate-900">{sectionName || 'N/A'}</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                         <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><MapPin size={18}/></div>
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                             <p className="font-bold text-slate-900">Officially Enrolled</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                         <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><User size={18}/></div>
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Academic Term</p>
                             <p className="font-bold text-slate-900">{currentTerm?.code}</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timetable;
