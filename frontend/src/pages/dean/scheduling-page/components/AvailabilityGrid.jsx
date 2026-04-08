import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import styles from '../SchedulingPage.module.css';

const AvailabilityGrid = ({ 
    profAvailability, 
    profSchedules, 
    isSavingAvailability, 
    onToggleAvailability, 
    onQuickAvailability 
}) => {
    const DAYS = [
        { key: 'M', label: 'Monday' },
        { key: 'T', label: 'Tuesday' },
        { key: 'W', label: 'Wednesday' },
        { key: 'TH', label: 'Thursday' },
        { key: 'F', label: 'Friday' },
        { key: 'S', label: 'Saturday' },
    ];
    const SESSIONS = ['AM', 'PM'];

    return (
        <Card title="Fixed Weekly Availability Grid" className="shadow-sm border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                    Click cells to toggle professor availability across days and sessions.
                </p>
                <div className="flex gap-2">
                    <Button size="xs" variant="ghost" onClick={() => onQuickAvailability('AM')}>Fill AM</Button>
                    <Button size="xs" variant="ghost" onClick={() => onQuickAvailability('PM')}>Fill PM</Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className={`${styles.availabilityGrid} min-w-[700px]`}>
                    <div className={styles.gridCorner}></div>
                    {DAYS.map(d => (
                        <div key={d.key} className={`${styles.gridHeaderDay} mb-2`}>{d.label}</div>
                    ))}
                    
                    {SESSIONS.map(session => (
                        <React.Fragment key={session}>
                            <div className={styles.gridLabelSession}>{session}</div>
                            {DAYS.map(day => {
                                const isAvailable = profAvailability.some(a => a.day === day.key && a.session === session);
                                const schedule = profSchedules.find(s => s.days.includes(day.key) && s.section_session === session);
                                
                                return (
                                    <div 
                                        key={`${day.key}-${session}`}
                                        className={`${styles.gridCell} ${isAvailable ? styles.available : ''} ${schedule ? styles.occupied : ''} ${isSavingAvailability ? 'opacity-50 pointer-events-none' : ''}`}
                                        onClick={() => !schedule && onToggleAvailability(day.key, session)}
                                    >
                                        {schedule ? (
                                            <div className={styles.occupiedIndicator} title={`${schedule.subject_code} — ${schedule.section_name}`}>
                                                <div className={styles.occupiedIndicatorDot}></div>
                                            </div>
                                        ) : isAvailable ? (
                                            <CheckCircle2 size={16} className="text-blue-500" />
                                        ) : null}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default AvailabilityGrid;
