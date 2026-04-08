import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import { schedulingApi } from '../../../../api/scheduling';
import { facultyApi } from '../../../../api/faculty';
import { useToast } from '../../../../components/ui/Toast';
import { Clock, AlertTriangle, UserCircle, MapPin, Info, Calendar, CheckCircle2, Loader2 } from 'lucide-react';

import styles from './SlotConfigModal.module.css';

const SlotConfigModal = ({ 
  isOpen, 
  onClose, 
  selectedSchedule, 
  activeTerm, 
  professors, 
  rooms, 
  onSuccess 
}) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [resourceAvailability, setResourceAvailability] = useState({ professors: [], rooms: [] });
  const [profAvailability, setProfAvailability] = useState([]);
  
  const [formData, setFormData] = useState({
    professor: '',
    days: [],
    start_time: '',
    end_time: '',
    room: ''
  });

  const DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];

  // Initialize data
  useEffect(() => {
    if (isOpen && selectedSchedule) {
      setFormData({
        professor: selectedSchedule.professor || '',
        days: selectedSchedule.days || [],
        start_time: selectedSchedule.start_time ? selectedSchedule.start_time.substring(0, 5) : '',
        end_time: selectedSchedule.end_time ? selectedSchedule.end_time.substring(0, 5) : '',
        room: selectedSchedule.room || ''
      });
      
      if (selectedSchedule.professor) {
        facultyApi.getAvailability(selectedSchedule.professor).then(res => setProfAvailability(res.data));
      } else {
        setProfAvailability([]);
      }

      setConflictError(null);
    }
  }, [isOpen, selectedSchedule]);

  // Duration Calculation
  const durationInfo = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return { hours: 0, status: 'none', label: '0h' };
    
    const [h1, m1] = formData.start_time.split(':').map(Number);
    const [h2, m2] = formData.end_time.split(':').map(Number);
    
    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    const hoursRaw = totalMinutes / 60;
    const weeklyHours = hoursRaw * formData.days.length;
    
    const required = selectedSchedule?.subject_hrs_per_week || 0;
    let status = 'insufficient';
    if (Math.abs(weeklyHours - required) < 0.1) status = 'match';
    else if (weeklyHours > required) status = 'excess';

    return {
      hours: weeklyHours,
      required: required,
      status,
      label: `${weeklyHours}h / ${required}h`
    };
  }, [formData.start_time, formData.end_time, formData.days, selectedSchedule]);

  // Real-time Validation
  useEffect(() => {
    const validateSlotData = async () => {
      if (!isOpen || !selectedSchedule || !activeTerm) return;
      const { professor, days, start_time, end_time, room } = formData;
      
      if (!days.length || !start_time || !end_time) {
        setConflictError(null);
        setResourceAvailability({ professors: [], rooms: [] });
        return;
      }

      try {
        setIsValidating(true);
        const availRes = await schedulingApi.getResourceAvailability({
          term_id: activeTerm.id,
          days,
          start_time,
          end_time,
          exclude_id: selectedSchedule.id
        });
        setResourceAvailability(availRes.data);

        const validateRes = await schedulingApi.validateSlot({
          id: selectedSchedule.id,
          term_id: activeTerm.id,
          section_id: selectedSchedule.section,
          subject_id: selectedSchedule.subject,
          professor_id: professor || null,
          room_id: room || null,
          days,
          start_time,
          end_time
        });
        
        if (validateRes.data.status === 'ok') {
          setConflictError(null);
        }
      } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.type) {
          setConflictError(err.response.data);
        } else {
          console.error("Validation error:", err);
        }
      } finally {
        setIsValidating(false);
      }
    };

    const timer = setTimeout(validateSlotData, 300);
    return () => clearTimeout(timer);
  }, [formData, isOpen, selectedSchedule, activeTerm]);

  const handleSave = async () => {
    if (!formData.start_time || !formData.end_time || formData.days.length === 0 || !formData.professor) {
      return showToast('error', 'Please fill in all required fields');
    }

    if (profAvailability.length > 0) {
      const unavailableDays = formData.days.filter(day => 
        !profAvailability.some(a => a.day === day && a.session === selectedSchedule.section_session)
      );
      if (unavailableDays.length > 0) {
        return showToast('error', `Professor is NOT available at ${selectedSchedule.section_session} on ${unavailableDays.join(', ')}`);
      }
    }

    try {
      setIsSaving(true);
      await schedulingApi.assign({
        id: selectedSchedule.id,
        term_id: activeTerm.id,
        section_id: selectedSchedule.section,
        subject_id: selectedSchedule.subject,
        professor_id: formData.professor,
        room_id: formData.room || null,
        days: formData.days,
        start_time: formData.start_time,
        end_time: formData.end_time
      });
      showToast('success', 'Schedule updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.type) {
        setConflictError(err.response.data);
      } else {
        showToast('error', err.response?.data?.error || 'Conflict detected');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const conflictDays = useMemo(() => {
    if (!conflictError || !conflictError.time) return [];
    // Extract days from string like "['W', 'TH'] 07:00 - 10:00"
    const match = conflictError.time.match(/\[(.*?)\]/);
    if (match) {
      return match[1].split(',').map(d => d.trim().replace(/['"]/g, ''));
    }
    return [];
  }, [conflictError]);

  const getDayAvailabilityStatus = (day) => {
    if (!selectedSchedule) return 'none';
    
    // Check for collision with another subject in same section
    if (conflictError?.type === 'section_conflict' && conflictDays.includes(day)) {
      return 'conflict';
    }

    if (!formData.professor) return 'none';
    const isAvail = profAvailability.some(a => a.day === day && a.session === selectedSchedule.section_session);
    return isAvail ? 'available' : 'unavailable';
  };

  // Availability Checklist Statuses
  const checklistStatus = useMemo(() => {
    const statuses = {
      days: { status: 'pending', label: 'Days' },
      time: { status: 'pending', label: 'Time' },
      professor: { status: 'pending', label: 'Professor' },
      room: { status: 'pending', label: 'Room' }
    };

    // Days Check
    if (formData.days.length > 0) {
      if (conflictError?.type === 'section_conflict' && formData.days.some(d => conflictDays.includes(d))) {
        statuses.days.status = 'error';
      } else if (formData.professor) {
        const unavailableSelection = formData.days.some(d => getDayAvailabilityStatus(d) === 'unavailable');
        statuses.days.status = unavailableSelection ? 'error' : 'ok';
      } else {
        statuses.days.status = 'ok';
      }
    }

    // Time Check
    if (formData.start_time && formData.end_time) {
      statuses.time.status = conflictError?.type === 'section_conflict' ? 'error' : 'ok';
    }

    // Professor Check
    if (formData.professor) {
      statuses.professor.status = conflictError?.type === 'professor_conflict' ? 'error' : 'ok';
    }

    // Room Check
    if (formData.room) {
      statuses.room.status = conflictError?.type === 'room_conflict' ? 'error' : 'ok';
    }

    return statuses;
  }, [formData, conflictError, profAvailability, selectedSchedule]);

  const StatusIcon = ({ status }) => {
    if (status === 'ok') return <CheckCircle2 size={12} className={styles.statusCheckOk} />;
    if (status === 'error') return <AlertTriangle size={12} className={styles.statusCheckError} />;
    return <Clock size={12} className={styles.statusCheckPending} />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Slot Configuration"
      size="lg"
    >
      <div className={styles.container}>
        {/* Header Summary */}
        <div className={`${styles.section} ${styles.summaryCard}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="primary" className="text-[9px] uppercase font-black px-1.5 py-0">
                  {selectedSchedule?.component_type}
                </Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedSchedule?.section_session} Session
                </span>
                {isValidating && (
                  <span className={`flex items-center gap-1.5 text-[9px] font-black text-blue-500 uppercase ${styles.validatingPulse}`}>
                    <Loader2 size={10} className="animate-spin" />
                    Validating
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {selectedSchedule?.subject_code} — {selectedSchedule?.subject_description}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-tight">
                Section: <span className="text-slate-900">{selectedSchedule?.section_name}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-tighter">Weekly Requirement</div>
              <div className="text-sm font-black text-blue-600">{selectedSchedule?.subject_hrs_per_week} Hours</div>
            </div>
          </div>
        </div>

        {/* Availability Checklist */}
        <div className={styles.checklist}>
          {Object.entries(checklistStatus).map(([key, info]) => (
            <div key={key} className={styles.checklistItem}>
              <div className={styles.checklistLabel}>
                {key === 'days' && <Calendar size={10} />}
                {key === 'time' && <Clock size={10} />}
                {key === 'professor' && <UserCircle size={10} />}
                {key === 'room' && <MapPin size={10} />}
                {info.label}
              </div>
              <div className={styles.checklistStatus}>
                <StatusIcon status={info.status} />
                <span className={styles[`statusCheck${info.status.charAt(0).toUpperCase() + info.status.slice(1)}`]}>
                  {info.status === 'ok' ? 'Available' : info.status === 'error' ? 'Conflict' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Schedule */}
          <div className="space-y-6">
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Calendar size={14} className="text-blue-500" />
                Teaching Schedule
              </div>
              
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Select Days</label>
              <div className={styles.daySelectorGrid}>
                {DAYS.map(day => {
                  const isSelected = formData.days.includes(day);
                  const status = getDayAvailabilityStatus(day);
                  const isDisabled = status === 'unavailable';
                  const isConflict = status === 'conflict';
                  
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabled}
                      className={`${styles.dayPill} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''} ${isConflict ? styles.conflictGlow : ''}`}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
                      }))}
                      title={isDisabled ? 'Professor not available for this session' : isConflict ? 'This day collides with another subject' : ''}
                    >
                      <span>{day}</span>
                      {(formData.professor || isConflict) && <div className={`${styles.availDot} ${styles[status]}`} />}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <Input 
                  label="Start Time"
                  type="time" 
                  icon={Clock}
                  value={formData.start_time} 
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
                  fullWidth
                />
                <Input 
                  label="End Time"
                  type="time" 
                  icon={Clock}
                  value={formData.end_time} 
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                  fullWidth
                />
              </div>

              <div className={`mt-6 ${styles.durationMeterBox}`}>
                <div className={styles.durationHeader}>
                  <span className={styles.durationLabel}>Total Selected Time</span>
                  <span className={`${styles.durationValue} ${styles[`state${durationInfo.status.charAt(0).toUpperCase() + durationInfo.status.slice(1)}`]}`}>
                    {durationInfo.label}
                  </span>
                </div>
                <div className={styles.durationProgressBg}>
                  <div 
                    className={`${styles.durationProgressBar} ${styles[`bg${durationInfo.status.charAt(0).toUpperCase() + durationInfo.status.slice(1)}`]}`}
                    style={{ width: `${Math.min((durationInfo.hours / (durationInfo.required || 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {durationInfo.status === 'match' ? (
                    <><CheckCircle2 size={12} className="text-emerald-500" /> <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Perfect match</span></>
                  ) : durationInfo.status === 'excess' ? (
                    <><Info size={12} className="text-blue-500" /> <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">Over requirement</span></>
                  ) : (
                    <><AlertTriangle size={12} className="text-amber-500" /> <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">Insufficient hours</span></>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Resources */}
          <div className="space-y-6">
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <UserCircle size={14} className="text-indigo-500" />
                Resource Assignment
              </div>

              <div className="space-y-5">
                <Select 
                  label="Professor"
                  icon={UserCircle}
                  placeholder="Select faculty member..."
                  value={formData.professor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({...formData, professor: val});
                    if(val) {
                      facultyApi.getAvailability(val).then(res => setProfAvailability(res.data));
                    } else {
                      setProfAvailability([]);
                    }
                  }}
                  options={professors
                    .filter(p => p.assigned_subjects.some(as => as.subject === selectedSchedule?.subject))
                    .map(p => {
                      const status = resourceAvailability.professors?.find(ps => ps.id === p.id);
                      const isBusy = status && !status.is_available;
                      return {
                        value: p.id,
                        label: `${p.user?.last_name}, ${p.user?.first_name}${isBusy ? ' (CONFLICT)' : ''}`,
                        disabled: isBusy
                      };
                    })
                  }
                  fullWidth
                />

                {formData.professor && (
                  <div className={styles.profMicroGrid}>
                    {DAYS.map(day => {
                      const isActive = profAvailability.some(a => a.day === day && a.session === selectedSchedule?.section_session);
                      const isSelected = formData.days.includes(day);
                      return (
                        <div 
                          key={day} 
                          className={`${styles.microCell} ${isActive ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
                          title={isActive ? `${day}: Available for ${selectedSchedule?.section_session}` : `${day}: Unavailable`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Select 
                  label="Room Assignment"
                  icon={MapPin}
                  placeholder="Select room..."
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  options={rooms.map(r => {
                    const status = resourceAvailability.rooms?.find(rs => rs.id === r.id);
                    const isBusy = status && !status.is_available;
                    return {
                      value: r.id,
                      label: `${r.name}${isBusy ? ' (OCCUPIED)' : ''}`,
                      disabled: isBusy
                    };
                  })}
                  fullWidth
                />
              </div>
            </div>

            {conflictError && (
              <div className={styles.conflictPanel}>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">{conflictError.message}</h4>
                    <div className="mt-2 space-y-2">
                      <div className="bg-white/50 p-2 rounded-lg border border-red-100">
                        <p className="text-[11px] font-black text-red-700 uppercase leading-tight">
                          {conflictError.subject}
                        </p>
                        <p className="text-[10px] font-bold text-red-500 mt-0.5 uppercase tracking-tighter">
                          Section: {conflictError.section}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-1.5 rounded-lg border transition-all duration-300 ${conflictError.type === 'professor_conflict' ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]' : 'bg-white/50 text-slate-400 border-slate-100 opacity-60'}`}>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter">
                            <UserCircle size={12} strokeWidth={2.5} />
                            <span className="truncate">{conflictError.professor || 'TBA'}</span>
                          </div>
                          {conflictError.type === 'professor_conflict' && <span className="text-[8px] font-black uppercase mt-1 block opacity-80">[ Conflict Source ]</span>}
                        </div>
                        <div className={`p-1.5 rounded-lg border transition-all duration-300 ${conflictError.type === 'room_conflict' ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]' : 'bg-white/50 text-slate-400 border-slate-100 opacity-60'}`}>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter">
                            <MapPin size={12} strokeWidth={2.5} />
                            <span className="truncate">{conflictError.room || 'TBA'}</span>
                          </div>
                          {conflictError.type === 'room_conflict' && <span className="text-[8px] font-black uppercase mt-1 block opacity-80">[ Conflict Source ]</span>}
                        </div>
                      </div>

                      <div className={`p-1.5 rounded-lg border inline-flex flex-col gap-0.5 transition-all duration-300 ${conflictError.type === 'section_conflict' ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]' : 'bg-white/50 text-slate-400 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight">
                          <Clock size={10} />
                          {conflictError.time}
                        </div>
                        {conflictError.type === 'section_conflict' && <span className="text-[8px] font-black uppercase opacity-80">[ Conflict Source ]</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={isSaving || isValidating}>
            Cancel
          </Button>
          
          <Button 
            variant="primary" 
            onClick={handleSave} 
            loading={isSaving}
            disabled={
              !!conflictError || 
              !formData.professor || 
              formData.days.length === 0 || 
              durationInfo.status === 'insufficient' ||
              Object.values(checklistStatus).some(s => s.status === 'error')
            }
            className="min-w-[180px] font-black uppercase tracking-widest text-[11px]"
          >
            {isSaving ? 'Finalizing...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SlotConfigModal;
