import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, 
    Layout, 
    Save, 
    Info, 
    Users, 
    MapPin, 
    Loader2, 
    Plus, 
    Monitor, 
    BookOpen,
    CheckCircle2,
    Clock,
    X,
    Calendar,
    UserPlus,
    MousePointerClick
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SchedulingService } from '../services/SchedulingService';
import Button from '../../../components/ui/Button';
import EditScheduleSlotModal from '../modals/EditScheduleSlotModal';
import AssignProfessorModal from '../modals/AssignProfessorModal';
import SubjectPickerModal from '../modals/SubjectPickerModal';

// --- Constants & Helpers ---

const DAYS = [
    { id: 'MON', label: 'Monday' },
    { id: 'TUE', label: 'Tuesday' },
    { id: 'WED', label: 'Wednesday' },
    { id: 'THU', label: 'Thursday' },
    { id: 'FRI', label: 'Friday' },
    { id: 'SAT', label: 'Saturday' }
];

const START_HOUR = 7; // 7:00 AM
const END_HOUR = 21;  // 9:00 PM
const TIME_SLOTS = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + START_HOUR;
    const minute = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return { timeStr, label: hour > 12 ? `${hour - 12}:${minute === 0 ? '00' : '30'} PM` : `${hour}:${minute === 0 ? '00' : '30'} AM` };
});

