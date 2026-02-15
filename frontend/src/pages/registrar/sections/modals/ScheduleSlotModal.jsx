import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    X, 
    Calendar, 
    MapPin, 
    User, 
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';

const DAYS = [
    { code: 'MON', name: 'Monday' },
    { code: 'TUE', name: 'Tuesday' },
    { code: 'WED', name: 'Wednesday' },
    { code: 'THU', name: 'Thursday' },
    { code: 'FRI', name: 'Friday' },
    { code: 'SAT', name: 'Saturday' },
    { code: 'SUN', name: 'Sunday' }
];

const ROOMS = [
    'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
    'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
    'Lab 1', 'Lab 2', 'Lab 3', 'Computer Lab A', 'Computer Lab B',
    'Multi-purpose Hall', 'Library Conference'
];

const ScheduleSlotModal = ({ isOpen, onClose, sectionSubject, onSuccess }) => {
    const { success, error, info } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [professors, setProfessors] = useState([]);

    const [formData, setFormData] = useState({
        day: 'MON',
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        professor_id: ''
    });

    useEffect(() => {
        fetchProfessors();
    }, []);

    useEffect(() => {
        if (isOpen && sectionSubject) {
            setFormData({
                day: 'MON',
                start_time: '08:00',
                end_time: '10:00',
                room: sectionSubject.room || '',
                professor_id: sectionSubject.professor_id || ''
            });
        }
    }, [isOpen, sectionSubject]);

    const fetchProfessors = async () => {
        try {
            const res = await fetch('/api/v1/academic/professors/');
            if (res.ok) {
                const data = await res.json();
                setProfessors(data.results || data || []);
            }
        } catch (err) {
            console.error('Failed to load professors', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setSubmitting(true);
            const res = await fetch(`/api/v1/academic/sections/subjects/${sectionSubject.id}/add-slot/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                success('Schedule slot confirmed');
                onSuccess();
                onClose();
            } else {
                const errData = await res.json();
                error(errData.detail || 'Schedule conflict detected');
            }
        } catch (err) {
            error('Connection error during sync');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Schedule: ${sectionSubject?.subject_code || 'Subject'}`} size="lg">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Day Selection */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Weekly Assignment</label>
                    <div className="flex flex-wrap gap-2 p-6 bg-gray-50/50 rounded-[32px] border border-gray-100">
                        {DAYS.map(d => (
                            <button
                                key={d.code}
                                type="button"
                                onClick={() => setFormData({...formData, day: d.code})}
                                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2
                                    ${formData.day === d.code 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                        : 'bg-white border-transparent text-gray-400 hover:border-blue-100 hover:text-gray-600'}`}
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time & Room */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Time Slots</label>
                        <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2">Start Time</p>
                                    <input 
                                        type="time" 
                                        required
                                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all shadow-sm"
                                        value={formData.start_time}
                                        onChange={e => setFormData({...formData, start_time: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2">End Time</p>
                                    <input 
                                        type="time" 
                                        required
                                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all shadow-sm"
                                        value={formData.end_time}
                                        onChange={e => setFormData({...formData, end_time: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Facility Allocation</label>
                        <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2">Room / Laboratory</p>
                            <select 
                                className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer shadow-sm"
                                value={formData.room}
                                onChange={e => setFormData({...formData, room: e.target.value})}
                            >
                                <option value="">TBA / Virtual</option>
                                {ROOMS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Professor Assignment */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Instructional Load</label>
                    <div className="p-8 bg-gray-50/50 rounded-[40px] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2 ml-1">Assigned Professor</p>
                        <select 
                            className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer shadow-sm"
                            value={formData.professor_id}
                            onChange={e => setFormData({...formData, professor_id: e.target.value})}
                        >
                            <option value="">No Instructor Assigned</option>
                            {professors.map(p => (
                                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.department || 'General'})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs font-bold text-amber-900/60 leading-relaxed">
                        The system will automatically check for room and professor overlaps. If a conflict exists, you will be notified upon confirmation.
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={onClose} 
                        className="flex-1"
                    >
                        CANCEL
                    </Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="flex-1"
                        loading={submitting}
                        disabled={submitting}
                    >
                        CONFIRM SLOT
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleSlotModal;
