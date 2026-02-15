import React, { useState, useEffect } from 'react';
import { 
    X, 
    User, 
    Mail, 
    Calendar, 
    Phone, 
    MapPin, 
    Book, 
    School, 
    Plus, 
    Search,
    Trash2,
    CheckCircle,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { api, endpoints } from '../../api';

const AddStudentModal = ({ isOpen, onClose, programs, onSuccess }) => {
    const { success, error, warning } = useToast();
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        birthdate: '',
        contact_number: '',
        address: '',
        program: '',
        curriculum: '',
        year_level: '1',
        status: 'ACTIVE',
        is_transferee: false,
        previous_school: ''
    });

    const [creditedSubjects, setCreditedSubjects] = useState([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [grade, setGrade] = useState('');
    const [allSubjects, setAllSubjects] = useState([]);
    const [curricula, setCurricula] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchAllSubjects();
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.program) {
            fetchCurricula(formData.program);
        }
    }, [formData.program]);

    const fetchAllSubjects = async () => {
        try {
            const res = await fetch('/api/v1/academic/subjects/');
            if (res.ok) {
                const data = await res.json();
                setAllSubjects(data.results || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch subjects');
        }
    };

    const fetchCurricula = async (programId) => {
        try {
            const res = await fetch(`/api/v1/academic/curricula/?program=${programId}`);
            if (res.ok) {
                const data = await res.json();
                const list = data.results || data || [];
                setCurricula(list);
                if (list.length > 0) {
                    setFormData(prev => ({ ...prev, curriculum: list[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch curricula');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubjectSearch = (term) => {
        setSubjectSearch(term);
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }
        const matches = allSubjects.filter(s => 
            s.code.toLowerCase().includes(term.toLowerCase()) || 
            s.title.toLowerCase().includes(term.toLowerCase())
        ).slice(0, 5);
        setSearchResults(matches);
    };

    const addCreditSubject = () => {
        if (!selectedSubject) {
            warning('Select a subject first');
            return;
        }
        if (!grade) {
            warning('Grade is required');
            return;
        }

        if (creditedSubjects.some(s => s.subject_id === selectedSubject.id)) {
            error('Subject already added');
            return;
        }

        setCreditedSubjects(prev => [...prev, {
            subject_id: selectedSubject.id,
            code: selectedSubject.code,
            title: selectedSubject.title,
            grade: grade
        }]);

        setSubjectSearch('');
        setSelectedSubject(null);
        setGrade('');
        setSearchResults([]);
    };

    const removeCreditSubject = (id) => {
        setCreditedSubjects(prev => prev.filter(s => s.subject_id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                credited_subjects: creditedSubjects.map(s => ({
                    subject_id: s.subject_id,
                    grade: s.grade === 'CREDITED' ? null : s.grade
                }))
            };

            const res = await fetch('/api/v1/registrar/students/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                success(`Student registered: ${data.student_number}`);
                onSuccess();
                onClose();
                resetForm();
            } else {
                const errData = await res.json();
                error(errData.detail || 'Registration failed');
            }
        } catch (err) {
            error('An error occurred during registration');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            birthdate: '',
            contact_number: '',
            address: '',
            program: '',
            curriculum: '',
            year_level: '1',
            status: 'ACTIVE',
            is_transferee: false,
            previous_school: ''
        });
        setCreditedSubjects([]);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Register New Student" 
            size="xl"
            actions={[
                { label: 'Cancel', onClick: onClose },
                { label: 'Create Record', variant: 'primary', onClick: handleSubmit, disabled: submitting }
            ]}
        >
            <form className="space-y-8 py-2">
                {/* Section 1: Identity */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" /> Basic Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                        <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                        <Input label="Birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleInputChange} required />
                    </div>
                </div>

                {/* Section 2: Academic */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Book className="w-3 h-3" /> Academic Placement
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Degree Program" name="program" value={formData.program} onChange={handleInputChange} required>
                            <option value="">Select Program</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </Select>
                        <Select label="Curriculum" name="curriculum" value={formData.curriculum} onChange={handleInputChange} required disabled={!formData.program}>
                            {curricula.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            {curricula.length === 0 && <option value="">Select Program First</option>}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Year Level" name="year_level" value={formData.year_level} onChange={handleInputChange}>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </Select>
                        <Select label="Status" name="status" value={formData.status} onChange={handleInputChange}>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="GRADUATED">Graduated</option>
                        </Select>
                    </div>
                </div>

                {/* Section 3: Transferee & Credits */}
                <div className="space-y-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <School className="w-3 h-3" /> Transferee & Credits
                        </h4>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                name="is_transferee" 
                                checked={formData.is_transferee} 
                                onChange={handleInputChange}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Has Previous School</span>
                        </label>
                    </div>

                    {formData.is_transferee && (
                        <div className="animate-in slide-in-from-top-2">
                            <Input label="Previous Institution" name="previous_school" value={formData.previous_school} onChange={handleInputChange} placeholder="Name of previous college/university" />
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Add Credited Subjects</p>
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-8 relative">
                                <input 
                                    type="text" 
                                    value={subjectSearch}
                                    onChange={(e) => handleSubjectSearch(e.target.value)}
                                    placeholder="Search subject code or name..."
                                    className="w-full px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:border-blue-300 outline-none transition-all"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-2xl mt-1 z-50 overflow-hidden">
                                        {searchResults.map(s => (
                                            <button 
                                                key={s.id} 
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSubject(s);
                                                    setSubjectSearch(`${s.code} - ${s.title}`);
                                                    setSearchResults([]);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <p className="text-xs font-black text-blue-600">{s.code}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{s.title}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-2">
                                <input 
                                    type="text" 
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value.toUpperCase())}
                                    placeholder="Grade"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-center outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <button 
                                    type="button" 
                                    onClick={addCreditSubject}
                                    className="w-full h-full bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all font-black text-xs"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {creditedSubjects.length > 0 && (
                            <div className="space-y-2 mt-4">
                                {creditedSubjects.map(s => (
                                    <div key={s.subject_id} className="bg-white px-4 py-2 rounded-xl flex items-center justify-between border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-2">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">{s.code}</span>
                                            <span className="text-xs font-bold text-gray-700">Grade: <span className="text-blue-600 font-black">{s.grade}</span></span>
                                        </div>
                                        <button type="button" onClick={() => removeCreditSubject(s.subject_id)} className="p-1 text-gray-300 hover:text-red-600 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const Input = ({ label, ...props }) => (
    <div className="space-y-1.5 flex-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        <input {...props} className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-blue-100 outline-none transition-all placeholder:text-gray-300" />
    </div>
);

const Select = ({ label, children, ...props }) => (
    <div className="space-y-1.5 flex-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        <select {...props} className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-blue-100 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50">
            {children}
        </select>
    </div>
);

export default AddStudentModal;
