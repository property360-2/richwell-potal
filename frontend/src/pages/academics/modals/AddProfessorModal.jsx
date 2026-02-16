import React, { useState, useEffect } from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Search, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { FacultyService } from '../services/FacultyService';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

const AddProfessorModal = ({ isOpen, onClose, onSuccess }) => {
    const { success, error: toastError } = useToast();
    
    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        program_ids: [],
        department: '',
        specialization: '',
        max_teaching_hours: 30,
        assigned_subject_ids: []
    });

    const [allPrograms, setAllPrograms] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]); 
    const [loadingPrograms, setLoadingPrograms] = useState(false);
    
    // Validation State
    const [errors, setErrors] = useState({});
    const [isChecking, setIsChecking] = useState(false);
    const [isValid, setIsValid] = useState({ email: null, name: null }); // null, true, false

    // Subject Search State
    const [subjectQuery, setSubjectQuery] = useState('');
    const [foundSubjects, setFoundSubjects] = useState([]);
    const [searchingSubjects, setSearchingSubjects] = useState(false);

    // Initial Reset and Load Programs
    useEffect(() => {
        if (isOpen) {
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                program_ids: [],
                department: '',
                specialization: '',
                max_teaching_hours: 30,
                assigned_subject_ids: []
            });
            setSelectedSubjects([]);
            setErrors({});
            setIsValid({ email: null, name: null });
            setSubjectQuery('');
            setFoundSubjects([]);
            
            // Load programs
            const loadPrograms = async () => {
                setLoadingPrograms(true);
                const data = await FacultyService.getPrograms();
                setAllPrograms(data);
                setLoadingPrograms(false);
            };
            loadPrograms();
        }
    }, [isOpen]);

    // Inline Validation Logic
    useEffect(() => {
        const checkEmail = async () => {
            if (!formData.email || !formData.email.includes('@')) {
                setIsValid(prev => ({ ...prev, email: null }));
                return;
            }
            
            setIsChecking(true);
            const res = await FacultyService.checkDuplicate({ email: formData.email });
            setIsChecking(false);
            
            if (res.duplicate) {
                setErrors(prev => ({ ...prev, email: 'Email already exists' }));
                setIsValid(prev => ({ ...prev, email: false }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                });
                setIsValid(prev => ({ ...prev, email: true }));
            }
        };

        const timeout = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeout);
    }, [formData.email]);

    useEffect(() => {
        const checkName = async () => {
            if (!formData.first_name || !formData.last_name) {
                setIsValid(prev => ({ ...prev, name: null }));
                return;
            }
            
            setIsChecking(true);
            const res = await FacultyService.checkDuplicate({ 
                first_name: formData.first_name, 
                last_name: formData.last_name 
            });
            setIsChecking(false);
            
            if (res.duplicate) {
                setErrors(prev => ({ ...prev, name: 'Professor with this name already exists' }));
                setIsValid(prev => ({ ...prev, name: false }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                });
                setIsValid(prev => ({ ...prev, name: true }));
            }
        };

        const timeout = setTimeout(checkName, 500);
        return () => clearTimeout(timeout);
    }, [formData.first_name, formData.last_name]);

    // Subject Search Logic (Program Aware)
    useEffect(() => {
        const search = async () => {
            if (!subjectQuery || subjectQuery.length < 2) {
                setFoundSubjects([]);
                return;
            }
            
            setSearchingSubjects(true);
            const results = await FacultyService.searchSubjects(subjectQuery, formData.program_ids);
            setSearchingSubjects(false);
            setFoundSubjects(results);
        };

        const timeout = setTimeout(search, 300);
        return () => clearTimeout(timeout);
    }, [subjectQuery, formData.program_ids]);

    const handleAddSubject = (subject) => {
        if (selectedSubjects.some(s => s.id === subject.id)) return;
        
        const newSubjects = [...selectedSubjects, subject];
        setSelectedSubjects(newSubjects);
        setFormData(prev => ({
            ...prev,
            assigned_subject_ids: newSubjects.map(s => s.id)
        }));
        setSubjectQuery(''); // Clear search
        setFoundSubjects([]); // Clear results
    };

    const handleRemoveSubject = (subjectId) => {
        const newSubjects = selectedSubjects.filter(s => s.id !== subjectId);
        setSelectedSubjects(newSubjects);
        setFormData(prev => ({
            ...prev,
            assigned_subject_ids: newSubjects.map(s => s.id)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (Object.keys(errors).length > 0) {
            toastError('Please fix validation errors');
            return;
        }

        try {
            await FacultyService.createProfessor({
                ...formData,
                profile: {
                    program_ids: formData.program_ids,
                    department: formData.department,
                    specialization: formData.specialization,
                    max_teaching_hours: formData.max_teaching_hours,
                    assigned_subject_ids: formData.assigned_subject_ids
                }
            });
            success('Professor created successfully');
            onSuccess();
        } catch (err) {
            console.error(err);
            toastError(err.message || 'Failed to create professor');
        }
    };

    const toggleProgram = (id) => {
        setFormData(prev => {
            const current = prev.program_ids || [];
            const updated = current.includes(id) 
                ? current.filter(pid => pid !== id)
                : [...current, id];
            return { ...prev, program_ids: updated };
        });
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[32px] bg-white p-8 text-left align-middle shadow-xl transition-all border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <Dialog.Title as="h3" className="text-2xl font-black text-gray-900 leading-tight">
                                            Add Professor
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-500 font-medium">Create a new faculty profile</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Personal Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">First Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={formData.first_name}
                                                onChange={e => setFormData({...formData, first_name: e.target.value})}
                                                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none ${errors.name ? 'border-red-200 focus:border-red-500' : 'border-transparent focus:border-indigo-100'}`}
                                                placeholder="e.g. Juan"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Last Name</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.last_name}
                                                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                                                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none ${errors.name ? 'border-red-200 focus:border-red-500' : 'border-transparent focus:border-indigo-100'}`}
                                                    placeholder="e.g. Dela Cruz"
                                                />
                                                {isValid.name === false && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 w-4 h-4" />}
                                                {isValid.name === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />}
                                            </div>
                                            {errors.name && <p className="text-xs text-red-500 ml-1">{errors.name}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Email Address</label>
                                        <div className="relative">
                                            <input 
                                                type="email" 
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none ${errors.email ? 'border-red-200 focus:border-red-500' : 'border-transparent focus:border-indigo-100'}`}
                                                placeholder="juan.delacruz@richwell.edu.ph"
                                            />
                                            {isValid.email === false && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 w-4 h-4" />}
                                            {isValid.email === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />}
                                        </div>
                                        {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
                                    </div>

                                    {/* Professional Info */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.department}
                                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="e.g. College of Computer Studies"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Specialization / Expertise</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.specialization}
                                                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="e.g. Data Science, Accounting"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Program Assignment</label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-2 border-transparent rounded-xl min-h-[50px]">
                                                {loadingPrograms ? (
                                                    <div className="text-xs text-gray-400">Loading programs...</div>
                                                ) : allPrograms.map(prog => (
                                                    <button
                                                        key={prog.id}
                                                        type="button"
                                                        onClick={() => toggleProgram(prog.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                            formData.program_ids.includes(prog.id)
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                                                        }`}
                                                    >
                                                        {prog.code}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 italic italic">Selection determines subject search priority.</p>
                                        </div>
                                    </div>

                                    {/* Subject Assignment */}
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1 flex justify-between items-center">
                                            Assigned Subjects 
                                            <span className="text-gray-300 font-normal normal-case tracking-normal">Optional</span>
                                        </label>
                                        
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input 
                                                type="text" 
                                                value={subjectQuery}
                                                onChange={e => setSubjectQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                placeholder="Search subjects to assign (e.g. 'CC101' or 'Progamming')"
                                            />
                                            
                                            {/* Search Results Dropdown */}
                                            {subjectQuery.length >= 2 && (
                                                <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 max-h-48 overflow-y-auto">
                                                    {searchingSubjects ? (
                                                        <div className="p-3 text-center text-xs text-gray-400">Searching...</div>
                                                    ) : foundSubjects.length > 0 ? (
                                                        foundSubjects.map(sub => (
                                                            <button 
                                                                key={sub.id}
                                                                type="button"
                                                                onClick={() => handleAddSubject(sub)}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center group/item transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-800">{sub.code}</p>
                                                                    <p className="text-xs text-gray-500">{sub.title}</p>
                                                                </div>
                                                                <Plus size={16} className="text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-center text-xs text-gray-400">No subjects found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected Subjects List */}
                                        {selectedSubjects.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {selectedSubjects.map(sub => (
                                                    <div key={sub.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold">{sub.code}</span>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleRemoveSubject(sub.id)}
                                                            className="p-1 hover:bg-indigo-200 rounded-md transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-50">
                                        <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                                        <Button 
                                            variant="primary" 
                                            type="submit" 
                                            disabled={isChecking || Object.keys(errors).length > 0}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {isChecking ? 'Checking...' : 'Create Professor'}
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

export default AddProfessorModal;
