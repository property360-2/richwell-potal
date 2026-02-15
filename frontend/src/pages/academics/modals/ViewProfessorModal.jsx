import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, User, Briefcase, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ViewProfessorModal = ({ isOpen, onClose, professor }) => {
    if (!professor) return null;

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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[32px] bg-white p-8 text-left align-middle shadow-xl transition-all border border-gray-100">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">
                                            {professor.first_name?.[0]}{professor.last_name?.[0]}
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-xl font-black text-gray-900 leading-tight">
                                                {professor.last_name}, {professor.first_name}
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-500 font-medium">{professor.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-gray-700">
                                            <Briefcase size={18} className="text-gray-400" />
                                            <span className="font-bold text-gray-900 w-24">Department:</span>
                                            <span>{professor.profile?.department || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-700">
                                            <BookOpen size={18} className="text-gray-400" />
                                            <span className="font-bold text-gray-900 w-24">Specialization:</span>
                                            <span>{professor.profile?.specialization || 'N/A'}</span>
                                        </div>
                                         <div className="flex items-center gap-3 text-sm text-gray-700">
                                            <Clock size={18} className="text-gray-400" />
                                            <span className="font-bold text-gray-900 w-24">Max Hours:</span>
                                            <span>{professor.profile?.max_teaching_hours || 30} hrs/week</span>
                                        </div>
                                    </div>

                                    {/* Work in Progress Notice */}
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
                                        <AlertTriangle className="shrink-0 w-5 h-5 text-amber-500" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Work in Progress</p>
                                            <p className="text-sm">
                                                Advanced statistics, schedule visualization, and full profile editing will be available in the next update.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-50">
                                    <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                                        Close
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
