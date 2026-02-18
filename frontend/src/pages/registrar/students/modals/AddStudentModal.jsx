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
import { useToast } from '../../../../context/ToastContext';
import { Button, Modal, Input, Select, FormField } from '../../../../components/ui';
import { api, endpoints } from '../../../../api';

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

    // Curriculum subjects state
    const [fetchingSubjects, setFetchingSubjects] = useState(false);

    useEffect(() => {
        if (formData.program) {
            fetchCurricula(formData.program);
        }
    }, [formData.program]);

    useEffect(() => {
        if (formData.curriculum) {
            fetchCurriculumSubjects(formData.curriculum);
        } else {
            setAllSubjects([]);
        }
    }, [formData.curriculum]);

    const fetchCurriculumSubjects = async (curriculumId) => {
        try {
            setFetchingSubjects(true);
            const data = await api.get(endpoints.curriculumStructure(curriculumId));
            
            // Flatten subjects from the structure object
            const structure = data.structure || {};
            const subjectsList = [];
            
            Object.values(structure).forEach(year => {
                Object.values(year).forEach(sem => {
                    if (Array.isArray(sem)) {
                        subjectsList.push(...sem);
                    }
                });
            });
            
            setAllSubjects(subjectsList);
        } catch (err) {
            console.error('Failed to fetch subjects for curriculum', err);
            error('Failed to load subjects for the selected curriculum');
        } finally {
            setFetchingSubjects(false);
        }
    };

    const fetchCurricula = async (programId) => {
        try {
            const list = await api.get(endpoints.curricula, { program: programId });
            setCurricula(list);
            if (list.length > 0) {
                setFormData(prev => ({ ...prev, curriculum: list[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch curricula', err);
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
            (s.code.toLowerCase().includes(term.toLowerCase()) || 
            s.title.toLowerCase().includes(term.toLowerCase())) &&
            !creditedSubjects.some(cs => cs.subject_id === s.id)
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
        e?.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                year_level: parseInt(formData.year_level, 10),
                birthdate: formData.birthdate || null,
                monthly_commitment: 5000, // Default for manual registration
                credited_subjects: creditedSubjects.map(s => ({
                    subject_id: s.subject_id,
                    grade: s.grade === 'CREDITED' ? null : s.grade
                }))
            };

            const data = await api.post(endpoints.transfereeCreate, payload);

            success(`Student registered: ${data.student_number || 'Record created'}`);
            onSuccess();
            onClose();
            resetForm();
        } catch (err) {
            console.error('Registration error:', err);
            error(err.message || 'An error occurred during registration');
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
                        <FormField label="First Name" required>
                            <Input name="first_name" value={formData.first_name} onChange={handleInputChange} />
                        </FormField>
                        <FormField label="Last Name" required>
                            <Input name="last_name" value={formData.last_name} onChange={handleInputChange} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Email Address" required>
                            <Input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                        </FormField>
                        <FormField label="Birthdate" required>
                            <Input name="birthdate" type="date" value={formData.birthdate} onChange={handleInputChange} />
                        </FormField>
                    </div>
                </div>

                {/* Section 2: Academic */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Book className="w-3 h-3" /> Academic Placement
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Degree Program" required>
                            <Select 
                                name="program" 
                                value={formData.program} 
                                onChange={handleInputChange}
                                placeholder="Select Program"
                                options={programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                            />
                        </FormField>
                        <FormField label="Curriculum" required>
                            <Select 
                                name="curriculum" 
                                value={formData.curriculum} 
                                onChange={handleInputChange}
                                disabled={!formData.program}
                                placeholder={curricula.length === 0 ? 'Select Program First' : 'Select Curriculum'}
                                options={curricula.map(c => ({ value: c.id, label: c.name }))}
                            />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Year Level">
                            <Select 
                                name="year_level" 
                                value={formData.year_level} 
                                onChange={handleInputChange}
                                options={[
                                    { value: '1', label: '1st Year' },
                                    { value: '2', label: '2nd Year' },
                                    { value: '3', label: '3rd Year' },
                                    { value: '4', label: '4th Year' }
                                ]}
                            />
                        </FormField>
                        <FormField label="Status">
                            <Select 
                                name="status" 
                                value={formData.status} 
                                onChange={handleInputChange}
                                options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'INACTIVE', label: 'Inactive' },
                                    { value: 'GRADUATED', label: 'Graduated' }
                                ]}
                            />
                        </FormField>
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
                            <FormField label="Previous Institution">
                                <Input 
                                    name="previous_school" 
                                    value={formData.previous_school} 
                                    onChange={handleInputChange} 
                                    placeholder="Name of previous college/university" 
                                />
                            </FormField>
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
                                    placeholder={!formData.curriculum ? "Select curriculum first..." : "Search subject code or name..."}
                                    disabled={!formData.curriculum || fetchingSubjects}
                                    className="w-full px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:border-blue-300 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100"
                                />
                                {fetchingSubjects && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    </div>
                                )}
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
                                <Input 
                                    type="text" 
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value.toUpperCase())}
                                    placeholder="Grade"
                                    className="text-center"
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

export default AddStudentModal;
