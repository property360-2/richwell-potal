import React from 'react';
import { Shuffle, CircleUser, MapPin, ArrowRight } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import styles from '../SchedulingPage.module.css';

const TimetableGrid = ({ 
    profSchedules, 
    handleOpenSetup, 
    setIsRandomizeModalOpen 
}) => {
    const TIME_SLOTS = [];
    for (let h = 7; h <= 19; h++) {
        TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
    }
    const GRID_DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
    const DAY_LABELS = { M: 'Mon', T: 'Tue', W: 'Wed', TH: 'Thu', F: 'Fri', S: 'Sat' };
    const COLORS = [
        { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
        { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
        { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
        { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
        { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
        { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
        { bg: '#ecfeff', border: '#06b6d4', text: '#155e75' },
        { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    ];

    // Build color map per subject code
    const subjectCodes = [...new Set(profSchedules.map(s => s.subject_code))];
    const colorMap = {};
    subjectCodes.forEach((code, i) => { colorMap[code] = COLORS[i % COLORS.length]; });

    // Parse time helper
    const timeToMinutes = (t) => {
        if (!t) return 0;
        const [h, m] = t.substring(0, 5).split(':').map(Number);
        return h * 60 + m;
    };
    const startMinute = 7 * 60; // 7:00 AM
    const SLOT_HEIGHT = 28; // px per 30 minutes
    
    // Find scheduled blocks per day
    const getBlocksForDay = (dayKey) => {
        return profSchedules.filter(s => s.days && s.days.includes(dayKey) && s.start_time && s.end_time);
    };

    return (
        <div className="lg:col-span-9">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">Weekly Timetable</h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="xs"
                        style={{ fontWeight: 800 }}
                        icon={<Shuffle size={14} />}
                        onClick={() => setIsRandomizeModalOpen(true)}
                    >
                        RANDOMIZE
                    </Button>
                    <Badge variant="primary" className="text-[10px] font-black">{profSchedules.length} Components</Badge>
                </div>
            </div>
            <div className={styles.timetableGridWrapper}>
                <div className={styles.timetableGrid} style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                    {/* Header row */}
                    <div className={styles.ttCorner}></div>
                    {GRID_DAYS.map(d => (
                        <div key={d} className={styles.ttDayHeader}>{DAY_LABELS[d]}</div>
                    ))}

                    {/* Time rows */}
                    {TIME_SLOTS.map((slot, idx) => (
                        <React.Fragment key={slot}>
                            <div className={`${styles.ttTimeLabel} ${slot.endsWith(':00') ? '' : styles.ttTimeHalf}`}>
                                {slot.endsWith(':00') ? slot : ''}
                            </div>
                            {GRID_DAYS.map(dayKey => (
                                <div key={`${dayKey}-${slot}`} className={`${styles.ttCell} ${slot.endsWith(':00') ? styles.ttCellHour : ''}`}>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>

                {/* Floating schedule blocks */}
                <div className={styles.ttBlocksOverlay} style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                    <div></div>
                    {GRID_DAYS.map((dayKey, dayIdx) => {
                        const blocks = getBlocksForDay(dayKey);
                        return (
                            <div key={dayKey} className={styles.ttDayColumn}>
                                {blocks.map(sched => {
                                    const top = ((timeToMinutes(sched.start_time) - startMinute) / 30) * SLOT_HEIGHT;
                                    const duration = timeToMinutes(sched.end_time) - timeToMinutes(sched.start_time);
                                    const height = (duration / 30) * SLOT_HEIGHT;
                                    const color = colorMap[sched.subject_code] || COLORS[0];

                                    return (
                                        <div
                                            key={`${sched.id}-${dayKey}`}
                                            className={styles.ttBlock}
                                            style={{
                                                top: `${top}px`,
                                                height: `${Math.max(height - 2, SLOT_HEIGHT - 2)}px`,
                                                backgroundColor: color.bg,
                                                borderLeft: `3px solid ${color.border}`,
                                                color: color.text,
                                            }}
                                            onClick={() => handleOpenSetup(sched)}
                                            title={`${sched.subject_code} (${sched.component_type}) — ${sched.professor_name || 'No Prof'} — ${sched.room_name || 'No Room'}`}
                                        >
                                            <div className="flex flex-col h-full overflow-hidden p-0.5" style={{ fontSize: '9px' }}>
                                                <div className="font-black truncate flex items-center gap-1 leading-tight mb-1">
                                                    {sched.subject_code}
                                                    <span className="opacity-60 text-[7px] font-bold">({sched.component_type})</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5 mt-auto">
                                                    {height > 42 && (
                                                        <div className="flex items-center gap-1 opacity-80 truncate font-black tracking-tight leading-none">
                                                            <CircleUser size={10} strokeWidth={3} className="shrink-0" />
                                                            {sched.professor_name || 'TBA'}
                                                        </div>
                                                    )}
                                                    {height > 58 && (
                                                        <div className="flex items-center gap-1 opacity-80 truncate font-black tracking-tight leading-none">
                                                            <MapPin size={10} strokeWidth={3} className="shrink-0" />
                                                            {sched.room_name || 'TBA'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TimetableGrid;
