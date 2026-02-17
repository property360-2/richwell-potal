import React, { useState } from 'react';
import { 
    X, 
    Building2, 
    Users, 
    Layers,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { FacilitiesService } from '../services/FacilitiesService';

const AddRoomModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        capacity: 40,
        room_type: 'LECTURE',
        is_active: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Room name/number is required';
        if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await FacilitiesService.createRoom(formData);
            onSuccess();
        } catch (err) {
            console.error(err);
            setErrors({ submit: err.response?.data?.message || 'Failed to register room' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const roomTypes = [
        { id: 'LECTURE', title: 'Lecture Room', desc: 'Standard classroom space' },
        { id: 'COMPUTER_LAB', title: 'Computer Lab', desc: 'Computer/Science lab' }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="bg-indigo-600 p-10 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-indigo-500/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    
                    <div className="relative flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/30 shadow-inner">
                                <Building2 className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Register Room</h2>
                                <p className="text-indigo-100 text-[11px] font-black uppercase tracking-[0.2em] mt-0.5">Campus Infrastructure</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all ring-1 ring-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-10">
                    <div className="space-y-8">
                        {/* Room Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Room Name / Number</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="text"
                                    placeholder="e.g. Room 301 or Lab A"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    className={`w-full bg-gray-50 border-2 ${errors.name ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-indigo-500 ring-indigo-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none`}
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.name}</p>}
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Capacity</label>
                            <div className="relative group">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={18} />
                                <input 
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    className={`w-full bg-gray-50 border-2 ${errors.capacity ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-indigo-500 ring-indigo-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none`}
                                />
                                {errors.capacity && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.capacity}</p>}
                            </div>
                        </div>

                        {/* Room Type */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Facility Classification</label>
                            <div className="grid grid-cols-2 gap-3">
                                {roomTypes.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, room_type: type.id })}
                                        className={`flex flex-col items-start p-4 rounded-[24px] border-2 transition-all ${
                                            formData.room_type === type.id 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                            : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Layers size={14} className={formData.room_type === type.id ? 'text-indigo-200' : 'text-indigo-500'} />
                                            <span className="text-[11px] font-black uppercase tracking-tight">{type.title}</span>
                                        </div>
                                        <p className={`text-[9px] font-medium leading-tight text-left ${formData.room_type === type.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                            {type.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100">
                            <X className="shrink-0" size={20} />
                            <p className="text-[11px] font-black uppercase tracking-tight">{errors.submit}</p>
                        </div>
                    )}

                    <div className="mt-10 flex gap-4">
                        <Button 
                            variant="secondary" 
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-[22px] py-4 h-auto font-black uppercase tracking-widest text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 border-none"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] rounded-[22px] py-4 h-auto shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                            )}
                            <span className="font-black uppercase tracking-widest text-[11px]">
                                {isSubmitting ? 'Registering...' : 'Add Room'}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRoomModal;
