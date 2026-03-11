import React, { useState, useEffect } from 'react';
import { Clock, Users, BookOpen, Calendar, MapPin, AlertTriangle, CheckCircle2, Search, Edit2, RefreshCw, ChevronRight, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { schedulingApi } from '../../api/scheduling';
import { facultyApi } from '../../api/faculty';
import { termsApi } from '../../api/terms';
import { facilitiesApi } from '../../api/facilities';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';

import './SchedulingPage.css';

const SchedulingPage = () => {
    const [view, setView] = useState('LIST'); // 'LIST' or 'MANAGE'
    const [professors, setProfessors] = useState([]);
    const [selectedProf, setSelectedProf] = useState(null);
    const [profSchedules, setProfSchedules] = useState([]);
    const [profAvailability, setProfAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rooms, setRooms] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    
    // UI State
    const [isSavingAvailability, setIsSavingAvailability] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddLoadModalOpen, setIsAddLoadModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [formData, setFormData] = useState({
        days: [],
        start_time: '',
        end_time: '',
        room: ''
    });

    const { showToast } = useToast();

    // Days & Sessions Definition
    const DAYS = [
        { key: 'M', label: 'Monday' },
        { key: 'T', label: 'Tuesday' },
        { key: 'W', label: 'Wednesday' },
        { key: 'TH', label: 'Thursday' },
        { key: 'F', label: 'Friday' },
        { key: 'S', label: 'Saturday' },
    ];
    const SESSIONS = ['AM', 'PM'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const termRes = await termsApi.getTerms({ is_active: true });
            const term = termRes.data.results?.[0] || termRes.data[0];
            setActiveTerm(term);

            const profRes = await facultyApi.getAll();
            setProfessors(profRes.data.results || profRes.data);

            const roomRes = await facilitiesApi.getRooms();
            setRooms(roomRes.data.results || roomRes.data);
        } catch (err) {
            showToast('error', 'Failed to load initial data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchProfDetails = async (profId) => {
        if (!activeTerm) return;
        try {
             const [schedRes, availRes, slotsRes] = await Promise.all([
                schedulingApi.getSchedules({ professor_id: profId, term_id: activeTerm.id }),
                facultyApi.getAvailability(profId),
                schedulingApi.getAvailableSlots({ professor_id: profId, term_id: activeTerm.id })
            ]);
            setProfSchedules(schedRes.data.results || schedRes.data);
            setProfAvailability(availRes.data);
            setAvailableSlots(slotsRes.data);
        } catch (err) {
            showToast('error', 'Failed to load professor details');
        }
    };

    const handleManageLoad = (prof) => {
        setSelectedProf(prof);
        fetchProfDetails(prof.id);
        setView('MANAGE');
    };

    const handleBackToList = () => {
        setView('LIST');
        setSelectedProf(null);
        fetchData(); // Refresh list to update status
    };

    const handlePublishSchedule = async () => {
        if (!activeTerm) return;
        if (!window.confirm('Publish the schedule? Students will be notified and can start picking their sections.')) return;
        try {
            setIsPublishing(true);
            await schedulingApi.publish({ term_id: activeTerm.id });
            showToast('success', 'Schedule published successfully. Students may now pick their schedules.');
            fetchData();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to publish schedule');
        } finally {
            setIsPublishing(false);
        }
    };

    // Availability Toggle
    const handleToggleAvailability = async (day, session) => {
        if (!selectedProf) return;
        const isCurrentlyAvailable = profAvailability.some(a => a.day === day && a.session === session);
        
        if (isCurrentlyAvailable) {
            const hasSchedule = profSchedules.find(s => s.days.includes(day) && s.section_session === session);
            if (hasSchedule) {
                return showToast('warning', `Slot occupied by ${hasSchedule.subject_code} (${hasSchedule.section_name})`);
            }
        }

        let newAvailabilities;
        if (isCurrentlyAvailable) {
            newAvailabilities = profAvailability.filter(a => !(a.day === day && a.session === session))
                .map(a => ({ day: a.day, session: a.session }));
        } else {
            newAvailabilities = [
                ...profAvailability.map(a => ({ day: a.day, session: a.session })),
                { day: day, session: session }
            ];
        }

        try {
            setIsSavingAvailability(true);
            await facultyApi.updateAvailability(selectedProf.id, newAvailabilities);
            setProfAvailability(newAvailabilities);
            showToast('success', 'Availability updated');
        } catch (err) {
            showToast('error', 'Failed to update availability');
        } finally {
            setIsSavingAvailability(false);
        }
    };

    const handleQuickAvailability = async (sessionType) => {
        if (!selectedProf) return;
        const newAvail = DAYS.map(d => ({ day: d.key, session: sessionType }));
        try {
            setIsSavingAvailability(true);
            await facultyApi.updateAvailability(selectedProf.id, newAvail);
            setProfAvailability(newAvail);
            showToast('success', `All days set to ${sessionType}`);
        } catch (err) {
            showToast('error', 'Failed to update availability');
        } finally {
            setIsSavingAvailability(false);
        }
    };

    const handleOpenSetup = (sched) => {
        setSelectedSchedule(sched);
        setFormData({
            days: sched.days || [],
            start_time: sched.start_time ? sched.start_time.substring(0, 5) : '',
            end_time: sched.end_time ? sched.end_time.substring(0, 5) : '',
            room: sched.room || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveSchedule = async () => {
        if (!formData.start_time || !formData.end_time || formData.days.length === 0) {
            return showToast('error', 'Please fill in all required fields');
        }

        const unavailableDays = formData.days.filter(day => 
            !profAvailability.some(a => a.day === day && a.session === selectedSchedule.section_session)
        );

        if (unavailableDays.length > 0) {
            return showToast('error', `Professor is NOT available at ${selectedSchedule.section_session} on ${unavailableDays.join(', ')}`);
        }

        try {
            setIsSavingSchedule(true);
            await schedulingApi.assign({
                id: selectedSchedule.id,
                term_id: activeTerm.id,
                section_id: selectedSchedule.section,
                subject_id: selectedSchedule.subject,
                professor_id: selectedProf.id,
                room_id: formData.room || null,
                days: formData.days,
                start_time: formData.start_time,
                end_time: formData.end_time
            });
            showToast('success', 'Schedule updated successfully');
            setIsModalOpen(false);
            fetchProfDetails(selectedProf.id);
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Conflict detected');
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const filteredProfs = professors.filter(p => {
        const name = `${p.user?.first_name} ${p.user?.last_name}`;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const calculateTotalUnits = () => {
        return profSchedules.reduce((acc, curr) => acc + (curr.subject_units || 0), 0);
    };

    if (loading && !activeTerm) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

    if (view === 'LIST') {
        return (
            <div className="p-8">
                <Card className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Professor Scheduling Matrix</h2>
                            <p className="text-sm text-slate-500 font-medium">Manage faculty teaching loads and timetable assignments for {activeTerm?.code}</p>
                        </div>
                        <div className="flex gap-4">
                            {activeTerm?.schedule_published && (
                                <Badge variant="success" className="self-center">Schedule Published</Badge>
                            )}
                            <Input 
                                placeholder="Search faculty..." 
                                icon={<Search size={16} />} 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64"
                            />
                            <Button 
                                variant={activeTerm?.schedule_published ? "outline" : "primary"} 
                                icon={<CheckCircle2 size={16} />} 
                                loading={isPublishing}
                                onClick={handlePublishSchedule}
                                disabled={activeTerm?.schedule_published}
                            >
                                {activeTerm?.schedule_published ? 'Published' : 'Publish Schedule'}
                            </Button>
                            <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={fetchData}>Sync</Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-4">Faculty Member</th>
                                    <th className="px-6 py-4">Employee ID</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Units Assigned</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProfs.map(prof => (
                                    <tr key={prof.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {prof.user?.last_name?.[0]}
                                                </div>
                                                <div className="font-bold text-slate-700">{prof.user?.first_name} {prof.user?.last_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-xs text-slate-400">{prof.employee_id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{prof.department}</td>
                                        <td className="px-6 py-4">
                                            {/* Note: In a real scenario, this would be total units across all schedules. 
                                                For now we show assigned subjects count as a proxy or we'd need a backend aggregation */}
                                            <Badge variant="neutral">{prof.assigned_subjects?.length} Subjects</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {prof.assigned_subjects?.length > 0 ? (
                                                <Badge variant="success" icon={<CheckCircle2 size={10} />}>Scheduled</Badge>
                                            ) : (
                                                <Badge variant="warning" icon={<AlertTriangle size={10} />}>Unscheduled</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button 
                                                variant="primary" 
                                                size="xs" 
                                                style={{ fontWeight: 800 }} 
                                                icon={<Edit2 size={12}/>}
                                                onClick={() => handleManageLoad(prof)}
                                            >
                                                MODIFY SCHEDULE
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="scheduling-container-manage p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Back button */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handleBackToList}>Back to Matrix</Button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manage Teaching Timetable</h2>
                        <p className="text-sm text-slate-500 font-bold">Faculty: {selectedProf?.user?.first_name} {selectedProf?.user?.last_name} • {selectedProf?.employee_id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl border border-blue-100">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Total Current Load</div>
                        <div className="text-2xl font-black text-blue-700 leading-none">{calculateTotalUnits()} <span className="text-sm font-medium opacity-50">/ 30 UNITS</span></div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <BookOpen size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Availability Grid */}
                <div className="lg:col-span-8 space-y-8">
                    <Card title="Fixed Weekly Availability Grid" className="shadow-sm border-slate-100 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Click cells to toggle professor availability across days and sessions.</p>
                            <div className="flex gap-2">
                                <Button size="xs" variant="ghost" onClick={() => handleQuickAvailability('AM')}>Fill AM</Button>
                                <Button size="xs" variant="ghost" onClick={() => handleQuickAvailability('PM')}>Fill PM</Button>
                            </div>
                        </div>

                        <div className="availability-grid">
                            <div className="grid-corner"></div>
                            {DAYS.map(d => (
                                <div key={d.key} className="grid-header-day">{d.key}</div>
                            ))}
                            
                            {SESSIONS.map(session => (
                                <React.Fragment key={session}>
                                    <div className="grid-label-session">{session}</div>
                                    {DAYS.map(day => {
                                        const isAvailable = profAvailability.some(a => a.day === day.key && a.session === session);
                                        const schedule = profSchedules.find(s => s.days.includes(day.key) && s.section_session === session);
                                        
                                        return (
                                            <div 
                                                key={`${day.key}-${session}`}
                                                className={`grid-cell ${isAvailable ? 'available' : ''} ${schedule ? 'occupied' : ''} ${isSavingAvailability ? 'opacity-50 pointer-events-none' : ''}`}
                                                onClick={() => !schedule && handleToggleAvailability(day.key, session)}
                                            >
                                                {schedule ? (
                                                    <div className="occupied-badge">
                                                        <span className="text-[9px] block whitespace-nowrap overflow-hidden text-ellipsis px-1">{schedule.subject_code}</span>
                                                        <span className="text-[8px] opacity-70 block">{schedule.section_name}</span>
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
                    </Card>

                     <div className="flex justify-between items-center px-2">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">Teaching Load Summary</h3>
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" className="text-[10px] font-black">{profSchedules.length} Active Slots</Badge>
                            <Button variant="primary" size="xs" icon={<BookOpen size={12}/>} style={{ fontWeight: 800 }} onClick={() => setIsAddLoadModalOpen(true)}>
                                ADD SUBJECT LOAD
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {profSchedules.map(sched => (
                            <div key={sched.id} className="assignment-row shadow-sm hover:shadow-md border-slate-100">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="load-icon border border-slate-100"><BookOpen size={20} className="text-slate-400" /></div>
                                    <div className="flex-1">
                                        <div className="flex gap-2 mb-1">
                                            <Badge variant="neutral" className="text-[9px] font-black">{sched.section_name}</Badge>
                                            <Badge variant={sched.section_session === 'AM' ? 'info' : 'warning'} className="text-[9px] font-black">{sched.section_session}</Badge>
                                        </div>
                                        <h4 className="font-bold text-slate-800 leading-tight">{sched.subject_code}</h4>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase">{sched.subject_description}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 items-center px-8 border-l border-slate-100 min-w-[200px]">
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 italic">Schedule Configuration</div>
                                    <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                                        <Calendar size={12} className="text-blue-500" />
                                        {sched.days.length > 0 ? `${sched.days.join(', ')} • ${sched.start_time?.substring(0, 5)} - ${sched.end_time?.substring(0, 5)}` : <span className="text-red-400">UNCONFIGURED</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 items-center px-8 border-l border-slate-100 min-w-[150px]">
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 italic">Facility</div>
                                    <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                                        <MapPin size={12} className="text-slate-400" />
                                        {sched.room_name || 'TBA'}
                                    </div>
                                </div>

                                <div className="pl-6 border-l border-slate-100">
                                    <Button variant="outline" size="sm" icon={<Edit2 size={12}/>} style={{ fontWeight: 800 }} onClick={() => handleOpenSetup(sched)}>
                                        SETUP
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {profSchedules.length === 0 && (
                            <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                                <h4 className="text-slate-400 font-black tracking-widest uppercase text-sm">No Loads Assigned For This Professor</h4>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Assigned Subjects & Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <Card title="Expertise & Assignments" className="bg-slate-900 border-slate-800 text-white">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Confirmed subjects this professor is authorized to teach.</p>
                        <div className="space-y-3">
                            {selectedProf?.assigned_subjects?.map(ps => (
                                <div key={ps.id} className="p-3 rounded-lg bg-slate-800 border border-slate-700 group hover:border-blue-500 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-black text-blue-400 tracking-tight">{ps.subject_details?.code}</span>
                                        <span className="text-[10px] font-black text-slate-500">{ps.subject_details?.units} UNITS</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-200 line-clamp-1">{ps.subject_details?.name}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Load Statistics" className="bg-white border-slate-100">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase">Employment</span>
                                <span className="text-sm font-black text-slate-700">{selectedProf?.employment_status}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase">Active Sections</span>
                                <span className="text-sm font-black text-slate-700">{new Set(profSchedules.map(s => s.section)).size}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase">Days Utilized</span>
                                <span className="text-sm font-black text-slate-700">{new Set(profSchedules.flatMap(s => s.days)).size}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl mt-4">
                                <div className="flex items-center gap-3 text-blue-600 mb-2">
                                    <Clock size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Time Complexity</span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Professor teaching window is validated against Section overlaps and general availability to ensure a conflict-free semester.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

             {/* Modal for Setup remains essentially same but matches new design */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Timetable Assignment"
                size="md"
            >
                <div className="space-y-6">
                    <div className="bg-slate-900 p-4 rounded-lg text-white flex justify-between items-center">
                        <div>
                            <div className="text-[10px] uppercase font-bold opacity-50 mb-1">Subject & Section ({selectedSchedule?.section_session})</div>
                            <div className="text-lg font-bold">{selectedSchedule?.subject_code} — {selectedSchedule?.section_name}</div>
                        </div>
                        <Badge variant="info">{selectedSchedule?.component_type}</Badge>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Teaching Days</label>
                        <div className="flex flex-wrap gap-2">
                            {['M', 'T', 'W', 'TH', 'F', 'S'].map(day => {
                                const isAvailable = profAvailability.some(a => a.day === day && a.session === selectedSchedule?.section_session);
                                return (
                                    <button
                                        key={day}
                                        disabled={!isAvailable}
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
                                        }))}
                                        className={`w-12 h-12 rounded-lg font-bold text-sm border flex items-center justify-center transition-all ${
                                            formData.days.includes(day)
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                                            : isAvailable
                                                ? 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                                                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {day}
                                        {!isAvailable && <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full"></span>}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold italic">* RED DOT INDICATES PROFESSOR UNAVAILABLE AT THIS SESSION ({selectedSchedule?.section_session})</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} />
                        <Input label="End Time" type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} />
                    </div>

                    <Select 
                        label="Room Assignment"
                        placeholder="Automatic / TBA"
                        value={formData.room}
                        onChange={(e) => setFormData({...formData, room: e.target.value})}
                        options={rooms.map(r => ({
                            value: r.id,
                            label: `${r.name} (${r.room_type} — Max: ${r.capacity})`
                        }))}
                    />

                    <div className="flex gap-3 justify-end pt-4">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" loading={isSavingSchedule} onClick={handleSaveSchedule}>Publish Load</Button>
                    </div>
                </div>
             </Modal>

            {/* Modal for Adding New Load */}
            <Modal
                isOpen={isAddLoadModalOpen}
                onClose={() => setIsAddLoadModalOpen(false)}
                title="Available Unassigned Sections"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                        The following sections are for subjects assigned to this professor but currently have no assigned faculty.
                    </p>
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
                        {availableSlots.map(slot => (
                            <div key={slot.id} className="p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex justify-between items-center group">
                                <div>
                                    <div className="flex gap-2 mb-1">
                                        <Badge variant="neutral" className="text-[9px] font-black">{slot.section_name}</Badge>
                                        <Badge variant={slot.section_session === 'AM' ? 'info' : 'warning'} className="text-[9px] font-black">{slot.section_session}</Badge>
                                    </div>
                                    <div className="text-sm font-black text-slate-800">{slot.subject_code} — {slot.subject_description}</div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<ChevronRight size={14} />} 
                                    onClick={() => {
                                        setIsAddLoadModalOpen(false);
                                        handleOpenSetup(slot);
                                    }}
                                >
                                    ASSIGN
                                </Button>
                            </div>
                        ))}
                        {availableSlots.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                                <h4 className="text-slate-400 font-black tracking-widest uppercase text-sm">No Unassigned Sections Found</h4>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SchedulingPage;
