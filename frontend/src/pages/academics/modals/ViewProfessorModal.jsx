import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, User, Briefcase, BookOpen, Clock, Calendar, Book, Layout, MapPin, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { FacultyService } from '../services/FacultyService';

const ViewProfessorModal = ({ isOpen, onClose, professor }) => {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);

    useEffect(() => {
        if (isOpen && professor?.id) {
            fetchProfessorDetails();
        } else if (!isOpen) {
            setDetails(null);
        }
    }, [isOpen, professor?.id]);

    const fetchProfessorDetails = async () => {
        try {
            setLoading(true);
            const data = await FacultyService.getProfessor(professor.id);
            setDetails(data);
        } catch (error) {
            console.error('Failed to fetch professor details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!professor) return null;

    const workload = details?.teaching_load || {};
    const schedule = details?.weekly_schedule || [];

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
                                        <div className="w-24 h-24 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center font-black text-4xl shadow-xl shadow-indigo-100 shrink-0">
                                            {professor.first_name?.[0]}{professor.last_name?.[0]}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-3xl font-black text-gray-900 leading-tight tracking-tighter italic uppercase">
                                                    {professor.last_name}, {professor.first_name}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    professor.is_active 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                        : 'bg-red-50 text-red-600 border border-red-100'
                                                }`}>
                                                    {professor.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 font-bold flex items-center gap-2">
                                                <span className="bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm text-sm">
                                                    {professor.email}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Gathering Academic Payload...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Top Section: Breadth & Workload */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="p-6 bg-white border-2 border-gray-50 rounded-3xl space-y-4">
                                                    <div className="flex items-center gap-3 text-indigo-600">
                                                        <Briefcase size={20} />
                                                        <span className="text-xs font-black uppercase tracking-widest">Departmental Bio</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</span>
                                                            <span className="font-bold text-gray-900">{professor.profile?.department || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Specialization</span>
                                                            <span className="font-bold text-gray-900">{professor.profile?.specialization || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-3xl space-y-6 md:col-span-2">
                                                    {/* Qualified Subjects - from Profile */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3 text-indigo-600">
                                                            <BookOpen size={18} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Authorized To Teach</span>
                                                        </div>
                                                        {professor.profile?.assigned_subjects?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {professor.profile.assigned_subjects.map((sub, idx) => (
                                                                    <span key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 text-[10px] font-black text-indigo-600 shadow-sm uppercase tracking-tight">
                                                                        {sub.code}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] font-bold text-gray-400 italic">No specific subjects authorized in profile.</p>
                                                        )}
                                                    </div>

                                                    {/* Separator */}
                                                    <div className="h-px bg-indigo-100/50 w-full" />

                                                    {/* Active Term Load - from Schedule */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3 text-indigo-600">
                                                            <Layout size={18} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Active Term Assignments</span>
                                                        </div>
                                                        
                                                        {workload.sections_detail?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {workload.sections_detail.map((detail, idx) => (
                                                                    <div key={idx} className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-3 group hover:border-indigo-300 transition-all">
                                                                        <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 font-black text-xs">
                                                                            {detail.subject_code}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[11px] font-black text-gray-900 leading-none">{detail.subject_title}</p>
                                                                            <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">{detail.section}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] font-bold text-gray-400 italic italic">No active section assignments for the current term.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle Section: Weekly Schedule */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-gray-900">
                                                        <Calendar size={20} className="text-indigo-600" />
                                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Weekly Plot</span>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Load:</span>
                                                            <span className="text-xs font-black text-indigo-600">{workload.total_hours_per_week || 0} Hrs</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white border-2 border-gray-50 rounded-[32px] overflow-hidden shadow-sm">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50/50">
                                                            <tr>
                                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Day</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject & Section</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {schedule.length > 0 ? (
                                                                schedule.map((slot) => (
                                                                    <tr key={slot.id} className="hover:bg-gray-50/30 transition-colors">
                                                                        <td className="px-6 py-4 text-xs font-black text-indigo-600 uppercase tracking-widest">
                                                                            {slot.day_display}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <p className="text-xs font-bold text-gray-900">{slot.start_time} - {slot.end_time}</p>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="bg-gray-100 px-2 py-1 rounded-lg text-[10px] font-black text-gray-600">{slot.subject.code}</span>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-gray-900">{slot.subject.title}</p>
                                                                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{slot.section.name}</p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                                <MapPin size={14} className="text-gray-300" />
                                                                                <span className="text-xs font-bold">{slot.room || 'TBA'}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="px-6 py-12 text-center">
                                                                        <p className="text-sm font-bold text-gray-300 italic uppercase tracking-widest">No plotted schedule for this instructor.</p>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="p-8 bg-gray-50/50 flex justify-end gap-3 rounded-b-[40px]">
                                    <Button 
                                        variant="secondary" 
                                        onClick={onClose} 
                                        className="rounded-2xl px-8 bg-white border-2 border-gray-100 font-black text-[11px] uppercase tracking-widest hover:border-gray-200"
                                    >
                                        Close Portal
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

export default ViewProfessorModal;
