import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, AlertCircle, BookOpen, CheckCircle2, Loader2, Info, Edit2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';

const AddProgramModal = ({ isOpen, onClose, onSuccess, program = null }) => {
    const { success, error: showError } = useToast();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        duration_years: 4
    });

    const [loading, setLoading] = useState(false);
    const [checkingDuplicate, setCheckingDuplicate] = useState(false);
    const [duplicateError, setDuplicateError] = useState('');

    // Reset/Populate form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (program) {
                setFormData({
                    code: program.code,
                    name: program.name,
                    description: program.description || '',
                    duration_years: program.duration_years
                });
            } else {
                setFormData({
                    code: '',
                    name: '',
                    description: '',
                    duration_years: 4
                });
            }
            setDuplicateError('');
        }
    }, [isOpen, program]);

    // real-time duplicate check
    useEffect(() => {
        if (!formData.code || formData.code.length < 2) {
            setDuplicateError('');
            return;
        }

        // If editing and code hasn't changed, skip check
        if (program && formData.code === program.code) {
            setDuplicateError('');
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingDuplicate(true);
            try {
                const isDuplicate = await ProgramService.checkDuplicate(formData.code);
                if (isDuplicate) {
                    setDuplicateError(`Program code "${formData.code}" is already taken.`);
                } else {
                    setDuplicateError('');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setCheckingDuplicate(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.code, program]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'code' 
                ? value.toUpperCase().replace(/\s/g, '') 
                : name === 'duration_years' 
                    ? parseInt(value) 
                    : value
        }));
    };

    const isFormValid = 
        formData.code.length >= 2 && 
        formData.name.trim().length >= 3 && 
        !duplicateError && 
        !checkingDuplicate &&
        formData.duration_years > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setLoading(true);
        try {
            if (program) {
                await ProgramService.updateProgram(program.id, formData);
                success('Program updated successfully!');
            } else {
                await ProgramService.createProgram(formData);
                success('Program created successfully!');
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || 
                       (err.response?.data && Object.entries(err.response.data).map(([k,v]) => `${k}: ${v}`).join(', ')) ||
                       'Failed to save program';
            showError(msg);
        } finally {
            setLoading(false);
        }
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
                            <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-[32px] bg-white p-10 text-left align-middle shadow-xl transition-all border border-gray-100">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 ${program ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} rounded-2xl flex items-center justify-center shadow-inner`}>
                                            {program ? <Edit2 size={28} /> : <BookOpen size={28} />}
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-2xl font-black text-gray-900 leading-tight">
                                                {program ? 'Edit Program' : 'Add New Program'}
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-500 font-medium italic">
                                                {program ? 'Update program details and curriculum' : 'Define a new path for student excellence'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Code Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Program Code</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                name="code"
                                                value={formData.code}
                                                onChange={handleChange}
                                                placeholder="e.g., BSIT"
                                                readOnly={!!program} // Lock code in edit mode
                                                className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold transition-all outline-none ${
                                                    program ? 'cursor-not-allowed opacity-70 border-gray-100' :
                                                    duplicateError 
                                                        ? 'border-red-100 focus:border-red-200 text-red-600' 
                                                        : 'border-transparent focus:bg-white focus:border-indigo-100'
                                                }`}
                                                disabled={loading || !!program}
                                            />
                                            {!program && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {checkingDuplicate && <Loader2 size={18} className="animate-spin text-indigo-500" />}
                                                    {!checkingDuplicate && formData.code.length >= 2 && !duplicateError && (
                                                        <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in" />
                                                    )}
                                                    {duplicateError && <AlertCircle size={18} className="text-red-500 animate-in shake" />}
                                                </div>
                                            )}
                                            {program && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded-md">LOCKED</span>
                                                </div>
                                            )}
                                        </div>
                                        {duplicateError && (
                                            <p className="text-[10px] font-bold text-red-500 ml-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                                                <AlertCircle size={12} />
                                                {duplicateError}
                                            </p>
                                        )}
                                        {!duplicateError && !formData.code && !program && (
                                            <p className="text-[10px] font-medium text-gray-400 ml-1 flex items-center gap-1">
                                                <Info size={12} />
                                                Short alphanumeric code (BSIT, AB-COMM, etc.)
                                            </p>
                                        )}
                                    </div>

                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Program Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="e.g., Bachelor of Science in Information Technology"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Duration Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Duration (Years)</label>
                                            <select
                                                name="duration_years"
                                                value={formData.duration_years}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                                                disabled={loading}
                                            >
                                                {[1, 2, 3, 4, 5, 6].map(yr => (
                                                    <option key={yr} value={yr}>{yr} Year{yr > 1 ? 's' : ''}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col justify-end">
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                                <Info size={16} className="text-amber-500 mt-0.5" />
                                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                                    {program 
                                                        ? 'Changes here will reflect on all students and faculty enrolled.' 
                                                        : 'Creating a program will allow you to assign subjects and build curricula later.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Description (Optional)</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Briefly describe the program's objectives..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none min-h-[100px] resize-none"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            onClick={onClose}
                                            className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[11px] rounded-2xl"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit"
                                            disabled={!isFormValid || loading}
                                            className={`flex-[2] py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                !isFormValid 
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                                    : program 
                                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                            }`}
                                        >
                                            {loading ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                program ? <Edit2 size={18} /> : <CheckCircle2 size={18} />
                                            )}
                                            <span className="font-black uppercase tracking-widest text-[11px]">
                                                {loading ? (program ? 'Updating...' : 'Creating...') : (program ? 'Update Program' : 'Confirm & Create')}
                                            </span>
                                        </Button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AddProgramModal;
