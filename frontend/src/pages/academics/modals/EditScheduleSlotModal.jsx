import React, { useState, useEffect } from 'react';
import { X, Users, MapPin, Clock, Calendar, Save, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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
                professor: slot.professor || '',
                room: slot.room || '',
                day: slot.day || 'MON',
                start_time: slot.start_time ? slot.start_time.substring(0, 5) : '07:00',
                end_time: slot.end_time ? slot.end_time.substring(0, 5) : '08:00'
            });
        }
    }, [slot]);

    if (!isOpen || !slot) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await SchedulingService.saveSlot({
                id: slot.id,
                ...formData
            });
            success('Schedule updated successfully');
            onUpdate();
            onClose();
        } catch (err) {
            showError('Failed to update schedule. Check for conflicts.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{slot.subject_code}</h2>
                                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-0.5 whitespace-nowrap">Edit Schedule Slot</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {/* Time & Day */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Day of Week</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select 
                                    value={formData.day}
                                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                                >
                                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time Range</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time" 
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-indigo-500 transition-all shrink-0"
                                />
                                <span className="text-gray-300 font-black">—</span>
                                <input 
                                    type="time" 
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-indigo-500 transition-all shrink-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professor & Room */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Professor</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select 
                                    value={formData.professor}
                                    onChange={(e) => setFormData({...formData, professor: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                                >
                                    <option value="">TBA Professor</option>
                                    {(slot.qualified_professors || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.specialization})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Room / Laboratory</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="e.g. LAB 101, RM 202"
                                    value={formData.room}
                                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                        <Button 
                            type="button"
                            variant="secondary"
                            onClick={() => onDelete(slot.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-none rounded-2xl px-6 py-4 flex items-center gap-2 group transition-all h-auto"
                        >
                            <Trash2 size={18} />
                            <span className="font-black uppercase tracking-widest text-[11px]">Delete Slot</span>
                        </Button>
                        <Button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white rounded-2xl px-8 py-4 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 border-none group transition-all h-auto"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span className="font-black uppercase tracking-widest text-[11px]">Update Schedule</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditScheduleSlotModal;
