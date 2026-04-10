import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, BookOpen, Users, MapPin, Briefcase, Award } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import { schedulingApi } from '../../../../api/scheduling';
import { termsApi } from '../../../../api/terms';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import styles from './FacultyLoadModal.module.css';

/**
 * FacultyLoadModal.jsx
 * 
 * A premium visualization modal that displays a professor's teaching schedule
 * in a comprehensive timetable grid layout. Features HSL-based color coding,
 * analytics badges, and responsive grid calculations.
 */

const FacultyLoadModal = ({ isOpen, onClose, professor }) => {
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    if (isOpen && professor) {
      fetchActiveTermAndLoad();
      setSelectedDetail(null);
    }
  }, [isOpen, professor]);

  const fetchActiveTermAndLoad = async () => {
    try {
      setLoading(true);
      setLoad(null); 
      
      const termRes = await termsApi.getTerms({ is_active: true });
      const active = termRes.data.results?.[0] || termRes.data[0];
      setActiveTerm(active);

      if (active) {
        const res = await schedulingApi.getProfessorInsights(professor.id, active.id);
        setLoad(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch faculty load:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Constants and Helpers ---
  const GRID_DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
  const DAY_LABELS = { 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'TH': 'Thu', 'F': 'Fri', 'S': 'Sat' };
  const FULL_DAY_MAP = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'TH', 'Friday': 'F', 'Saturday': 'S' };
  
  const START_HOUR = 7;
  const END_HOUR = 22; // Extended for night classes and bottom padding
  const SLOT_HEIGHT = 28; // Matches CSS
  const startMinute = START_HOUR * 60;
  
  const TIME_SLOTS = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < END_HOUR) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const insights = useMemo(() => {
    if (!load) return { totalMinutes: 0, subjectCount: 0 };
    let total = 0;
    const subjects = new Set();
    Object.values(load).flat().forEach(item => {
      const [start, end] = item.time.split(' - ');
      total += (timeToMinutes(end) - timeToMinutes(start));
      subjects.add(item.subject.split(' - ')[0]); // Get code
    });
    return { 
      totalHours: (total / 60).toFixed(1),
      subjectCount: subjects.size 
    };
  }, [load]);

  const getBlocksForDay = (dayKey) => {
    if (!load) return [];
    const fullDayName = Object.keys(FULL_DAY_MAP).find(k => FULL_DAY_MAP[k] === dayKey);
    return load[fullDayName] || [];
  };

  const getHSLColor = (subject) => {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return {
      bg: `hsla(${h}, 70%, 95%, 1)`,
      border: `hsla(${h}, 70%, 45%, 1)`,
      text: `hsla(${h}, 70%, 25%, 1)`
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Faculty Teaching Load"
      size="lg"
    >
      <>
        <div className={styles.modalContainer}>
        {professor && (
          <div className={styles.headerCard}>
            <div className={styles.profName}>
              {professor.user.first_name} {professor.user.last_name}
            </div>
            <div className={styles.profMeta}>
              <Briefcase size={14} /> {professor.employee_id} • {professor.department}
            </div>
            <div className={styles.termBadge}>
              <p className={styles.termLabel}>Current Term</p>
              <p className={styles.termValue}>{activeTerm?.code || 'None'}</p>
            </div>
          </div>
        )}

        {!loading && load && (
          <div className={`${styles.insightsBar} ${styles.animateSlideUp}`}>
             <div className={styles.insightCard}>
                <div className={styles.insightIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Award size={20} />
                </div>
                <div className={styles.insightInfo}>
                  <h4>{insights.totalHours} hrs</h4>
                  <p>Weekly Load</p>
                </div>
             </div>
             <div className={styles.insightCard}>
                <div className={styles.insightIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <BookOpen size={20} />
                </div>
                <div className={styles.insightInfo}>
                  <h4>{insights.subjectCount}</h4>
                  <p>Unique Subjects</p>
                </div>
             </div>
             <div className={styles.insightCard}>
                <div className={styles.insightIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
                  <Users size={20} />
                </div>
                <div className={styles.insightInfo}>
                  <h4>{Object.values(load).flat().length}</h4>
                  <p>Total Classes</p>
                </div>
             </div>
          </div>
        )}

        <div className={styles.timetableWrapper}>
          {loading ? (
            <div className="flex py-24 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : load ? (
            <div className="relative overflow-auto max-h-[600px] border-b border-slate-100">
              <div className="relative min-w-[700px]">
                <div className={styles.timetableGrid} style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                  <div className={styles.ttCorner}></div>
                  {GRID_DAYS.map(d => (
                    <div key={d} className={styles.ttDayHeader}>{DAY_LABELS[d]}</div>
                  ))}

                  {TIME_SLOTS.map((slot, idx) => (
                    <React.Fragment key={slot}>
                      <div className={styles.ttTimeLabel} style={{ height: `${SLOT_HEIGHT}px` }}>
                        {slot.endsWith(':00') ? slot : ''}
                      </div>
                      {GRID_DAYS.map(dayKey => (
                        <div 
                          key={`${dayKey}-${slot}`} 
                          className={`${styles.ttCell} ${slot.endsWith(':00') ? styles.ttCellHour : ''}`} 
                          style={{ height: `${SLOT_HEIGHT}px` }}
                        />
                      ))}
                    </React.Fragment>
                  ))}
              </div>

              <div className={styles.ttBlocksOverlay} style={{ gridTemplateColumns: `repeat(${GRID_DAYS.length}, 1fr)` }}>
                {GRID_DAYS.map((dayKey) => {
                  const blocks = getBlocksForDay(dayKey);
                  return (
                    <div key={dayKey} className={styles.ttDayColumn}>
                      {blocks.map((item, idx) => {
                        const [start, end] = item.time.split(' - ');
                        const startMin = timeToMinutes(start);
                        const endMin = timeToMinutes(end);
                        const top = ((startMin - startMinute) / 30) * SLOT_HEIGHT;
                        const duration = endMin - startMin;
                        const height = (duration / 30) * SLOT_HEIGHT;
                        const color = getHSLColor(item.subject);

                        return (
                          <div
                            key={idx}
                            className={styles.ttBlock}
                            style={{
                              top: `${top}px`,
                              height: `${height - 2}px`,
                              backgroundColor: color.bg,
                              borderLeft: `3px solid ${color.border}`,
                              color: color.text,
                            }}
                            onClick={() => setSelectedDetail({ ...item, day: Object.keys(FULL_DAY_MAP).find(k => FULL_DAY_MAP[k] === dayKey) })}
                          >
                            <div className={styles.ttBlockCode}>{item.subject.split(' - ')[0]}</div>
                            <div className={styles.ttBlockMeta}>
                               <div className={styles.ttMetaItem}><Users size={10} /> {item.section}</div>
                               {height > 40 && <div className={styles.ttMetaItem}><MapPin size={10} /> {item.room}</div>}
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
          ) : (
            <div className="py-24 text-center">
              <p className="text-slate-400 font-bold">No schedule data available for this term.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="neutral" onClick={onClose}>Close Portal</Button>
        </div>
      </div>

      {/* Sub-Modal for Details */}
      {selectedDetail && (
        <Modal
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title="Class Insight"
          size="sm"
        >
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden">
               <div className="relative z-10">
                 <h4 className="text-xl font-black italic uppercase tracking-tighter">{selectedDetail.subject}</h4>
                 <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-sm">
                   <Clock size={16} /> {selectedDetail.time}
                 </div>
               </div>
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <BookOpen size={80} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Day</p>
                  <p className="font-bold text-slate-700">{selectedDetail.day}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Section</p>
                  <p className="font-bold text-slate-700">{selectedDetail.section}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Location</p>
                  <p className="font-black text-primary">{selectedDetail.room || 'TBA'}</p>
               </div>
            </div>

            <Button variant="primary" block onClick={() => setSelectedDetail(null)}>Dismiss</Button>
          </div>
        </Modal>
      )}
      </>
    </Modal>
  );
};

export default FacultyLoadModal;
