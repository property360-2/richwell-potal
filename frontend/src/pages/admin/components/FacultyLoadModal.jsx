import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, BookOpen, Users, MapPin } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { schedulingApi } from '../../../api/scheduling';
import { termsApi } from '../../../api/terms';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import '../../dean/SchedulingPage.css';

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
      // 1. Get active term
      const termRes = await termsApi.getTerms({ is_active: true });
      const active = termRes.data.results?.[0] || termRes.data[0];
      setActiveTerm(active);

      if (active) {
        // 2. Get professor load
        const res = await schedulingApi.getProfessorInsights(professor.id, active.id);
        setLoad(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch faculty load:', error);
    } finally {
      setLoading(false);
    }
  };

  const GRID_DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
  const DAY_LABELS = { 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'TH': 'Thu', 'F': 'Fri', 'S': 'Sat' };
  const FULL_DAY_MAP = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'TH', 'Friday': 'F', 'Saturday': 'S' };
  
  const START_HOUR = 7;
  const END_HOUR = 19;
  const SLOT_HEIGHT = 18;
  const startMinute = START_HOUR * 60;
  
  const TIME_SLOTS = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < END_HOUR) TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getBlocksForDay = (dayKey) => {
    if (!load) return [];
    // The load object has full day names as keys (Monday, Tuesday, etc.)
    const fullDayName = Object.keys(FULL_DAY_MAP).find(k => FULL_DAY_MAP[k] === dayKey);
    return load[fullDayName] || [];
  };

  const getRandomColor = (subject) => {
    const COLORS = [
      { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
      { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
      { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
      { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
      { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
      { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
      { bg: '#ecfeff', border: '#06b6d4', text: '#155e75' }
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Faculty Teaching Load"
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {professor && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {professor.user.first_name} {professor.user.last_name}
                </h3>
                <p className="text-sm text-slate-500">{professor.employee_id} • {professor.department}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Current Term</p>
                <p className="text-sm text-primary font-bold">{activeTerm?.code || 'No Active Term'}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex py-12 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : load ? (
          <div className="space-y-4">

            <div className="timetable-grid-wrapper overflow-x-auto shadow-inner rounded-xl border border-slate-200 bg-white">
              <div className="timetable-grid min-w-[800px]" style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                  {/* Header row */}
                  <div className="tt-corner"></div>
                  {GRID_DAYS.map(d => (
                      <div key={d} className="tt-day-header">{DAY_LABELS[d]}</div>
                  ))}

                  {/* Time rows */}
                  {TIME_SLOTS.map((slot, idx) => (
                      <React.Fragment key={slot}>
                          <div className={`tt-time-label ${slot.endsWith(':00') ? '' : 'tt-time-half'}`} style={{ height: '18px', fontSize: '9px' }}>
                              {slot.endsWith(':00') ? slot : ''}
                          </div>
                          {GRID_DAYS.map(dayKey => (
                              <div key={`${dayKey}-${slot}`} className={`tt-cell ${slot.endsWith(':00') ? 'tt-cell-hour' : ''}`} style={{ height: '18px' }}>
                              </div>
                          ))}
                      </React.Fragment>
                  ))}
              </div>

              {/* Floating schedule blocks */}
              <div className="tt-blocks-overlay min-w-[800px]" style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)`, paddingTop: '34px' }}>
                  <div></div>
                  {GRID_DAYS.map((dayKey, dayIdx) => {
                      const blocks = getBlocksForDay(dayKey);
                      const currentFullDayName = Object.keys(FULL_DAY_MAP).find(k => FULL_DAY_MAP[k] === dayKey);
                      return (
                          <div key={dayKey} className="tt-day-column">
                              {blocks.map((item, idx) => {
                                  const [startTimeStr, endTimeStr] = item.time.split(' - ');
                                  const startMin = timeToMinutes(startTimeStr);
                                  const endMin = timeToMinutes(endTimeStr);
                                  const top = ((startMin - startMinute) / 30) * SLOT_HEIGHT;
                                  const duration = endMin - startMin;
                                  const height = (duration / 30) * SLOT_HEIGHT;
                                  const color = getRandomColor(item.subject);

                                  return (
                                      <div
                                          key={idx}
                                          className={`tt-block cursor-pointer transition-all ${selectedDetail?.time === item.time && selectedDetail?.day === currentFullDayName ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] z-50' : 'hover:scale-[1.02] hover:z-40'}`}
                                          style={{
                                              top: `${top}px`,
                                              height: `${Math.max(height - 2, SLOT_HEIGHT - 2)}px`,
                                              backgroundColor: color.bg,
                                              borderLeft: `3px solid ${color.border}`,
                                              color: color.text,
                                          }}
                                          onClick={() => setSelectedDetail({ ...item, day: currentFullDayName })}
                                          title="Click for details"
                                      >
                                          <div className="flex flex-col h-full overflow-hidden p-1 justify-between">
                                              <div className="font-black truncate leading-tight text-[9px]">
                                                  {item.subject}
                                              </div>
                                              <div className="flex flex-col gap-0.5 mt-auto">
                                                  {height > 40 && (
                                                      <div className="flex items-center gap-1 opacity-80 truncate font-black text-[8px]">
                                                          <Users size={8} strokeWidth={3} className="shrink-0" />
                                                          {item.section}
                                                      </div>
                                                  )}
                                                  {height > 55 && (
                                                      <div className="flex items-center gap-1 opacity-80 truncate font-black text-[8px]">
                                                          <MapPin size={8} strokeWidth={3} className="shrink-0" />
                                                          {item.room || 'TBA'}
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
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">Select a professor to view load details.</p>
          </div>
        )}
      </div>
      <div className="mt-8 flex justify-end">
        <Button variant="neutral" onClick={onClose}>Close</Button>
      </div>

      {/* Detail Modal moved here for better stability */}
      {selectedDetail && (
        <Modal
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title="Class Schedule Details"
          size="sm"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div className="bg-primary text-white p-3 rounded-xl">
                <BookOpen size={24} />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-lg font-black text-slate-900 leading-tight uppercase italic truncate" title={selectedDetail.subject}>
                  {selectedDetail.subject}
                </h4>
                <p className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-1">
                  <Clock size={12} strokeWidth={3} /> {selectedDetail.time}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Day</p>
                <div className="flex items-center gap-2 text-slate-700">
                   <Calendar size={16} className="text-slate-400" />
                   <span className="font-bold">{selectedDetail.day}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Section</p>
                <div className="flex items-center gap-2 text-slate-700">
                   <Users size={16} className="text-slate-400" />
                   <span className="font-bold">{selectedDetail.section}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Room / Facility</p>
                <div className="flex items-center gap-2 text-slate-700">
                   <MapPin size={16} className="text-slate-400" />
                   <span className="font-black">{selectedDetail.room || 'TBA'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedDetail(null)}>Understood</Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default FacultyLoadModal;
