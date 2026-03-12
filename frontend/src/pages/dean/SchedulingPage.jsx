import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Calendar, MapPin, AlertTriangle, CheckCircle2, Search, Edit2, RefreshCw, ChevronRight, CircleUser, Info, Shuffle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { schedulingApi } from '../../api/scheduling';
import { facultyApi } from '../../api/faculty';
import { sectionsApi } from '../../api/sections';
import { termsApi } from '../../api/terms';
import { facilitiesApi } from '../../api/facilities';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import PageHeader from '../../components/shared/PageHeader';

import './SchedulingPage.css';

const SchedulingPage = () => {
    const [view, setView] = useState('LIST'); // 'LIST' or 'MANAGE'
    const [activeTab, setActiveTab] = useState('professors'); // 'professors' or 'sections'
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data Lists
    const [professors, setProfessors] = useState([]);
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    
    // Selected Context
    const [selectedProf, setSelectedProf] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const [profSchedules, setProfSchedules] = useState([]);
    const [profAvailability, setProfAvailability] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    
    // UI State
    const [isSavingAvailability, setIsSavingAvailability] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddLoadModalOpen, setIsAddLoadModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isRandomizing, setIsRandomizing] = useState(false);
    
    const [formData, setFormData] = useState({
        professor: '',
        days: [],
        start_time: '',
        end_time: '',
        room: ''
    });

    const { showToast } = useToast();

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

            if (term) {
                const [profRes, sectionRes, roomRes] = await Promise.all([
                    facultyApi.getAll(),
                    sectionsApi.getSections({ term_id: term.id }),
                    facilitiesApi.getRooms()
                ]);
                setProfessors(profRes.data.results || profRes.data);
                setSections(sectionRes.data.results || sectionRes.data);
                setRooms(roomRes.data.results || roomRes.data);
            }
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

    const fetchSectionDetails = async (sectionId) => {
        if (!activeTerm) return;
        try {
            setProfAvailability([]); 
            const schedRes = await schedulingApi.getSchedules({ section_id: sectionId, term_id: activeTerm.id });
            setProfSchedules(schedRes.data.results || schedRes.data);
        } catch (err) {
            showToast('error', 'Failed to load section details');
        }
    };

    const handleManageLoad = (prof) => {
        setSelectedProf(prof);
        setSelectedSection(null);
        fetchProfDetails(prof.id);
        setView('MANAGE');
    };

    const handleManageSection = (section) => {
        setSelectedSection(section);
        setSelectedProf(null);
        fetchSectionDetails(section.id);
        setView('MANAGE');
    };

    const handleBackToList = () => {
        setView('LIST');
        setSelectedProf(null);
        setSelectedSection(null);
        fetchData(); 
    };

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
            professor: sched.professor || '',
            days: sched.days || [],
            start_time: sched.start_time ? sched.start_time.substring(0, 5) : '',
            end_time: sched.end_time ? sched.end_time.substring(0, 5) : '',
            room: sched.room || ''
        });
        
        if (sched.professor) {
            facultyApi.getAvailability(sched.professor).then(res => setProfAvailability(res.data));
        }

        setIsModalOpen(true);
    };

    const handleSaveSchedule = async () => {
        const profId = selectedProf?.id || formData.professor;
        if (!formData.start_time || !formData.end_time || formData.days.length === 0 || !profId) {
            return showToast('error', 'Please fill in all required fields including Professor');
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
            setIsSavingSchedule(true);
            await schedulingApi.assign({
                id: selectedSchedule.id,
                term_id: activeTerm.id,
                section_id: selectedSchedule.section,
                subject_id: selectedSchedule.subject,
                professor_id: profId,
                room_id: formData.room || null,
                days: formData.days,
                start_time: formData.start_time,
                end_time: formData.end_time
            });
            showToast('success', 'Schedule updated successfully');
            setIsModalOpen(false);
            if (selectedProf) fetchProfDetails(selectedProf.id);
            else if (selectedSection) fetchSectionDetails(selectedSection.id);
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Conflict detected');
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handlePublishSchedule = async () => {
        if (!activeTerm) return;
        if (!window.confirm('Publish the schedule? Students will be notified and can start picking their sections.')) return;
        try {
            setIsPublishing(true);
            await schedulingApi.publish({ term_id: activeTerm.id });
            showToast('success', 'Schedule published successfully.');
            fetchData();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to publish');
        } finally {
            setIsPublishing(false);
        }
    };

    const calculateTotalUnits = () => {
        return profSchedules.reduce((acc, curr) => acc + (curr.subject_units || 0), 0);
    };

    const filteredProfs = professors.filter(p => {
        const name = `${p.user?.first_name} ${p.user?.last_name}`;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredSections = sections.filter(s => {
        return s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               s.program_code?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading && !activeTerm) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

    if (view === 'LIST') {
        return (
            <div className="scheduling-container-list">
                <PageHeader 
                    title="Scheduling Dashboard"
                    description={`Manage faculty assignments and section timetables for ${activeTerm?.code}`}
                    badge={activeTerm?.schedule_published ? <Badge variant="success" className="self-center ml-2">Published</Badge> : null}
                    actions={
                        <div className="flex gap-4 items-center">
                            <Input 
                                placeholder="Search..." 
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
                                {activeTerm?.schedule_published ? 'Published' : 'Publish'}
                            </Button>
                            <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={fetchData}>Sync</Button>
                        </div>
                    }
                />
                <Card className="mb-6">

                    <Tabs 
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        tabs={[
                            { id: 'professors', label: 'Faculty Matrix', icon: BookOpen },
                            { id: 'sections', label: 'Section Blocks', icon: Calendar }
                        ]}
                    />

                    <div className="overflow-x-auto">
                        {activeTab === 'professors' ? (
                            <table className="matrix-table">
                                <thead>
                                    <tr>
                                        <th>Faculty Member</th>
                                        <th>Employee ID</th>
                                        <th>Department</th>
                                        <th>Units Loaded</th>
                                        <th>Status</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProfs.map(prof => (
                                        <tr key={prof.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="prof-avatar-small">
                                                        {prof.user?.last_name?.[0]}
                                                    </div>
                                                    <div className="font-bold text-slate-700">{prof.user?.first_name} {prof.user?.last_name}</div>
                                                </div>
                                            </td>
                                            <td className="font-bold text-xs text-slate-400">{prof.employee_id}</td>
                                            <td className="text-sm font-medium text-slate-500">{prof.department}</td>
                                            <td>
                                                <Badge variant="neutral">{prof.assignment_count} Active Slots</Badge>
                                            </td>
                                            <td>
                                                {prof.assignment_count > 0 ? (
                                                    <Badge variant="success" icon={<CheckCircle2 size={10} />}>Configured</Badge>
                                                ) : (
                                                    <Badge variant="warning" icon={<AlertTriangle size={10} />}>No Load</Badge>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <Button 
                                                    variant="primary" 
                                                    size="xs" 
                                                    style={{ fontWeight: 800 }} 
                                                    icon={<Edit2 size={12}/>}
                                                    onClick={() => handleManageLoad(prof)}
                                                >
                                                    MANAGE LOAD
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="matrix-table">
                                <thead>
                                    <tr>
                                        <th>Section Name</th>
                                        <th>Program</th>
                                        <th>Year Level</th>
                                        <th>Subjects</th>
                                        <th>Schedule Status</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSections.map(section => (
                                        <tr key={section.id}>
                                            <td>
                                                <div className="font-bold text-slate-700">{section.name}</div>
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{section.session} Session</div>
                                            </td>
                                            <td className="font-bold text-xs text-slate-400">{section.program_code}</td>
                                            <td className="text-sm font-medium text-slate-500">{section.year_level}</td>
                                            <td>
                                                <Badge variant="neutral">{section.subject_count} Components</Badge>
                                            </td>
                                            <td>
                                                <Badge 
                                                    variant={section.scheduling_status === 'FULL' ? 'success' : section.scheduling_status === 'PARTIAL' ? 'warning' : 'neutral'}
                                                    icon={section.scheduling_status === 'FULL' ? <CheckCircle2 size={10} /> : <Clock size={10}/>}
                                                >
                                                    {section.scheduling_status}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Button 
                                                    variant="primary" 
                                                    size="xs" 
                                                    style={{ fontWeight: 800 }} 
                                                    icon={<Edit2 size={12}/>}
                                                    onClick={() => handleManageSection(section)}
                                                >
                                                    SET TIMETABLE
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="scheduling-container-manage animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="manage-header">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handleBackToList}>Back to Matrix</Button>
                    <div className="header-title-section">
                        <h2>
                            {selectedProf ? 'Assign Faculty Load' : 'Section Timetable Configuration'}
                        </h2>
                        <p>
                            {selectedProf 
                                ? `Faculty: ${selectedProf?.user?.first_name} ${selectedProf?.user?.last_name} • ${selectedProf?.employee_id}`
                                : `Target: ${selectedSection?.name} (${selectedSection?.program_name})`
                            }
                        </p>
                    </div>
                </div>
                {selectedProf && (
                    <div className="stats-card-compact">
                        <div className="text-right">
                            <div className="stats-label">Total Current Load</div>
                            <div className="stats-value">{calculateTotalUnits()} <span className="text-sm font-medium opacity-50">/ 30 UNITS</span></div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <BookOpen size={20} />
                        </div>
                    </div>
                )}
            </div>

            <div className={`grid grid-cols-1 ${selectedProf ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-8 items-start`}>
                <div className={selectedProf ? 'lg:col-span-8 space-y-8' : 'space-y-8'}>
                    {selectedProf && (
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
                                                            <span className="text-[9px] block">{schedule.subject_code}</span>
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
                    )}

                    {/* SECTION VIEW: Visual Weekly Timetable Grid */}
                    {selectedSection && (() => {
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
                        const TOTAL_SLOTS = 25; // 7:00 to 19:30

                        // Find scheduled blocks per day
                        const getBlocksForDay = (dayKey) => {
                            return profSchedules.filter(s => s.days && s.days.includes(dayKey) && s.start_time && s.end_time);
                        };

                        const unassigned = profSchedules.filter(s => !s.start_time || !s.end_time || !s.days || s.days.length === 0);

                        return (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Timetable Grid */}
                                <div className="lg:col-span-9">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">Weekly Timetable</h3>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                style={{ fontWeight: 800 }}
                                                icon={<Shuffle size={14} />}
                                                loading={isRandomizing}
                                                onClick={async () => {
                                                    if (!window.confirm('This will reset and randomize all time slots for this section. Professor and room assignments will be kept. Continue?')) return;
                                                    try {
                                                        setIsRandomizing(true);
                                                        const res = await schedulingApi.randomize({
                                                            section_id: selectedSection.id,
                                                            term_id: activeTerm.id
                                                        });
                                                        setProfSchedules(res.data);
                                                        showToast('success', 'Schedule randomized successfully!');
                                                    } catch (err) {
                                                        showToast('error', err.response?.data?.error || 'Failed to randomize schedule');
                                                    } finally {
                                                        setIsRandomizing(false);
                                                    }
                                                }}
                                            >
                                                RANDOMIZE
                                            </Button>
                                            <Badge variant="primary" className="text-[10px] font-black">{profSchedules.length} Components</Badge>
                                        </div>
                                    </div>
                                    <div className="timetable-grid-wrapper">
                                        <div className="timetable-grid" style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                                            {/* Header row */}
                                            <div className="tt-corner"></div>
                                            {GRID_DAYS.map(d => (
                                                <div key={d} className="tt-day-header">{DAY_LABELS[d]}</div>
                                            ))}

                                            {/* Time rows */}
                                            {TIME_SLOTS.map((slot, idx) => (
                                                <React.Fragment key={slot}>
                                                    <div className={`tt-time-label ${slot.endsWith(':00') ? '' : 'tt-time-half'}`}>
                                                        {slot.endsWith(':00') ? slot : ''}
                                                    </div>
                                                    {GRID_DAYS.map(dayKey => (
                                                        <div key={`${dayKey}-${slot}`} className={`tt-cell ${slot.endsWith(':00') ? 'tt-cell-hour' : ''}`}>
                                                        </div>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>

                                        {/* Floating schedule blocks */}
                                        <div className="tt-blocks-overlay" style={{ gridTemplateColumns: `60px repeat(${GRID_DAYS.length}, 1fr)` }}>
                                            <div></div>
                                            {GRID_DAYS.map((dayKey, dayIdx) => {
                                                const blocks = getBlocksForDay(dayKey);
                                                return (
                                                    <div key={dayKey} className="tt-day-column">
                                                        {blocks.map(sched => {
                                                            const top = ((timeToMinutes(sched.start_time) - startMinute) / 30) * SLOT_HEIGHT;
                                                            const duration = timeToMinutes(sched.end_time) - timeToMinutes(sched.start_time);
                                                            const height = (duration / 30) * SLOT_HEIGHT;
                                                            const color = colorMap[sched.subject_code] || COLORS[0];

                                                            return (
                                                                <div
                                                                    key={`${sched.id}-${dayKey}`}
                                                                    className="tt-block"
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
                                                                    <span className="tt-block-code">{sched.subject_code}</span>
                                                                    <span className="tt-block-type">{sched.component_type}</span>
                                                                    {height > 40 && <span className="tt-block-prof">{sched.professor_name || 'TBA'}</span>}
                                                                    {height > 55 && <span className="tt-block-room">{sched.room_name || ''}</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar: Assignments Tracking Table */}
                                <div className="lg:col-span-3 space-y-4">
                                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                            <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-800 italic">
                                                Assignments ({profSchedules.filter(s => s.start_time).length}/{profSchedules.length})
                                            </h4>
                                            {profSchedules.length > 0 && profSchedules.every(s => s.start_time) && (
                                                <Badge variant="success" className="text-[8px]">Complete</Badge>
                                            )}
                                        </div>
                                        
                                        <div className="max-h-[500px] overflow-y-auto">
                                            <table className="w-full text-[10px] text-left border-collapse">
                                                <thead className="bg-slate-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Subject</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Hours</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Type</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {profSchedules.map(sched => {
                                                        const isAssigned = sched.start_time && sched.end_time && sched.days?.length > 0;
                                                        return (
                                                            <tr 
                                                                key={sched.id} 
                                                                className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                                                onClick={() => handleOpenSetup(sched)}
                                                            >
                                                                <td className="p-3">
                                                                    <div className="font-black text-blue-600 group-hover:text-blue-700">{sched.subject_code}</div>
                                                                    <div className="text-[8px] text-slate-400 truncate w-24 font-medium">{sched.subject_description}</div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <div className="font-bold text-slate-600">{sched.subject_hrs_per_week}h</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className="font-bold text-slate-500">{sched.component_type}</span>
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge 
                                                                        variant={isAssigned ? "success" : "neutral"} 
                                                                        className="text-[8px] px-1 py-0"
                                                                    >
                                                                        {isAssigned ? "Assigned" : "Pending"}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* All Subjects Legend */}
                                    <Card className="border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Color Legend</h4>
                                        <div className="space-y-2">
                                            {subjectCodes.map(code => {
                                                const color = colorMap[code];
                                                return (
                                                    <div key={code} className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: color.border }}></div>
                                                        <span className="text-[10px] font-bold text-slate-600">{code}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        );
                    })()}

                    {/* PROFESSOR VIEW: Flat schedule breakdown (unchanged) */}
                    {selectedProf && (
                        <>
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">Schedule Breakdown</h3>
                                <div className="flex items-center gap-3">
                                    <Badge variant="primary" className="text-[10px] font-black">{profSchedules.length} Components</Badge>
                                    <Button variant="primary" size="xs" icon={<BookOpen size={12}/>} style={{ fontWeight: 800 }} onClick={() => setIsAddLoadModalOpen(true)}>
                                        ADD SUBJECT LOAD
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {profSchedules.map(sched => (
                                    <div key={sched.id} className="assignment-row">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="load-icon"><BookOpen size={20} /></div>
                                            <div className="flex-1">
                                                <div className="flex gap-2 mb-1">
                                                    <Badge variant="neutral" className="text-[9px] font-black">{sched.section_name}</Badge>
                                                    <Badge variant={sched.section_session === 'AM' ? 'info' : 'warning'} className="text-[9px] font-black">{sched.section_session}</Badge>
                                                </div>
                                                <h4 className="font-bold text-slate-800 leading-tight">{sched.subject_code} — {sched.component_type}</h4>
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
                            </div>
                        </>
                    )}
                </div>

                {selectedProf && (
                    <div className="lg:col-span-4 space-y-6">
                        <div className="sidebar-card-dark shadow-xl">
                            <h4 className="text-lg font-bold uppercase tracking-tight italic border-b border-slate-700 pb-4 mb-4">Expertise & Assignments</h4>
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
                        </div>

                        <Card title="Load Statistics" className="bg-white border-slate-100">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Employment</span>
                                    <span className="text-sm font-black text-slate-700">{selectedProf?.employment_status}</span>
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
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Slot Configuration"
                size="md"
                footer={
                    <div className="flex gap-3 w-full justify-end">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" loading={isSavingSchedule} onClick={handleSaveSchedule} className="px-8">
                            Save Configuration
                        </Button>
                    </div>
                }
            >
                <div className="slot-modal-content">
                    {/* Header Info Card */}
                    <div className="slot-modal-header">
                        <div className="slot-header-top">
                            <Badge variant="info" className="slot-type-badge">
                                {selectedSchedule?.component_type} COMPONENT
                            </Badge>
                            <div className="slot-session-info">
                                <Clock size={10} /> {selectedSchedule?.section_session} Session
                            </div>
                        </div>
                        <h3 className="slot-title">{selectedSchedule?.subject_code}</h3>
                        <p className="slot-subtitle">{selectedSchedule?.subject_description}</p>
                        <div className="slot-header-footer flex justify-between items-center">
                            <Badge variant="neutral" className="slot-section-badge">{selectedSchedule?.section_name}</Badge>
                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                {selectedSchedule?.subject_hrs_per_week} HRS / WEEK REQUIRED
                            </div>
                        </div>
                    </div>

                    <div className="slot-form-body">
                        {/* Professor Selection */}
                        {selectedSection && (
                             <Select 
                                label={<span className="field-label-with-icon"><CircleUser size={14} /> Assign Professor</span>}
                                placeholder="Select faculty member..."
                                value={formData.professor}
                                onChange={(e) => {
                                    setFormData({...formData, professor: e.target.value});
                                    if(e.target.value) {
                                        facultyApi.getAvailability(e.target.value).then(res => setProfAvailability(res.data));
                                    }
                                }}
                                options={professors.map(p => ({
                                    value: p.id,
                                    label: `${p.user?.last_name}, ${p.user?.first_name} (${p.department})`
                                }))}
                            />
                        )}

                        {/* Day Selection */}
                        <div className="field-group">
                            <label className="field-label-with-icon">
                                <Calendar size={14} /> Select Teaching Days
                            </label>
                            <div className="day-selector">
                                {['M', 'T', 'W', 'TH', 'F', 'S'].map(day => {
                                    const isAvailable = profAvailability.length === 0 || profAvailability.some(a => a.day === day && a.session === selectedSchedule?.section_session);
                                    const isSelected = formData.days.includes(day);
                                    
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
                                            }))}
                                            className={`day-selector-btn ${isSelected ? 'active' : ''} ${!isAvailable && !isSelected ? 'unavailable' : ''}`}
                                        >
                                            {day}
                                            {isSelected && <div className="selected-dot"></div>}
                                            {!isAvailable && !isSelected && <AlertTriangle size={10} className="warning-icon" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="info-banner">
                                <Info size={14} className="info-icon" />
                                <p>
                                    Professor is <strong>unavailable</strong> on grayed-out days for the {selectedSchedule?.section_session} session.
                                </p>
                            </div>
                        </div>

                        {/* Time & Room */}
                        <div className="form-row-two-col">
                            <Input 
                                label={<span className="field-label-with-icon"><Clock size={14} className="text-emerald" /> Start Time</span>}
                                type="time" 
                                value={formData.start_time} 
                                onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
                            />
                            <Input 
                                label={<span className="field-label-with-icon"><Clock size={14} className="text-rose" /> End Time</span>}
                                type="time" 
                                value={formData.end_time} 
                                onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                            />
                        </div>

                        <Select 
                            label={<span className="field-label-with-icon"><MapPin size={14} /> Room Assignment</span>}
                            placeholder="Automatic / TBA"
                            value={formData.room}
                            onChange={(e) => setFormData({...formData, room: e.target.value})}
                            options={rooms.map(r => ({
                                value: r.id,
                                label: `${r.name} (${r.room_type} — Capacity: ${r.capacity})`
                            }))}
                        />
                    </div>
                </div>
            </Modal>

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
                                <Button variant="outline" size="sm" icon={<ChevronRight size={14} />} onClick={() => { setIsAddLoadModalOpen(false); handleOpenSetup(slot); }}>
                                    ASSIGN
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SchedulingPage;
