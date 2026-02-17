import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
    X, 
    BookOpen, 
    Search, 
    Plus, 
    Globe, 
    ShieldAlert,
    Loader2,
    CheckCircle2,
    Share2,
    Layout,
    Layers
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';

const AddSubjectModal = ({ isOpen, onClose, programId, programName, onSuccess }) => {
    const { success: showSuccess, error: showError } = useToast();
    
    // Form State
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        description: '',
        units: 3,
        year_level: 1,
        semester_number: 1,
        classification: 'MINOR',
        is_global: false,
        program_id: programId || '', // Primary program
        program_ids: []
    });

    // UI State
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availablePrograms, setAvailablePrograms] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedPrereqs, setSelectedPrereqs] = useState([]);
    const [selectedPrograms, setSelectedPrograms] = useState([]);
    
    // New UI State for "Share with other programs" toggle
    const [shareWithOthers, setShareWithOthers] = useState(false);

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setFormData({
                code: '',
                title: '',
                description: '',
                units: 3,
                year_level: 1,
                semester_number: 1,
                classification: 'MINOR',
                is_global: false,
                program_id: programId || '',
                program_ids: []
            });
            setSelectedPrereqs([]);
            setSelectedPrograms([]); // Program IDs besides the current one
            setSearchQuery('');
            setShareWithOthers(false);
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const progs = await ProgramService.getPrograms();
            // Filter out the current program from the list of "other" programs
            setAvailablePrograms(programId ? progs.filter(p => p.id !== programId) : progs);
            
            // If in master mode and no program selected, auto-select first
            if (!programId && progs.length > 0) {
                setFormData(prev => ({ ...prev, program_id: progs[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch programs', err);
        }
    };

    // Search for prerequisites (context program only)
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!isOpen) return;
            setSearching(true);
            try {
                const resp = await ProgramService.getSubjects({
                    program: formData.program_id || programId,
                    search: searchQuery
                });
                setAvailableSubjects(resp.results || resp || []);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setSearching(false);
            }
        };

        const timeout = setTimeout(fetchSubjects, searchQuery ? 300 : 0);
        return () => clearTimeout(timeout);
    }, [searchQuery, programId, formData.program_id, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = {
                ...formData,
                program: formData.program_id || programId,
                program_ids: shareWithOthers && !formData.is_global ? selectedPrograms.map(p => p.id) : [],
                prerequisite_ids: selectedPrereqs.map(p => p.id),
                code: formData.code.toUpperCase().replace(/\s/g, ''),
                is_major: formData.classification === 'MAJOR'
            };
            
            await ProgramService.createSubject(dataToSubmit);
            showSuccess('Subject created successfully!');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.code?.[0] || 'Failed to create subject. Please check your data.';
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const togglePrereq = (subject) => {
        if (selectedPrereqs.find(p => p.id === subject.id)) {
            setSelectedPrereqs(selectedPrereqs.filter(p => p.id !== subject.id));
        } else {
            setSelectedPrereqs([...selectedPrereqs, subject]);
        }
    };

    const toggleProgramSelection = (program) => {
        if (selectedPrograms.find(p => p.id === program.id)) {
            setSelectedPrograms(selectedPrograms.filter(p => p.id !== program.id));
        } else {
            setSelectedPrograms([...selectedPrograms, program]);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[7000]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md" />
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
                            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-[32px] bg-white text-left align-middle shadow-2xl transition-all border border-gray-100">
                                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                    {/* Header */}
                                    <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <Plus size={24} />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-black text-gray-900 tracking-tight">
                                                    Create New Subject
                                                </Dialog.Title>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                    {programId ? `Program Catalog (${programName})` : 'Master Catalog'}
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* Left Column: Form Details (8 cols) */}
                                        <div className="lg:col-span-8 space-y-8">
                                            
                                            {/* Section 1: Basic Info */}
                                            <div className="space-y-4">
                                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500">
                                                    <Layout size={14} /> Subject Details
                                                </h4>
                                                
                                                <div className="grid grid-cols-12 gap-4">
                                                    <div className="col-span-4 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Subject Code</label>
                                                        <input 
                                                            required 
                                                            placeholder="MATH 101" 
                                                            value={formData.code} 
                                                            onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                        />
                                                    </div>
                                                    <div className="col-span-8 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Descriptive Title</label>
                                                        <input 
                                                            required 
                                                            placeholder="Differential Calculus" 
                                                            value={formData.title} 
                                                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Units</label>
                                                        <input 
                                                            type="number" 
                                                            min="1" max="6" 
                                                            value={formData.units} 
                                                            onChange={(e) => setFormData({...formData, units: parseInt(e.target.value)})} 
                                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Year Level</label>
                                                        <input 
                                                            type="number" 
                                                            min="1" max="5" 
                                                            value={formData.year_level} 
                                                            onChange={(e) => setFormData({...formData, year_level: parseInt(e.target.value)})} 
                                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Semester</label>
                                                        <select 
                                                            value={formData.semester_number} 
                                                            onChange={(e) => setFormData({...formData, semester_number: parseInt(e.target.value)})} 
                                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value={1}>1st Sem</option>
                                                            <option value={2}>2nd Sem</option>
                                                            <option value={3}>Summer</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2 block">Classification</label>
                                                    <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData({...formData, classification: 'MINOR'})}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.classification === 'MINOR' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            Minor 
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData({...formData, classification: 'MAJOR'})}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.classification === 'MAJOR' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            Major Subject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <hr className="border-gray-100" />
                                            
                                            {/* Section 2: Program Assignment */}
                                            <div className="space-y-4">
                                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500">
                                                    <Share2 size={14} /> Program Assignment
                                                </h4>
                                                
                                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                                    {/* Primary Program */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm border border-gray-100">
                                                                {programId ? programName?.substring(0,2).toUpperCase() : (formData.program_id && availablePrograms.find(p => p.id == formData.program_id)?.code.substring(0,2)) || 'PC'}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Program</p>
                                                                {programId ? (
                                                                    <p className="text-sm font-bold text-gray-900">{programName}</p>
                                                                ) : (
                                                                     <select 
                                                                         required
                                                                         value={formData.program_id}
                                                                         onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                                                                         className="bg-transparent text-sm font-bold text-gray-900 outline-none cursor-pointer border-b border-gray-300 pb-1 pr-2"
                                                                     >
                                                                         <option value="" disabled>Select Primary Program</option>
                                                                         {availablePrograms.map(p => (
                                                                             <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                                                         ))}
                                                                     </select>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <CheckCircle2 size={20} className="text-indigo-600" />
                                                    </div>

                                                    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                                        {/* Global Toggle */}
                                                        <div className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.is_global ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                    <Globe size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-900">Global Subject</p>
                                                                    <p className="text-[10px] text-gray-400">Available to all programs automatically</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, is_global: !prev.is_global }));
                                                                    if (!formData.is_global) setShareWithOthers(false);
                                                                }}
                                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_global ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${formData.is_global ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        {/* Share Toggle */}
                                                        <div className={`p-4 flex items-center justify-between transition-opacity ${formData.is_global ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${shareWithOthers ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                    <Share2 size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-900">Cluster / Shared Subject</p>
                                                                    <p className="text-[10px] text-gray-400">Also offer this subject to other specific programs</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setShareWithOthers(!shareWithOthers)}
                                                                className={`w-12 h-6 rounded-full transition-colors relative ${shareWithOthers ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${shareWithOthers ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Other Programs Selector */}
                                                    {shareWithOthers && !formData.is_global && (
                                                        <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2 block">Select Other Programs</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {availablePrograms.map(prog => (
                                                                    <button
                                                                        key={prog.id}
                                                                        type="button"
                                                                        onClick={() => toggleProgramSelection(prog)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                            selectedPrograms.find(p => p.id === prog.id)
                                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                                                                        }`}
                                                                    >
                                                                        {prog.code}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Prerequisites (4 cols) */}
                                        <div className="lg:col-span-4 h-full">
                                            <div className="bg-gray-50 rounded-[24px] border border-gray-100 p-6 h-full flex flex-col">
                                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">
                                                    <BookOpen size={14} /> Prerequisites
                                                </h4>
                                                
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                                    <input 
                                                        placeholder="Search subjects..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-200 transition-all"
                                                    />
                                                </div>

                                                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 max-h-[400px]">
                                                    {selectedPrereqs.length > 0 && (
                                                        <div className="mb-4 space-y-2">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Selected</p>
                                                            {selectedPrereqs.map(p => (
                                                                <div key={p.id} className="flex items-center justify-between p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                                                                    <span className="text-xs font-bold pl-1">{p.code}</span>
                                                                    <button type="button" onClick={() => togglePrereq(p)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Available</p>
                                                    {availableSubjects.filter(s => !selectedPrereqs.find(p => p.id === s.id)).map(subject => (
                                                        <button
                                                            key={subject.id}
                                                            type="button"
                                                            onClick={() => togglePrereq(subject)}
                                                            className="w-full p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-100 transition-all text-left group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-700">{subject.code}</span>
                                                                <Plus size={12} className="text-gray-300 group-hover:text-indigo-500" />
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 truncate mt-1">{subject.title}</p>
                                                        </button>
                                                    ))}
                                                    {availableSubjects.length === 0 && (
                                                        <div className="text-center py-8 text-gray-400">
                                                            <p className="text-[10px]">No subjects found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-10 py-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 mt-auto rounded-b-[32px]">
                                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={loading} className="px-8 shadow-lg shadow-indigo-200">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Subject'}
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

export default AddSubjectModal;
