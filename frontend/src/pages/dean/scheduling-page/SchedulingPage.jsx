import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Calendar, MapPin, AlertTriangle, CheckCircle2, Search, Edit2, RefreshCw, ChevronRight, CircleUser, Info, Shuffle, FileText, ArrowRight, LayoutGrid } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToast } from '../../../components/ui/Toast';
import { schedulingApi } from '../../../api/scheduling';
import { facultyApi } from '../../../api/faculty';
import { sectionsApi } from '../../../api/sections';
import { termsApi } from '../../../api/terms';
import { facilitiesApi } from '../../../api/facilities';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import Tabs from '../../../components/ui/Tabs';
import PageHeader from '../../../components/shared/PageHeader';

import SchedulingReports from './components/SchedulingReports';
import RandomizeOptionsModal from './components/RandomizeOptionsModal';
import SlotConfigModal from './components/SlotConfigModal';

import styles from './SchedulingPage.module.css';

const SchedulingPage = () => {
    const navigate = useNavigate();
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
    const [isRandomizeModalOpen, setIsRandomizeModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isRandomizing, setIsRandomizing] = useState(false);

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
        // NOTE: Clear stale state immediately so the old professor's data is never
        // visible while the new requests are in-flight (mirrors fetchSectionDetails pattern).
        setProfSchedules([]);
        setProfAvailability([]);
        setAvailableSlots([]);
        try {
             const [schedRes, availRes, slotsRes] = await Promise.all([
                schedulingApi.getSchedules({ professor_id: profId, term_id: activeTerm.id }),
                facultyApi.getAvailability(profId),
                schedulingApi.getAvailableSlots({ professor_id: profId, term_id: activeTerm.id })
            ]);
            setProfSchedules(schedRes.data.results || schedRes.data);
            setProfAvailability(availRes.data);
            setAvailableSlots(slotsRes.data.results || slotsRes.data || []);
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
        setIsModalOpen(true);
    };

    const onScheduleSuccess = () => {
        if (selectedProf) fetchProfDetails(selectedProf.id);
        else if (selectedSection) fetchSectionDetails(selectedSection.id);
    };

    const handlePublishSchedule = async () => {
        if (!activeTerm) return;
        if (!window.confirm('Finalize and notify students? Students will receive a notification that the full timetable (Rooms/Professors) is now ready.')) return;
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
            <div className={styles.schedulingContainerList}>
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
                                {activeTerm?.schedule_published ? 'Finalized' : 'Finalize & Notify'}
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
                            { id: 'sections', label: 'Section Blocks', icon: Calendar },
                            { id: 'reports', label: 'Reports Hub', icon: FileText }
                        ]}
                    />

                    <div className="overflow-x-auto">
                        {activeTab === 'professors' ? (
                            <table className={styles.matrixTable}>
                                <thead>
                                    <tr>
                                        <th>Faculty Member</th>
                                        <th>Employee ID</th>
                                        <th>Department</th>
                                        <th>Hours Loaded</th>
                                        <th>Status</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProfs.map(prof => (
                                        <tr key={prof.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className={styles.profAvatarSmall}>
                                                        {prof.user?.last_name?.[0]}
                                                    </div>
                                                    <div className="font-bold text-slate-700">{prof.user?.first_name} {prof.user?.last_name}</div>
                                                </div>
                                            </td>
                                            <td className="font-bold text-xs text-slate-400">{prof.employee_id}</td>
                                            <td className="text-sm font-medium text-slate-500">{prof.department}</td>
                                            <td>
                                                <Badge variant="neutral">{prof.hours_assigned} hrs Assigned</Badge>
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
                        ) : activeTab === 'sections' ? (
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Active Matrix</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage section assignments and professor loading</p>
                                    </div>
                                    <div className={`${styles.glassPanel} px-6 py-3 rounded-2xl border border-white/50 bg-white/40 flex items-center gap-3`}>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Total Enrolled</span>
                                            <span className="text-xl font-black text-primary leading-none">150</span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200/50 mx-2"></div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Sections</span>
                                            <span className="text-xl font-black text-slate-800 leading-none">{sections.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="min-h-[400px]">
                                    {filteredSections.length === 0 ? (
                                        <div className={styles.premiumEmptyState}>
                                            <div className={styles.emptyStateIconWrapper}>
                                                <LayoutGrid size={32} />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-800 mb-2">No Sections Generated</h3>
                                            <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm">Start your scheduling process by generating sections from the enrolled student population.</p>
                                            <div className="flex gap-4">
                                                <Button variant="primary" size="lg" className="rounded-xl px-8 shadow-xl shadow-primary/20" icon={<Shuffle size={18}/>}>Generate Matrix</Button>
                                                <Button variant="outline" size="lg" className="rounded-xl px-8">Refresh Data</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`${styles.sectionGridPro} pb-10`}>
                                            {filteredSections.map(section => (
                                                <div 
                                                    key={section.id} 
                                                    className={`${styles.sectionCardPro} group`}
                                                    onClick={() => handleManageSection(section)}
                                                >
                                                    <div className={styles.cardStatusBadge}>
                                                        <Badge 
                                                            variant={section.scheduling_status === 'FULL' ? 'success' : section.scheduling_status === 'PARTIAL' ? 'warning' : 'neutral'}
                                                            className="shadow-sm font-black text-[9px] uppercase px-2"
                                                        >
                                                            {section.scheduling_status}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="mb-6">
                                                        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{section.program_code}</div>
                                                        <h4 className="text-xl font-black text-slate-800 group-hover:text-primary transition-colors">{section.name}</h4>
                                                        <div className="text-[11px] font-extrabold text-slate-300 mt-1 uppercase tracking-wider">{section.session} Session</div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Year</span>
                                                                <span className="text-xs font-black text-slate-700">{section.year_level}</span>
                                                            </div>
                                                            <div className="flex flex-col pl-4 border-l border-slate-100">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Components</span>
                                                                <span className="text-xs font-black text-slate-700">{section.subject_count} Subjects</span>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="xs" 
                                                            className="bg-slate-50 hover:bg-primary hover:text-white rounded-lg transition-all"
                                                            icon={<ArrowRight size={14}/>}
                                                        >
                                                            Manage
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <SchedulingReports 
                                activeTerm={activeTerm}
                                onManageSection={(id) => {
                                    const section = sections.find(s => s.id == id);
                                    if (section) handleManageSection(section);
                                }}
                                onManageFaculty={(id) => {
                                    const prof = professors.find(p => p.id == id);
                                    if (prof) handleManageLoad(prof);
                                }}
                            />
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className={`${styles.schedulingContainerManage} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                {/* Header */}
                <div className={styles.manageHeader}>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handleBackToList}>Back to Matrix</Button>
                        <div className={styles.headerTitleSection}>
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
                        <div className={styles.statsCardCompact}>
                            <div className="text-right">
                                <div className={styles.statsLabel}>Total Current Load</div>
                                <div className={styles.statsValue}>{calculateTotalUnits()} <span className="text-sm font-medium opacity-50">/ 30 UNITS</span></div>
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
                                                        onClick={() => !schedule && handleToggleAvailability(day.key, session)}
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
                            
                            // Find scheduled blocks per day
                            const getBlocksForDay = (dayKey) => {
                                return profSchedules.filter(s => s.days && s.days.includes(dayKey) && s.start_time && s.end_time);
                            };

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
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
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
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {selectedProf && (
                        <div className="lg:col-span-4 space-y-6">
                            <div className={`${styles.sidebarCardDark} shadow-xl`}>
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
            </div>

            {/* Modals moved outside animated container to ensure proper centering (avoids transform Coordinate System overlap) */}
            <SlotConfigModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedSchedule={selectedSchedule}
                activeTerm={activeTerm}
                professors={professors}
                rooms={rooms}
                onSuccess={onScheduleSuccess}
            />

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

            <RandomizeOptionsModal 
                isOpen={isRandomizeModalOpen} 
                onClose={() => setIsRandomizeModalOpen(false)} 
                isRandomizing={isRandomizing}
                onConfirm={async ({ respectProfessor, respectRoom }) => {
                    try {
                        setIsRandomizing(true);
                        const res = await schedulingApi.randomize({
                            section_id: selectedSection.id,
                            term_id: activeTerm.id,
                            respect_professor: respectProfessor,
                            respect_room: respectRoom
                        });
                        setProfSchedules(res.data);
                        showToast('success', 'Schedule randomized optimally!');
                        setIsRandomizeModalOpen(false);
                    } catch (err) {
                        showToast('error', err.response?.data?.error || 'Failed to randomize schedule');
                    } finally {
                        setIsRandomizing(false);
                    }
                }} 
            />
        </>
    );
};

export default SchedulingPage;
