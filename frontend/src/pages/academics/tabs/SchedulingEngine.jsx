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
    GripVertical,
    AlertTriangle,
    CheckCircle,
    Calendar
} from 'lucide-react';
import { 
    DndContext, 
    DragOverlay, 
    useDraggable, 
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { useToast } from '../../../context/ToastContext';
import { SchedulingService } from '../services/SchedulingService';
import Button from '../../../components/ui/Button';
import EditScheduleSlotModal from '../modals/EditScheduleSlotModal';

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

// --- Components ---

const DraggableSubject = ({ subject }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `subject-${subject.id}`,
        data: { type: 'SUB_BUCKET', subject }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            {...listeners} 
            {...attributes}
            className={`
                bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-grab active:cursor-grabbing group
                ${isDragging ? 'opacity-50 grayscale scale-95' : ''}
            `}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    {subject.subject_type === 'LAB' ? <Monitor size={16} /> : <BookOpen size={16} />}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{subject.units} Units</span>
                    <GripVertical size={14} className="text-gray-300" />
                </div>
            </div>
            <h5 className="text-sm font-black text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors uppercase italic tracking-tight">
                {subject.subject_code}
            </h5>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed line-clamp-2">
                {subject.subject_title}
            </p>
            
            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400">
                    <Users size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest truncate">
                        {subject.professor_name || 'TBA Professor'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const DroppableCell = ({ day, time, isProfBusy, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${day}-${time}`,
        data: { day, time }
    });

    return (
        <div 
            ref={setNodeRef}
            className={`
                relative h-20 border-b border-r border-gray-50 transition-colors
                ${isOver ? 'bg-indigo-50/50' : ''}
                ${isProfBusy ? 'bg-orange-50/40 cursor-not-allowed' : 'hover:bg-gray-50/30'}
                ${isOver && isProfBusy ? 'bg-red-50/60' : ''}
            `}
        >
            {isProfBusy && !children && (
                <div className="absolute inset-x-2 top-2 bottom-2 rounded-lg border border-dashed border-orange-200 bg-orange-100/10 flex items-center justify-center opacity-40">
                    <Users size={12} className="text-orange-400" />
                </div>
            )}
            {children}
        </div>
    );
};

const ScheduledSlotCard = ({ slot, onClick, onRemove }) => {
    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onClick(slot);
            }}
            className="absolute inset-x-1 top-1 bottom-1 bg-white rounded-xl border-l-4 border-l-indigo-500 border border-gray-100 shadow-md p-3 group animate-in zoom-in duration-300 z-10 cursor-alias hover:border-indigo-300 transition-all"
        >
            <div className="flex justify-between items-start mb-1 leading-none">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter italic">
                    {slot.subject_code}
                </span>
                <button 
                    onClick={() => onRemove(slot.id)}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                    <X size={10} />
                </button>
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
    const [activeDragId, setActiveDragId] = useState(null);
    const [dragData, setDragData] = useState(null);
    const [professorSchedule, setProfessorSchedule] = useState([]);
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await SchedulingService.getSectionSchedule(section.id);
            setSectionData(data);
            
            const subjects = data.subjects || [];
            const slots = [];
            const bucket = [];

            subjects.forEach(sub => {
                if (sub.schedule_slots && sub.schedule_slots.length > 0) {
                    sub.schedule_slots.forEach(slot => {
                        slots.push({
                            ...slot,
                            subject_id: sub.subject_id,
                            subject_code: sub.subject_code,
                            subject_title: sub.subject_title,
                            professor_name: sub.professor_name,
                            professor_id: sub.professor_id
                        });
                    });
                }
                
                // Always keep in bucket if not all hours scheduled (simplified: if no slots at all)
                if (!sub.schedule_slots || sub.schedule_slots.length === 0) {
                    bucket.push({
                        ...sub,
                        id: sub.section_subject_id
                    });
                }
            });

            setUnscheduledSubjects(bucket);
            setScheduledSlots(slots);
        } catch (err) {
            showError('Failed to load scheduling data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [section.id]);

    const handleDragStart = async (event) => {
        const data = event.active.data.current;
        setActiveDragId(event.active.id);
        setDragData(data);

        // If subject has a professor, fetch their schedule to show availability
        if (data.subject?.professor_id) {
            try {
                const schedule = await SchedulingService.getProfessorSchedule(
                    data.subject.professor_id, 
                    sectionData.semester_info.id
                );
                setProfessorSchedule(schedule);
            } catch (err) {
                console.error('Failed to fetch professor schedule', err);
            }
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        setDragData(null);
        setProfessorSchedule([]); // Clear schedule overlay

        if (!over) return;

        const cellData = over.data.current;
        const subData = active.data.current.subject;

        if (subData) {
            try {
                // 1. Conflict Check (Optimistic but verified)
                const startTimeStr = cellData.time;
                const [h, m] = startTimeStr.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(h + 1, m); // Default 1 hour
                const endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

                // Check Section Conflict
                const sectionConflict = await SchedulingService.checkSectionConflict({
                    section_id: section.id,
                    day: cellData.day,
                    start_time: startTimeStr,
                    end_time: endTimeStr
                });

                if (sectionConflict.has_conflict) {
                    showError(`Section Conflict: Overlaps with ${sectionConflict.conflict}`);
                    return;
                }

                // Check Professor Conflict (Warning)
                if (subData.professor_id) {
                    const profConflict = await SchedulingService.checkProfessorConflict({
                        professor_id: subData.professor_id,
                        semester_id: sectionData.semester_info.id,
                        day: cellData.day,
                        start_time: startTimeStr,
                        end_time: endTimeStr
                    });

                    if (profConflict.has_conflict) {
                        const confirm = window.confirm(`Professor Conflict: ${subData.professor_name} is already busy with ${profConflict.conflict}. Proceed anyway?`);
                        if (!confirm) return;
                    }
                }

                const newSlot = {
                    section_subject: subData.id,
                    day: cellData.day,
                    start_time: startTimeStr,
                    end_time: endTimeStr,
                    professor: subData.professor_id,
                    room: ''
                };

                const saved = await SchedulingService.saveSlot(newSlot);
                showSuccess(`Scheduled ${subData.subject_code}`);
                loadData(); // Refresh all data to sync state

            } catch (err) {
                console.error(err);
                showError('Failed to save schedule slot.');
            }
        }
    };

    const handleRemoveSlot = async (slotId) => {
        if (!window.confirm('Remove this schedule slot?')) return;
        
        try {
            await SchedulingService.deleteSlot(slotId);
            showSuccess('Schedule slot removed');
            loadData();
        } catch (err) {
            showError('Failed to remove slot');
        }
    };

    const handleEditSlot = (slot) => {
        // Find the full subject data from sectionData to get qualified professors
        const subject = sectionData.subjects.find(s => s.section_subject_id === slot.section_subject);
        setEditingSlot({
            ...slot,
            qualified_professors: subject?.qualified_professors || []
        });
        setIsEditModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] text-center">
                <Loader2 className="text-indigo-600 animate-spin mb-4" size={48} />
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Initialising Schedule View...</p>
            </div>
        );
    }

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                {/* Toolbar */}
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
                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Weekly Planner for {sectionData?.name || section?.name}</h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Removed functionality buttons as requested */}
                    </div>
                </div>

                {/* Dashboard Stats */}
                {/* Dashboard Stats Removed */}

                {/* Split Context Area */}
                <div className="flex flex-col xl:flex-row gap-8">
                    {/* Sidebar: Subject Bucket */}
                    <div className="w-full xl:w-96 shrink-0">
                        <div className="bg-gray-50 rounded-[40px] p-8 border border-gray-100/50 sticky top-8">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.15em] flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                        <Layout size={16} />
                                    </div>
                                    Section Subjects
                                </h4>
                                <span className="px-4 py-1.5 bg-white text-indigo-600 text-[11px] font-black rounded-full shadow-sm border border-indigo-50">
                                    {unscheduledSubjects.length}
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {unscheduledSubjects.length > 0 ? (
                                    unscheduledSubjects.map(subject => (
                                        <DraggableSubject key={subject.id} subject={subject} />
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center text-center bg-white rounded-[32px] border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h5 className="text-sm font-black text-gray-900 uppercase mb-1">Fully Plotted!</h5>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">All subjects have schedule slots</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-8 p-6 bg-indigo-900 rounded-[28px] text-white">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Quick Help</p>
                                <div className="flex items-start gap-3">
                                    <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-bold leading-relaxed text-indigo-100 italic">
                                        Drag a subject card to any time slot in the grid. Double-click a card in the grid to assign a room.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main: Weekly Grid */}
                    <div className="flex-1 overflow-x-auto min-h-[1000px]">
                        <div className="w-full bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
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
                                    {TIME_SLOTS.map((slot, idx) => (
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
                                <div className="flex-1 grid grid-cols-6 h-full relative">
                                    {DAYS.map(day => (
                                        <div key={day.id} className="flex flex-col">
                                            {TIME_SLOTS.map(slot => {
                                                const isProfBusy = professorSchedule.some(s => 
                                                    s.day === day.id && 
                                                    s.start_time.startsWith(slot.timeStr.substring(0, 5))
                                                );

                                                return (
                                                    <DroppableCell 
                                                        key={`${day.id}-${slot.timeStr}`} 
                                                        day={day.id} 
                                                        time={slot.timeStr}
                                                        isProfBusy={isProfBusy}
                                                    >
                                                        {scheduledSlots
                                                            .filter(s => s.day === day.id && s.start_time.startsWith(slot.timeStr.substring(0, 5)))
                                                            .map(s => (
                                                                <ScheduledSlotCard 
                                                                    key={s.id} 
                                                                    slot={s} 
                                                                    onRemove={handleRemoveSlot} 
                                                                />
                                                            ))
                                                        }
                                                    </DroppableCell>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    
                                    {/* Grid Overlay for Visual Alignment */}
                                    <div className="absolute inset-0 pointer-events-none grid grid-rows-[repeat(auto-fill,5rem)]">
                                        {TIME_SLOTS.map((_, i) => (
                                            <div key={i} className="border-b border-gray-100 border-dashed w-full h-20"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: '0.5',
                            },
                        },
                    }),
                }}>
                    {activeDragId ? (
                        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl scale-105 opacity-90 cursor-grabbing w-72">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                    <Layout size={20} />
                                </div>
                                <h5 className="text-sm font-black text-gray-900 uppercase italic">
                                    {dragData.subject.subject_code}
                                </h5>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                {dragData.subject.subject_title}
                            </p>
                        </div>
                    ) : null}
                </DragOverlay>

                {/* Modals */}
                <EditScheduleSlotModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    slot={editingSlot}
                    onUpdate={loadData}
                    onDelete={handleRemoveSlot}
                />
            </div>
        </DndContext>
    );
};

export default SchedulingEngine;
