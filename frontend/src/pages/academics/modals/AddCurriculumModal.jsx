import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Layers, AlertCircle, Save, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { CurriculumService } from '../services/CurriculumService';
import { useToast } from '../../../context/ToastContext';

const AddCurriculumModal = ({ isOpen, onClose, programId, programName, onSuccess }) => {
    const { success: showSuccess, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        effective_year: new Date().getFullYear(),
        description: '',
        is_active: true,
        copy_from: ''
    });
    const [existingCurricula, setExistingCurricula] = useState([]);

    React.useEffect(() => {
        if (isOpen && programId) {
            fetchExistingCurricula();
        }
    }, [isOpen, programId]);

    const fetchExistingCurricula = async () => {
        try {
            const data = await CurriculumService.getCurricula(programId);
            setExistingCurricula(data);
        } catch (err) {
            console.error('Failed to fetch existing curricula', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await CurriculumService.createCurriculum({
                ...formData,
                program: programId,
                copy_from: formData.copy_from || null
            });
            showSuccess('Curriculum created successfully');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                code: '',
                name: '',
                effective_year: new Date().getFullYear(),
                description: '',
                is_active: true,
                copy_from: ''
            });
        } catch (err) {
            console.error(err);
            showError(err.message || 'Failed to create curriculum');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[7000]" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-[40px] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                                <form onSubmit={handleSubmit}>
                                    {/* Header */}
                                    <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                                <Layers size={24} />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-black text-gray-900 tracking-tight">
                                                    New Curriculum 
                                                </Dialog.Title>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{programName}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                                            onClick={onClose}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="px-10 py-8 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Revision Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="e.g. REV-2024"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Effective Year</label>
                                                <input
                                                    required
                                                    type="number"
                                                    value={formData.effective_year}
                                                    onChange={(e) => setFormData({...formData, effective_year: parseInt(e.target.value)})}
                                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Display Name</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. 2024 Revised Curriculum"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                                            <textarea
                                                rows={3}
                                                placeholder="Summary of changes or implementation notes..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Copy Subjects From (Optional)</label>
                                            <select
                                                value={formData.copy_from}
                                                onChange={(e) => setFormData({...formData, copy_from: e.target.value})}
                                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            >
                                                <option value="">Do not copy (Start empty)</option>
                                                {existingCurricula.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.code} - {c.name} ({c.effective_year})
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-gray-400 ml-1 italic">Selecting an existing curriculum will copy all its subject assignments to this new revision.</p>
                                        </div>

                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                                <AlertCircle size={20} />
                                            </div>
                                            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                                Creating a new curriculum version will not affect currently enrolled students. They will remain on their current curriculum unless manually transitioned.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-gray-50/50 px-10 py-8 border-t border-gray-100 flex items-center justify-end gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-2xl px-8 border-gray-200"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={loading}
                                            className="rounded-2xl px-10 shadow-indigo-100 shadow-xl flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    Save Curriculum
                                                </>
                                            )}
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

export default AddCurriculumModal;
