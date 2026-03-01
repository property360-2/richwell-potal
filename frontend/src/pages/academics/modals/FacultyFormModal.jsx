import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Search, Plus, Trash2, AlertCircle, CheckCircle, User, Briefcase, GraduationCap, Edit, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { FacultyService } from '../services/FacultyService';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

const FacultyFormModal = ({ isOpen, onClose, onSuccess, professor = null }) => {
    const { success, error: toastError } = useToast();
    const isEdit = !!professor;
    
    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        department: '',
        specialization: '',
        max_teaching_hours: 30,
        program_ids: [],
        assigned_subject_ids: []
    });

    const [allPrograms, setAllPrograms] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]); 
    const [loadingPrograms, setLoadingPrograms] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Validation State
    const [errors, setErrors] = useState({});
    const [isChecking, setIsChecking] = useState(false);
    const [isValid, setIsValid] = useState({ email: null, name: null });

    // Subject Search State
    const [subjectQuery, setSubjectQuery] = useState('');
    const [foundSubjects, setFoundSubjects] = useState([]);
    const [searchingSubjects, setSearchingSubjects] = useState(false);

    // Initial Load & Populate
    useEffect(() => {
        if (isOpen) {
            loadPrograms();
            if (professor) {
                // Populate for Edit
                setFormData({
                    first_name: professor.first_name || '',
                    last_name: professor.last_name || '',
                    email: professor.email || '',
                    password: '', // Optional for edit
                    department: professor.profile?.department || '',
                    specialization: professor.profile?.specialization || '',
                    max_teaching_hours: professor.profile?.max_teaching_hours || 30,
                    program_ids: professor.profile?.program_ids || [],
                    assigned_subject_ids: (professor.profile?.assigned_subjects || []).map(s => s.id)
                });
                setSelectedSubjects(professor.profile?.assigned_subjects || []);
                setIsValid({ email: true, name: true });
            } else {
                // Reset for Add
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    department: '',
                    specialization: '',
                    max_teaching_hours: 30,
                    program_ids: [],
                    assigned_subject_ids: []
                });
                setSelectedSubjects([]);
                setIsValid({ email: null, name: null });
            }
            setErrors({});
            setSubjectQuery('');
            setFoundSubjects([]);
        }
    }, [isOpen, professor]);

    const loadPrograms = async () => {
        setLoadingPrograms(true);
        try {
            const data = await FacultyService.getPrograms();
            setAllPrograms(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPrograms(false);
        }
    };

    // Inline Validation (Only for new professors or changed fields)
    useEffect(() => {
        if (!isOpen || isEdit) return;

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
    }, [formData.email, isOpen, isEdit]);

    // Subject Search (Program Aware)
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
        setFormData(prev => ({ ...prev, assigned_subject_ids: newSubjects.map(s => s.id) }));
        setSubjectQuery('');
        setFoundSubjects([]);
    };

    const handleRemoveSubject = (subjectId) => {
        const newSubjects = selectedSubjects.filter(s => s.id !== subjectId);
        setSelectedSubjects(newSubjects);
        setFormData(prev => ({ ...prev, assigned_subject_ids: newSubjects.map(s => s.id) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length > 0) {
            toastError('Please fix validation errors');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                profile: {
                    program_ids: formData.program_ids,
                    department: formData.department,
                    specialization: formData.specialization,
                    max_teaching_hours: formData.max_teaching_hours,
                    assigned_subject_ids: formData.assigned_subject_ids
                }
            };

            if (isEdit) {
                await FacultyService.updateProfessor(professor.id, payload);
                success('Professor updated successfully');
            } else {
                await FacultyService.createProfessor(payload);
                success('Professor created successfully');
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            toastError(err.message || `Failed to ${isEdit ? 'update' : 'create'} professor`);
        } finally {
            setSaving(false);
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[40px] bg-white p-10 text-left align-middle shadow-2xl transition-all border border-gray-100">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100">
                                            {isEdit ? <Edit size={32} /> : <User size={32} />}
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-3xl font-black text-gray-900 leading-tight tracking-tight uppercase italic">
                                                {isEdit ? 'Edit Faculty' : 'Add Faculty'}
                                            </Dialog.Title>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                                                {isEdit ? `Modifying: ${professor.first_name} ${professor.last_name}` : 'Institutional Registry of Personnel'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onClose} 
                                        className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Personal Info Group */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User size={16} className="text-indigo-600" />
                                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Personal Identification</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">First Name</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.first_name}
                                                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="Juan"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Last Name</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.last_name}
                                                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="Dela Cruz"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Email Address</label>
                                            <div className="relative">
                                                <input 
                                                    type="email" 
                                                    required
                                                    autoComplete="email"
                                                    value={formData.email}
                                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                                    className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none ${errors.email ? 'border-red-200 focus:border-red-500' : 'border-transparent focus:border-indigo-100'}`}
                                                    placeholder="juan.delacruz@richwell.edu.ph"
                                                />
                                                {isValid.email === false && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 w-5 h-5" />}
                                                {isValid.email === true && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />}
                                            </div>
                                            {errors.email && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase">{errors.email}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                                                    Account Password {isEdit && <span className="text-gray-300 normal-case">(Optional - leave blank to keep current)</span>}
                                                </label>
                                            </div>
                                            <div className="relative group">
                                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={formData.password}
                                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                                    required={!isEdit}
                                                    className="w-full pl-14 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder={isEdit ? "••••••••" : "Create a secure password"}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-gray-50" />

                                    {/* Professional Info Group */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase size={16} className="text-indigo-600" />
                                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Academic assignment</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.department}
                                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="College of Computer Studies"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Expertise / Specialization</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.specialization}
                                                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none"
                                                    placeholder="Software Engineering"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Program Eligibility</label>
                                            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border-2 border-transparent rounded-[24px] min-h-[60px]">
                                                {loadingPrograms ? (
                                                    <Loader2 className="animate-spin text-gray-300" size={20} />
                                                ) : allPrograms.map(prog => (
                                                    <button
                                                        key={prog.id}
                                                        type="button"
                                                        onClick={() => toggleProgram(prog.id)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                            formData.program_ids.includes(prog.id)
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100 hover:text-indigo-600'
                                                        }`}
                                                    >
                                                        {prog.code}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-gray-50" />

                                    {/* Subject Mapping Group */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <GraduationCap size={16} className="text-indigo-600" />
                                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Qualified Subjects</span>
                                        </div>

                                        <div className="relative group">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="text" 
                                                value={subjectQuery}
                                                onChange={e => setSubjectQuery(e.target.value)}
                                                className="w-full pl-14 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none shadow-sm"
                                                placeholder="Search and assign subjects (e.g. CC101)"
                                            />
                                            
                                            {/* Results Pane */}
                                            {subjectQuery.length >= 2 && (
                                                <div className="absolute top-full mt-3 left-0 w-full bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden z-[70] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                    {searchingSubjects ? (
                                                        <div className="p-6 text-center text-xs font-black text-gray-300 uppercase tracking-widest">Searching records...</div>
                                                    ) : foundSubjects.length > 0 ? (
                                                        foundSubjects.map(sub => (
                                                            <button 
                                                                key={sub.id}
                                                                type="button"
                                                                onClick={() => handleAddSubject(sub)}
                                                                className="w-full text-left px-6 py-4 hover:bg-gray-50 flex justify-between items-center group/item transition-all border-b border-gray-50 last:border-0"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900 uppercase">{sub.code}</p>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{sub.title}</p>
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all">
                                                                    <Plus size={16} />
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-6 text-center text-xs font-black text-gray-300 uppercase tracking-widest">No subjects found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tag Cloud */}
                                        {selectedSubjects.length > 0 && (
                                            <div className="flex flex-wrap gap-3 p-4 bg-gray-50/50 rounded-[28px] border-2 border-dashed border-gray-100">
                                                {selectedSubjects.map(sub => (
                                                    <div key={sub.id} className="flex items-center gap-3 px-4 py-2 bg-white text-indigo-700 rounded-xl border border-indigo-50 shadow-sm animate-in zoom-in duration-200">
                                                        <span className="text-[11px] font-black uppercase tracking-tight">{sub.code}</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleRemoveSubject(sub.id)}
                                                            className="p-1 hover:bg-red-50 hover:text-red-500 rounded-md transition-all"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-12 flex justify-end gap-4 pt-10 border-t border-gray-50">
                                        <button 
                                            onClick={onClose} 
                                            type="button"
                                            className="px-8 py-4 text-xs font-black text-gray-400 hover:text-gray-900 transition-all uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                        <Button 
                                            variant="primary" 
                                            type="submit" 
                                            loading={saving}
                                            disabled={isChecking || Object.keys(errors).length > 0}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 rounded-2xl px-12 py-4 h-auto"
                                        >
                                            <span className="font-black uppercase tracking-[0.2em] text-[11px]">
                                                {isEdit ? 'Save Changes' : 'Enroll Professor'}
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

export default FacultyFormModal;
