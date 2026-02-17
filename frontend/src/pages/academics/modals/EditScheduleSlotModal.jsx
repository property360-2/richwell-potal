import React, { useState, useEffect } from 'react';
import { X, Users, MapPin, Clock, Calendar, Save, Trash2, Loader2, AlertTriangle, ArrowRight, BookOpen, Monitor, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SchedulingService } from '../services/SchedulingService';
import { useToast } from '../../../context/ToastContext';

const EditScheduleSlotModal = ({ isOpen, onClose, slot, onUpdate, onDelete }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        professor: '',
        room: '',
        day: '',
        start_time: '',
        end_time: ''
    });

    // Room Autocomplete State
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const data = await SchedulingService.getRooms();
                setRooms(data);
                setFilteredRooms(data);
            } catch (err) {
                console.error("Failed to fetch rooms", err);
            }
        };
        fetchRooms();
    }, []);

    const DAYS = [
        { id: 'MON', label: 'Monday' },
        { id: 'TUE', label: 'Tuesday' },
        { id: 'WED', label: 'Wednesday' },
        { id: 'THU', label: 'Thursday' },
        { id: 'FRI', label: 'Friday' },
        { id: 'SAT', label: 'Saturday' }
    ];

    useEffect(() => {
        if (slot) {
            setFormData({
                professor: slot.professor || '', // Empty string means TBA
                room: slot.room || '',
                day: slot.day || 'MON',
                start_time: slot.start_time ? slot.start_time.substring(0, 5) : '07:00',
                end_time: slot.end_time ? slot.end_time.substring(0, 5) : '08:30'
            });
        }
    }, [slot]);

    if (!isOpen || !slot) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (formData.start_time >= formData.end_time) {
            showError('Start time must be before end time');
            return;
        }

        setLoading(true);
        try {
            let sectionSubjectId = slot.section_subject;

            // If creating a new slot and SectionSubject doesn't exist yet, create it first
            if (!slot.id && !sectionSubjectId) {
                try {
                    const ss = await SchedulingService.createSectionSubject({
                        section: slot.section_id,
                        subject: slot.subject_id,
                        professor: formData.professor || null,
                        is_tba: !formData.professor
                    });
                    sectionSubjectId = ss.id;
                } catch (createErr) {
                    console.error('Failed to create SectionSubject:', createErr);
                    throw new Error('Failed to initialize subject for this section.');
                }
            }

            const payload = {
                ...formData,
                professor: formData.professor || null, // Convert empty string to null for TBA
                room: formData.room || ''
            };
            
            if (slot.id) {
                payload.id = slot.id;
            } else {
                // For creation, we need the section_subject ID
                payload.section_subject = sectionSubjectId;
            }

            await SchedulingService.saveSlot(payload);
            success(slot.id ? 'Schedule updated successfully' : 'Schedule created successfully');
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            showError(err.message || 'Failed to save schedule. Check for conflicts.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
                {/* Header - Matches SubjectPicker Style */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                Step 2
                            </span>
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                Finalize Schedule
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Schedule Details</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">
                    {/* Selected Subject Context Card */}
                    <div className="px-8 pt-8">
                        <div className="bg-white border-2 border-indigo-50 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    slot.subject_type === 'LAB' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    {slot.subject_type === 'LAB' ? <Monitor size={20} /> : <BookOpen size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-sm mb-0.5">{slot.subject_code}</h4>
                                    <p className="text-xs text-gray-500 font-medium line-clamp-1 w-full max-w-[280px]">
                                        {slot.subject_title}
                                    </p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Day & Time Group */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                             <Clock size={16} className="text-indigo-600" />
                             <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Time & Day</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                             {/* Day Picker */}
                             <div className="relative">
                                <select 
                                    value={formData.day}
                                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                                >
                                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ArrowRight size={16} className="rotate-90" />
                                </div>
                             </div>

                             {/* Time Range Inputs */}
                             <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Start</label>
                                    <input 
                                        type="time" 
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                        className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-black text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center"
                                    />
                                </div>
                                <span className="text-gray-300 font-black relative top-2">to</span>
                                <div className="flex-1 relative">
                                     <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">End</label>
                                    <input 
                                        type="time" 
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                        className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-black text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Resources Group */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                             <Users size={16} className="text-indigo-600" />
                             <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Resources (Optional)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Professor Selection */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 ml-1">Professor</label>
                                <select 
                                    value={formData.professor}
                                    onChange={(e) => setFormData({...formData, professor: e.target.value})}
                                    className={`w-full border-2 rounded-2xl px-3 py-3 text-xs font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none ${
                                        !formData.professor ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-gray-50 border-gray-100'
                                    }`}
                                >
                                    <option value="">TBA (Select to Assign)</option>
                                    {(slot.qualified_professors || []).map(p => (
                                        <option key={p.id} value={p.id} disabled={p.has_conflict}>
                                            {p.name} {p.has_conflict ? '• Busy at this time' : '• Available'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Room Selection with Autocomplete */}
                            <div className="space-y-1 relative group">
                                <label className="text-[10px] font-bold text-gray-400 ml-1">Room</label>
                                <MapPin size={14} className="absolute left-3 top-[34px] text-gray-400 z-10" />
                                <input 
                                    type="text" 
                                    placeholder="TBA (Type to search rooms)"
                                    value={formData.room}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({...formData, room: val});
                                        // Filter suggestions
                                        if (val.trim() === '') {
                                            setFilteredRooms([]);
                                        } else {
                                            const matches = rooms.filter(r => 
                                                r.name.toLowerCase().includes(val.toLowerCase())
                                            );
                                            setFilteredRooms(matches);
                                        }
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => {
                                        if (formData.room) {
                                            const matches = rooms.filter(r => 
                                                r.name.toLowerCase().includes(formData.room.toLowerCase())
                                            );
                                            setFilteredRooms(matches);
                                        } else {
                                            setFilteredRooms(rooms.slice(0, 5)); // Show first 5 if empty
                                        }
                                        setShowSuggestions(true);
                                    }}
                                    onBlur={() => {
                                        // Delay hide to allow click
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }}
                                    className={`w-full border-2 rounded-2xl pl-9 pr-3 py-3 text-xs font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all ${
                                        !formData.room ? 'bg-orange-50 border-orange-100 text-orange-600 placeholder-orange-400' : 'bg-gray-50 border-gray-100'
                                    }`}
                                />
                                {/* Suggestions Dropdown */}
                                {showSuggestions && filteredRooms.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                                        {filteredRooms.map(room => (
                                            <div 
                                                key={room.id}
                                                onClick={() => {
                                                    setFormData({...formData, room: room.name});
                                                    setShowSuggestions(false);
                                                }}
                                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            >
                                                <div className="text-xs font-bold text-gray-900">{room.name}</div>
                                                <div className="text-[10px] text-gray-400">{room.room_type} • Cap: {room.capacity}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                        {slot.id && (
                            <Button 
                                type="button"
                                variant="secondary"
                                onClick={() => onDelete(slot.id)}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-none rounded-2xl px-6 py-4 flex items-center gap-2 group transition-all h-auto"
                            >
                                <Trash2 size={18} />
                            </Button>
                        )}
                        <Button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white rounded-2xl px-8 py-4 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 border-none group transition-all h-auto"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span className="font-black uppercase tracking-widest text-[11px]">
                                {slot.id ? 'Update Schedule' : 'Confirm Schedule'}
                            </span>
                        </Button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

export default EditScheduleSlotModal;
