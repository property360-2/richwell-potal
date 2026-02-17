import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Building2, Users, Calendar, MapPin, Loader2, BookOpen, User as UserIcon } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { FacilitiesService } from '../services/FacilitiesService';

const ViewRoomModal = ({ isOpen, onClose, room }) => {
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState([]);

    useEffect(() => {
        if (isOpen && room?.id) {
            fetchRoomSchedule();
        } else if (!isOpen) {
            setSchedule([]);
        }
    }, [isOpen, room?.id]);

    const fetchRoomSchedule = async () => {
        try {
            setLoading(true);
            const data = await FacilitiesService.getRoomSchedule(room.id);
            setSchedule(data);
        } catch (error) {
            console.error('Failed to fetch room schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!room) return null;

    const getRoomTypeLabel = (type) => {
        switch (type) {
            case 'LECTURE': return 'Lecture Room';
            case 'COMPUTER_LAB': return 'Computer Laboratory';
            default: return type;
        }
    };

    const dayOrder = {
        'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6, 'SUN': 7
    };

    const sortedSchedule = [...schedule].sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.start_time.localeCompare(b.start_time);
    });

    const getDayLabel = (day) => {
        const labels = {
            'MON': 'Monday',
            'TUE': 'Tuesday',
            'WED': 'Wednesday',
            'THU': 'Thursday',
            'FRI': 'Friday',
            'SAT': 'Saturday',
            'SUN': 'Sunday'
        };
        return labels[day] || day;
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[6000]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-[40px] bg-white p-0 text-left align-middle shadow-2xl transition-all border border-gray-100">
                                {/* Header Section */}
                                <div className="p-8 bg-gray-50/50 border-b border-gray-100 relative">
                                    <button onClick={onClose} className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full shadow-sm transition-all z-10">
                                        <X size={20} />
                                    </button>

                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center font-black shadow-xl shadow-indigo-100 shrink-0">
                                            <Building2 size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-3xl font-black text-gray-900 leading-tight tracking-tighter italic uppercase">
                                                    {room.name}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    room.is_active 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                        : 'bg-red-50 text-red-600 border border-red-100'
                                                }`}>
                                                    {room.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                                <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                    {getRoomTypeLabel(room.room_type)}
                                                </span>
                                                <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                    <Users size={12} className="text-indigo-400" />
                                                    {room.capacity} Capacity
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Scanning Terminal Timeline...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 text-gray-900">
                                                <Calendar size={20} className="text-indigo-600" />
                                                <span className="text-xs font-black uppercase tracking-[0.2em]">Room Utilization Plot</span>
                                            </div>

                                            <div className="bg-white border-2 border-gray-50 rounded-[32px] overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-gray-50/50">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Day</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Slot</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject & Section</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {sortedSchedule.length > 0 ? (
                                                            sortedSchedule.map((slot, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                                                            {getDayLabel(slot.day)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <p className="text-xs font-bold text-gray-900 tracking-tight">{slot.start_time} - {slot.end_time}</p>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="bg-indigo-50 px-2 py-1 rounded-lg text-[9px] font-black text-indigo-600 uppercase">
                                                                                {slot.subject_code}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-bold text-gray-900 leading-tight">{slot.subject_title}</p>
                                                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{slot.section_name}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2.5 text-gray-700">
                                                                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                                                <UserIcon size={14} className="text-gray-400" />
                                                                            </div>
                                                                            <span className="text-xs font-bold truncate max-w-[150px]">{slot.professor_name}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" className="px-6 py-16 text-center">
                                                                    <div className="flex flex-col items-center justify-center gap-4 text-gray-300">
                                                                        <Calendar size={40} className="opacity-50" />
                                                                        <p className="text-sm font-bold italic uppercase tracking-widest">No assigned classes for this room.</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 bg-gray-50/50 flex justify-end gap-3 rounded-b-[40px]">
                                    <Button 
                                        variant="secondary" 
                                        onClick={onClose} 
                                        className="rounded-2xl px-8 bg-white border-2 border-gray-100 font-black text-[11px] uppercase tracking-widest hover:border-gray-200"
                                    >
                                        Exit Terminal
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ViewRoomModal;