const calculateEndTime = (startTime, units = 3) => {
    // Simple heuristic: 3 units often = 1.5 hours per session (2 sessions) or 3 hours (1 session)
    // Default to 1.5 hours for convenience
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    
    // Add 1.5 hours (90 mins)
    date.setMinutes(date.getMinutes() + 90);
    
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// --- Components ---

const UnscheduledSubjectCard = ({ subject, onAssign, onScheduleClick, isSelected }) => {
    return (
        <div className={`
            p-5 rounded-2xl border transition-all group relative overflow-hidden
            ${isSelected 
                ? 'bg-indigo-50/50 border-indigo-200 shadow-md ring-1 ring-indigo-200' 
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100'
            }
        `}>
            {isSelected && (
                <div className="absolute top-0 right-0 p-2">
                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-sm animate-in zoom-in-50">
                        <CheckCircle2 size={12} />
                    </div>
                </div>
            )}
            
            <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600'
                }`}>
                    {subject.subject_type === 'LAB' ? <Monitor size={16} /> : <BookOpen size={16} />}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{subject.units} Units</span>
                </div>
            </div>
            <h5 className={`text-sm font-black leading-tight mb-1 transition-colors uppercase italic tracking-tight ${
                isSelected ? 'text-indigo-900' : 'text-gray-900 group-hover:text-indigo-600'
            }`}>
                {subject.subject_code}
            </h5>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed line-clamp-2">
                {subject.subject_title}
            </p>
            
            <div className={`mt-4 pt-4 border-t flex items-center justify-between ${
                isSelected ? 'border-indigo-100' : 'border-gray-50'
            }`}>
                <div className="flex items-center gap-2 text-gray-400">
                    <Users size={12} />
                    <span className={`text-[9px] font-black uppercase tracking-widest truncate ${!subject.professor_name ? 'text-orange-500' : ''}`}>
                        {subject.professor_name || 'TBA'}
                    </span>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onAssign && onAssign(subject);
                    }}
                    className="p-1.5 rounded-lg bg-gray-50 text-indigo-600 hover:bg-indigo-100 transition-all opacity-0 group-hover:opacity-100"
                    title="Assign Professor"
                >
                    <UserPlus size={14} />
                </button>
            </div>
        </div>
    );
};

const ScheduleCell = ({ day, time, children, onClick, onMouseEnter, isHovered }) => {
    return (
        <div 
            onClick={() => onClick(day, time)}
            onMouseEnter={() => onMouseEnter(day, time)}
            className={`
                relative h-20 border-b border-r border-gray-50 transition-all cursor-pointer group
                ${isHovered ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}
            `}
        >
            {/* Hover Indicator */}
            <div className="absolute inset-x-0 bottom-0 top-0 hidden group-hover:flex items-center justify-center pointer-events-none z-0">
                <Plus className="text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
            </div>
            
            {/* Scheduled Content */}
            <div className="relative z-10 w-full h-full"> 
                {children}
            </div>
        </div>
    );
};

const ScheduledSlotCard = ({ slot, onClick }) => {
    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onClick(slot);
            }}
            className="absolute inset-x-1 top-1 bottom-1 bg-white rounded-xl border-l-4 border-l-indigo-500 border border-gray-100 shadow-md p-3 group animate-in zoom-in duration-300 z-10 cursor-pointer hover:border-indigo-300 hover:shadow-lg transition-all"
        >
            <div className="flex justify-between items-start mb-1 leading-none">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter italic">
                    {slot.subject_code}
                </span>
            </div>
            <h6 className="text-[9px] font-bold text-gray-900 truncate mb-2 leading-tight uppercase">
                {slot.subject_title}
            </h6>
            
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Users size={8} />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate">
                        {slot.professor_name || 'TBA'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin size={8} />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                        {slot.room || 'TBA'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- Main Engine ---

const SchedulingEngine = ({ section, onBack }) => {
    const { success: showSuccess, error: showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [sectionData, setSectionData] = useState(null);
    const [unscheduledSubjects, setUnscheduledSubjects] = useState([]);
    const [scheduledSlots, setScheduledSlots] = useState([]);
    // View State
    const [viewMode, setViewMode] = useState('unscheduled'); // 'unscheduled' | 'scheduled'
    
    // Interaction State
    const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
    const [pickerTarget, setPickerTarget] = useState(null); // { day, time }
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [assignModalData, setAssignModalData] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null); // NEW: Click-to-Select

    // Derived State
    const pendingSubjects = useMemo(() => {
        return unscheduledSubjects.filter(s => !s.schedule_slots || s.schedule_slots.length === 0);
    }, [unscheduledSubjects]);

    const displayedSubjects = useMemo(() => {
        if (viewMode === 'unscheduled') {
            // Filter out subjects that have schedule slots
            // This turns the "Unscheduled" sidebar into a "Pending" checklist
            return pendingSubjects;
        } else {
            // Group scheduled slots by subject to show unique subjects
            const unique = new Map();
            scheduledSlots.forEach(slot => {
                if (!unique.has(slot.subject_code)) {
                    unique.set(slot.subject_code, {
                        ...slot,
                        id: slot.section_subject, // Use section_subject ID for consistency
                        // Aggregate slot info if needed, but for the card we just need basic info
                        units: slot.subject_units || '?', // We might need to map this from sectionData.subjects if missing
                        professor_name: slot.professor_name // Might vary per slot, but take one for now
                    });
                }
            });
            // enhancing with full subject details from sectionData if possible
            return Array.from(unique.values()).map(s => {
                const fullSub = sectionData?.subjects?.find(sub => sub.subject_code === s.subject_code);
                return fullSub ? { ...s, units: fullSub.subject_units, subject_type: fullSub.subject_type } : s;
            });
        }
    }, [viewMode, pendingSubjects, scheduledSlots, sectionData]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await SchedulingService.getSectionSchedule(section.id);
            setSectionData(data);
            
            const subjects = data.subjects || [];
            const slots = [];
            const bucket = [];

            subjects.forEach(sub => {
                // Map backend fields
                sub.units = sub.subject_units;
                
                // Handle professors (Backend uses assigned_professors)
                if (sub.assigned_professors && sub.assigned_professors.length > 0) {
                    const primary = sub.assigned_professors.find(p => p.is_primary) || sub.assigned_professors[0];
                    sub.professor_id = primary.id;
                    sub.professor_name = primary.name;
                }
                
                // Ensure qualified_professors is preserved (Backend already provides it)
                sub.qualified_professors = sub.qualified_professors || [];

                if (sub.schedule_slots && sub.schedule_slots.length > 0) {
                    sub.schedule_slots.forEach(slot => {
                        slots.push({
                            ...slot,
                            section_subject: sub.section_subject_id || sub.id, // Ensure consistent ID linkage
                            subject_id: sub.subject_id,
                            subject_code: sub.subject_code,
                            subject_title: sub.subject_title,
                            professor_name: slot.professor_name || sub.professor_name,
                            professor_id: slot.professor || sub.professor_id,
                            qualified_professors: sub.qualified_professors
                        });
                    });
                }
                
                // Bucket Logic: Show if not fully scheduled (simplified: always show in list for reference)
                // Filter: Only add to bucket if we want them to show in the "Subject List"
                bucket.push({
                    ...sub,
                    id: sub.section_subject_id || sub.id, // Keep this for List Key
                    section_subject_id: sub.section_subject_id, // Explicit ID (nullable)
                    subject_id: sub.subject_id || sub.id // Explicit Subject ID
                });
            });

            setUnscheduledSubjects(bucket);
            setScheduledSlots(slots);
        } catch (err) {
            console.error(err);
            showError('Failed to load scheduling data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [section.id]);

    // --- Handlers ---

    const handleCellClick = (day, time) => {
        // If a subject is selected in "click-to-select" mode, use it immediately
        if (selectedSubject) {
             // Prepare data for the Create Modal directly
             const newSlot = {
                id: null, // Indicates CREATE mode
                section_subject: selectedSubject.section_subject_id,
                subject_id: selectedSubject.subject_id,
                section_id: section.id,
                subject_code: selectedSubject.subject_code,
                subject_title: selectedSubject.subject_title,
                professor: selectedSubject.professor_id,
                day: day,
                start_time: time,
                end_time: calculateEndTime(time, selectedSubject.units),
                room: '',
                qualified_professors: selectedSubject.qualified_professors || []
            };
    
            setEditingSlot(newSlot);
            setIsEditModalOpen(true);
            return;
        }

        // Standard flow: Open picker
        setPickerTarget({ day, time });
        setIsPickerModalOpen(true);
    };

    const handleSubjectSelect = (subject) => {
        setIsPickerModalOpen(false);
        
        // Prepare data for the Create Modal
        const newSlot = {
            id: null, // Indicates CREATE mode
            section_subject: subject.section_subject_id, // Might be null!
            subject_id: subject.subject_id, // Needed to create SectionSubject if missing
            section_id: section.id, // Needed to create SectionSubject
            subject_code: subject.subject_code,
            subject_title: subject.subject_title,
            professor: subject.professor_id,
            day: pickerTarget.day,
            start_time: pickerTarget.time,
            end_time: calculateEndTime(pickerTarget.time, subject.units),
            room: '',
            qualified_professors: subject.qualified_professors || []
        };

        setEditingSlot(newSlot);
        setIsEditModalOpen(true);
    };

    const handleSubjectToggle = (subject) => {
        if (selectedSubject && selectedSubject.subject_code === subject.subject_code) {
            setSelectedSubject(null); // Deselect
        } else {
            setSelectedSubject(subject); // Select
        }
    };

    const handleEditSlot = (slot) => {
        // Find subject metadata to ensure qualified professors are passed
        const subject = sectionData.subjects.find(s => 
            (s.section_subject_id === slot.section_subject) || (s.id === slot.section_subject)
        );
        
        setEditingSlot({
            ...slot,
            qualified_professors: subject?.professors || slot.qualified_professors || []
        });
        setIsEditModalOpen(true);
    };

    const handleSlotUpdate = () => {
        loadData(); // Refresh grid
    };
    
    const handleSlotDelete = async (slotId) => {
         if (!window.confirm('Remove this schedule slot?')) return;
        try {
            await SchedulingService.deleteSlot(slotId);
            showSuccess('Schedule slot removed');
            setIsEditModalOpen(false);
            loadData();
        } catch (err) {
            showError('Failed to delete slot');
        }
    };

    const handleAssignProfessor = async (professorId) => {
        try {
            await SchedulingService.updateSectionSubject(assignModalData.subject.id, {
                professor: professorId 
            });
            showSuccess('Professor assigned successfully');
            loadData(); // Reload to update both lists
            setAssignModalData(null);
        } catch (err) {
            showError('Failed to assign professor');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] text-center">
                <Loader2 className="text-indigo-600 animate-spin mb-4" size={48} />
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Initialising Planner...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 pb-10 border-b border-gray-100">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onBack}
                        className="p-3 bg-gray-100 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                                {sectionData.program_code}
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">
                            Weekly Planner for {sectionData?.name || section?.name}
                        </h2>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Sidebar: Subjects List */}
                <div className="w-full xl:w-80 shrink-0">
                    <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-xl z-20 sticky top-8 flex flex-col h-[calc(100vh-140px)]">
                         <div className="border-b border-gray-100 pb-4 mb-4">
                            <div className="flex items-center justify-between mb-4 bg-gray-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setViewMode('unscheduled')}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        viewMode === 'unscheduled' 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Pending
                                </button>
                                <button 
                                    onClick={() => setViewMode('scheduled')}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        viewMode === 'scheduled' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Scheduled
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    {viewMode === 'unscheduled' ? 'Subject List' : 'Scheduled Subjects'}
                                </h3>
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                    {displayedSubjects.length}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {displayedSubjects.length > 0 ? (
                                displayedSubjects.map((subject, idx) => (
                                    <div 
                                        key={subject.id || idx}
                                        onClick={() => viewMode === 'unscheduled' && handleSubjectToggle(subject)}
                                        className={`transition-all duration-200 ${
                                            viewMode === 'unscheduled' ? 'cursor-pointer' : ''
                                        } ${
                                            selectedSubject && selectedSubject.subject_code === subject.subject_code
                                            ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-2xl'
                                            : ''
                                        }`}
                                    >
                                        <UnscheduledSubjectCard 
                                            subject={subject} 
                                            onAssign={viewMode === 'unscheduled' ? (s) => setAssignModalData({ subject: s, currentProfessorId: s.professor_id }) : undefined}
                                            isSelected={selectedSubject && selectedSubject.subject_code === subject.subject_code}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">
                                        {viewMode === 'unscheduled' ? 'All subjects scheduled!' : 'No subjects scheduled yet.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main: Weekly Grid */}
                <div className="flex-1 overflow-x-auto">
                    <div className="min-w-[800px] bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        {/* Days Header */}
                        <div className="flex border-b-2 border-gray-100 bg-gray-50/50">
                            <div className="w-24 h-20 flex items-center justify-center border-r border-gray-100 shrink-0">
                                <Clock size={20} className="text-gray-300" />
                            </div>
                            {DAYS.map(day => (
                                <div key={day.id} className="flex-1 h-20 flex flex-col items-center justify-center border-r border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{day.label}</span>
                                    <span className="text-lg font-black text-gray-900 tracking-tighter italic">{day.id}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        <div className="flex relative">
                            {/* Time Column */}
                            <div className="w-24 shrink-0 bg-gray-50/30">
                                {TIME_SLOTS.map((slot) => (
                                    <div 
                                        key={slot.timeStr} 
                                        className="h-20 flex flex-col items-center justify-center border-b border-r border-gray-100 border-dashed"
                                    >
                                        <span className="text-[10px] font-black text-gray-900 tracking-tighter">
                                            {slot.label.split(' ')[0]}
                                        </span>
                                        <span className="text-[8px] font-black text-gray-400 uppercase">
                                            {slot.label.split(' ')[1]}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Content Grid */}
                            <div className="flex-1 grid grid-cols-6 h-full">
                                {DAYS.map(day => (
                                    <div key={day.id} className="flex flex-col">
                                        {TIME_SLOTS.map(slot => (
                                            <ScheduleCell 
                                                key={`${day.id}-${slot.timeStr}`}
                                                day={day.id} 
                                                time={slot.timeStr}
                                                onClick={handleCellClick}
                                                onMouseEnter={(d, t) => setHoveredCell({ d, t })}
                                                isHovered={hoveredCell?.d === day.id && hoveredCell?.t === slot.timeStr}
                                            >
                                                {scheduledSlots
                                                    .filter(s => s.day === day.id && s.start_time.startsWith(slot.timeStr))
                                                    .map(s => (
                                                        <ScheduledSlotCard 
                                                            key={s.id} 
                                                            slot={s} 
                                                            onClick={handleEditSlot}
                                                        />
                                                    ))
                                                }
                                            </ScheduleCell>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SubjectPickerModal 
                isOpen={isPickerModalOpen}
                onClose={() => setIsPickerModalOpen(false)}
                onSelect={handleSubjectSelect}
                subjects={pendingSubjects}
                timeRange={pickerTarget ? { day: DAYS.find(d => d.id === pickerTarget.day)?.label, startTime: pickerTarget.time, endTime: '...' } : null}
            />

            <EditScheduleSlotModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                slot={editingSlot}
                onUpdate={handleSlotUpdate}
                onDelete={handleSlotDelete}
            />

            <AssignProfessorModal 
                isOpen={!!assignModalData}
                onClose={() => setAssignModalData(null)}
                currentProfessorId={assignModalData?.currentProfessorId}
                onAssign={handleAssignProfessor}
            />
        </div>
    );
};

export default SchedulingEngine;
