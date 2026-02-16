import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
    X, 
    BookOpen, 
    Layers, 
    Search, 
    Save, 
    AlertTriangle, 
    Check, 
    Globe, 
    ShieldAlert,
    Loader2,
    CheckCircle2,
    Plus
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';

const EditSubjectModal = ({ isOpen, onClose, subject, programId, programName, onSuccess }) => {
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
        program_id: programId || ''
    });

    // UI State
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availablePrograms, setAvailablePrograms] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedPrereqs, setSelectedPrereqs] = useState([]);
    const [selectedPrograms, setSelectedPrograms] = useState([]);

    // Populate form on open or subject change
    useEffect(() => {
        const initForm = async () => {
            if (isOpen && subject) {
                setFormData({
                    code: subject.code || '',
                    title: subject.title || '',
                    description: subject.description || '',
                    units: subject.units || 3,
                    year_level: subject.year_level || 1,
                    semester_number: subject.semester_number || 1,
                    classification: subject.classification || 'MINOR',
                    is_global: subject.is_global || false,
                    program_id: subject.program_id || programId || ''
                });
                
                // Set prerequisites
                setSelectedPrereqs(subject.prerequisites || []);
                
                // Set additional programs (excluding the context program)
                const allProgs = await ProgramService.getPrograms();
                const currentProgId = subject.program_id || programId;
                const otherProgs = allProgs.filter(p => p.id !== currentProgId);
                setAvailablePrograms(otherProgs);
                
                if (subject.program_ids) {
                    const mappedSelected = allProgs.filter(p => 
                        subject.program_ids.includes(p.id) && p.id !== currentProgId
                    );
                    setSelectedPrograms(mappedSelected);
                }
            }
        };
        
        initForm();
    }, [isOpen, subject, programId]);

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
                // Filters out current subject from potential prerequisites
                const filtered = (resp.results || resp || []).filter(s => s.id !== subject?.id);
                setAvailableSubjects(filtered);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setSearching(false);
            }
        };

        const timeout = setTimeout(fetchSubjects, searchQuery ? 300 : 0);
        return () => clearTimeout(timeout);
    }, [searchQuery, programId, formData.program_id, isOpen, subject?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = {
                ...formData,
                program: formData.program_id || programId,
                program_ids: selectedPrograms.map(p => p.id),
                prerequisite_ids: selectedPrereqs.map(p => p.id),
                code: formData.code.toUpperCase().replace(/\s/g, ''),
                is_major: formData.classification === 'MAJOR'
            };
            
            await ProgramService.updateSubject(subject.id, dataToSubmit);
            showSuccess('Subject updated successfully!');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.code?.[0] || 'Failed to update subject.';
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const togglePrereq = (subjectItem) => {
        if (selectedPrereqs.find(p => p.id === subjectItem.id)) {
            setSelectedPrereqs(selectedPrereqs.filter(p => p.id !== subjectItem.id));
        } else {
            setSelectedPrereqs([...selectedPrereqs, subjectItem]);
        }
    };

    const toggleProgramSelection = (programItem) => {
        if (selectedPrograms.find(p => p.id === programItem.id)) {
            setSelectedPrograms(selectedPrograms.filter(p => p.id !== programItem.id));
        } else {
            setSelectedPrograms([...selectedPrograms, programItem]);
        }
    };

    if (!subject) return null;

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
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-[40px] bg-white p-10 text-left align-middle shadow-2xl transition-all border border-gray-100">
                                <form onSubmit={handleSubmit}>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-200">
                                                <Layers size={32} />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-2xl font-black text-gray-900 tracking-tight">
                                                    Edit Subject: {subject.code}
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                    Managing for: <span className="text-indigo-600">{programId ? programName : 'Master Catalog'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={onClose} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                        {/* Column 1: Basic Information */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Subject Details</h4>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Code</label>
                                                        <input required placeholder="MATH 101" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
                                                        <input required placeholder="Differential Calculus" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none" />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Units (1-6)</label>
                                                            <input type="number" min="1" max="6" value={formData.units} onChange={(e) => setFormData({...formData, units: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Recommended Year</label>
                                                                <input type="number" min="1" max="5" value={formData.year_level} onChange={(e) => setFormData({...formData, year_level: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Recommended Sem</label>
                                                                <select 
                                                                    value={formData.semester_number} 
                                                                    onChange={(e) => setFormData({...formData, semester_number: parseInt(e.target.value)})} 
                                                                    className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                                                                >
                                                                    <option value={1}>1st Semester</option>
                                                                    <option value={2}>2nd Semester</option>
                                                                    <option value={3}>Summer</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Classification Section */}
                                            <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Subject Classification</h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({...formData, classification: 'MAJOR'})}
                                                        className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                                            formData.classification === 'MAJOR'
                                                                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100'
                                                                : 'bg-white border-transparent text-gray-400 hover:bg-white/80'
                                                        }`}
                                                    >
                                                        <ShieldAlert size={18} className="mb-2" />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">Major</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({...formData, classification: 'MINOR'})}
                                                        className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                                            formData.classification === 'MINOR'
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                                : 'bg-white border-transparent text-gray-400 hover:bg-white/80'
                                                        }`}
                                                    >
                                                        <BookOpen size={18} className="mb-2" />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">Minor</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Program Assignment */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="h-full bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 flex flex-col">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Program Assignment</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({...formData, is_global: !formData.is_global})}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                                            formData.is_global
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                                : 'bg-white border-gray-200 text-gray-400'
                                                        }`}
                                                    >
                                                        <Globe size={12} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">{formData.is_global ? 'Global Active' : 'Set as Global'}</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                                    {/* Context Program (Locked) */}
                                                    {programId ? (
                                                        <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black text-[10px]">
                                                                    {programName?.substring(0,2).toUpperCase()}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-900">{programName}</span>
                                                            </div>
                                                            <CheckCircle2 size={16} className="text-indigo-600" />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Primary Program</label>
                                                            <select 
                                                                required
                                                                value={formData.program_id}
                                                                onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                                                                className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                                                            >
                                                                <option value="" disabled>Select Primary Program</option>
                                                                {availablePrograms.concat({ id: subject.program_id, code: subject.program_code, name: subject.program_name }).map(p => (
                                                                    p && <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {!formData.is_global && (
                                                        <>
                                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest pt-2 pl-1">Other Available Programs</p>
                                                            {availablePrograms.map(prog => (
                                                                <button
                                                                    key={prog.id}
                                                                    type="button"
                                                                    onClick={() => toggleProgramSelection(prog)}
                                                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                                                        selectedPrograms.find(p => p.id === prog.id)
                                                                            ? 'bg-indigo-50 border-indigo-200'
                                                                            : 'bg-white border-transparent hover:border-gray-100'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 text-left">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${
                                                                            selectedPrograms.find(p => p.id === prog.id)
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
                                                                        }`}>
                                                                            {prog.code.substring(0,2)}
                                                                        </div>
                                                                        <span className={`text-xs font-bold ${selectedPrograms.find(p => p.id === prog.id) ? 'text-indigo-900' : 'text-gray-500'}`}>{prog.name}</span>
                                                                    </div>
                                                                    {selectedPrograms.find(p => p.id === prog.id) && <Check size={14} className="text-indigo-600" />}
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {formData.is_global && (
                                                        <div className="py-20 text-center opacity-40 px-6">
                                                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4">
                                                                <Globe size={32} />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest leading-loose">
                                                                GLOBAL SUBJECTS ARE VISIBLE TO ALL PROGRAMS AUTOMATICALLY.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 3: Prerequisites */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="h-full bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 flex flex-col">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Prerequisites</h4>
                                                
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input 
                                                        placeholder="Search subjects..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-200"
                                                    />
                                                </div>

                                                <div className="flex-grow overflow-y-auto max-h-[350px] space-y-2 pr-2 custom-scrollbar">
                                                    {/* Selected Prereqs Pills */}
                                                    {selectedPrereqs.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                                            {selectedPrereqs.map(p => (
                                                                <button key={p.id} type="button" onClick={() => togglePrereq(p)} className="flex items-center gap-2 px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                                                    {p.code} <X size={10} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {availableSubjects.filter(s => !selectedPrereqs.find(p => p.id === s.id)).map(subjectItem => (
                                                        <button
                                                            key={subjectItem.id}
                                                            type="button"
                                                            onClick={() => togglePrereq(subjectItem)}
                                                            className="w-full p-4 bg-white rounded-2xl border border-transparent hover:border-indigo-100 transition-all text-left flex items-center justify-between group"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{subjectItem.code}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[120px]">{subjectItem.title}</p>
                                                            </div>
                                                            <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                <Plus size={12} />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end items-center gap-4 pt-8 border-t border-gray-50 mt-8">
                                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="px-8">
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={loading} className="px-12 py-4 bg-indigo-600 shadow-xl shadow-indigo-100">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><Save size={18} /> Update Subject</span>}
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

export default EditSubjectModal;
