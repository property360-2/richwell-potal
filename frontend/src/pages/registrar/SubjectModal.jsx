import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Upload, 
    Search, 
    Plus, 
    Trash2, 
    FileText, 
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const SubjectModal = ({ isOpen, onClose, subject, programs, onSuccess }) => {
    const { success, error } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        description: '',
        units: 3,
        year_level: 1,
        semester_number: 1,
        program_ids: [],
        prerequisite_ids: []
    });

    const [syllabusFile, setSyllabusFile] = useState(null);
    const [prereqSearch, setPrereqSearch] = useState('');
    const [prereqResults, setPrereqResults] = useState([]);
    const [selectedPrereqs, setSelectedPrereqs] = useState([]);

    useEffect(() => {
        if (subject) {
            setFormData({
                code: subject.code || '',
                title: subject.title || '',
                description: subject.description || '',
                units: subject.units || 3,
                year_level: subject.year_level || 1,
                semester_number: subject.semester_number || 1,
                program_ids: subject.program_ids || [],
                prerequisite_ids: subject.prerequisite_ids || []
            });
            setSelectedPrereqs(subject.prerequisites || []);
        } else {
            setFormData({
                code: '',
                title: '',
                description: '',
                units: 3,
                year_level: 1,
                semester_number: 1,
                program_ids: [],
                prerequisite_ids: []
            });
            setSelectedPrereqs([]);
        }
        setSyllabusFile(null);
    }, [subject, isOpen]);

    // Prerequisite Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (prereqSearch.trim().length >= 2) {
                searchSubjects(prereqSearch);
            } else {
                setPrereqResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [prereqSearch]);

    const searchSubjects = async (q) => {
        try {
            const res = await fetch(`/api/v1/academic/subjects/?search=${q}`);
            if (res.ok) {
                const data = await res.json();
                // Filter out current subject and already selected prereqs
                const list = (data.results || data || []).filter(s => 
                    s.id !== subject?.id && 
                    !selectedPrereqs.some(p => p.id === s.id)
                );
                setPrereqResults(list);
            }
        } catch (err) {
            console.error('Search failed', err);
        }
    };

    const addPrereq = (s) => {
        const updated = [...selectedPrereqs, s];
        setSelectedPrereqs(updated);
        setFormData(prev => ({ ...prev, prerequisite_ids: updated.map(p => p.id) }));
        setPrereqSearch('');
        setPrereqResults([]);
    };

    const removePrereq = (id) => {
        const updated = selectedPrereqs.filter(p => p.id !== id);
        setSelectedPrereqs(updated);
        setFormData(prev => ({ ...prev, prerequisite_ids: updated.map(p => p.id) }));
    };

    const handleProgramToggle = (id) => {
        setFormData(prev => {
            const current = [...prev.program_ids];
            const index = current.indexOf(id);
            if (index > -1) current.splice(index, 1);
            else current.push(id);
            return { ...prev, program_ids: current };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.program_ids.length === 0) {
            error('Select at least one program');
            return;
        }

        try {
            setSubmitting(true);
            const data = new FormData();
            
            // Map common fields
            Object.keys(formData).forEach(key => {
                if (Array.isArray(formData[key])) {
                    formData[key].forEach(val => data.append(key, val));
                } else {
                    data.append(key, formData[key]);
                }
            });

            if (syllabusFile) {
                data.append('syllabus', syllabusFile);
            }

            const url = subject 
                ? `/api/v1/academic/subjects/${subject.id}/` 
                : '/api/v1/academic/subjects/';
            
            const method = subject ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                body: data
            });

            if (res.ok) {
                success(subject ? 'Subject updated' : 'Subject added to catalog');
                onSuccess();
                onClose();
            } else {
                const errData = await res.json();
                error(errData.detail || 'Save failed');
            }
        } catch (err) {
            error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={subject ? 'Edit Subject' : 'Add New Subject'} size="xl">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Core Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Identity</label>
                        <div className="space-y-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5 ml-1">Subject Code</p>
                                <input 
                                    required 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300" 
                                    placeholder="e.g. CS101"
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5 ml-1">Descriptive Title</p>
                                <input 
                                    required 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300" 
                                    placeholder="e.g. Introduction to Programming"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Academic Weight</label>
                        <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5">Units</p>
                                <input 
                                    type="number" 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all" 
                                    value={formData.units}
                                    onChange={e => setFormData({...formData, units: parseInt(e.target.value)})}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5">Year Level</p>
                                <select 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer"
                                    value={formData.year_level}
                                    onChange={e => setFormData({...formData, year_level: parseInt(e.target.value)})}
                                >
                                    {[1,2,3,4].map(y => <option key={y} value={y}>{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5">Semester Placement</p>
                                <select 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer"
                                    value={formData.semester_number}
                                    onChange={e => setFormData({...formData, semester_number: parseInt(e.target.value)})}
                                >
                                    <option value={1}>1st Semester</option>
                                    <option value={2}>2nd Semester</option>
                                    <option value={3}>Summer Term</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Programs Association */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Program Associations</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-6 bg-gray-50/50 rounded-[32px] border border-gray-100">
                        {programs.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleProgramToggle(p.id)}
                                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-left flex items-center justify-between
                                    ${formData.program_ids.includes(p.id) 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                        : 'bg-white border-transparent text-gray-500 hover:border-blue-100'}`}
                            >
                                {p.code}
                                {formData.program_ids.includes(p.id) && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description & Syllabus */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Course Description</label>
                        <textarea 
                            rows="4"
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[32px] text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all placeholder:text-gray-300 resize-none"
                            placeholder="Briefly describe the course objectives and content..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Official Syllabus</label>
                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className={`h-[calc(100%-32px)] border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center p-6 cursor-pointer transition-all gap-3
                                ${syllabusFile ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-gray-50/30 hover:border-blue-300 hover:bg-blue-50/30'}`}
                        >
                            <input type="file" hidden ref={fileInputRef} accept=".pdf" onChange={e => setSyllabusFile(e.target.files[0])} />
                            {syllabusFile ? (
                                <>
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-green-700 truncate max-w-[150px]">{syllabusFile.name}</p>
                                        <p className="text-[10px] font-black text-green-600/60 uppercase">Ready to Upload</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-gray-900 uppercase">Drop PDF Syllabus</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">or click to browse</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Prerequisites */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prerequisite Graph</label>
                    <div className="p-8 bg-gray-50/50 rounded-[40px] border border-gray-100 space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input 
                                type="text"
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300 shadow-sm"
                                placeholder="Search subjects by code or title..."
                                value={prereqSearch}
                                onChange={e => setPrereqSearch(e.target.value)}
                            />
                            {prereqResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    {prereqResults.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => addPrereq(s)}
                                            className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{s.code}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.title}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedPrereqs.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedPrereqs.map(p => (
                                    <div key={p.id} className="inline-flex items-center bg-white px-4 py-2 rounded-xl border border-blue-50 shadow-sm animate-in zoom-in-95">
                                        <div className="mr-3">
                                            <p className="text-[10px] font-black text-blue-600">{p.code}</p>
                                            <p className="text-[8px] font-black text-gray-400 uppercase truncate max-w-[80px]">{p.title}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removePrereq(p.id)}
                                            className="p-1 hover:text-red-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-3xl">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Prerequisites Defined</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={onClose} 
                        className="flex-1"
                    >
                        CANCEL
                    </Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="flex-1"
                        loading={submitting}
                        disabled={submitting}
                    >
                        {subject ? 'UPDATE SUBJECT' : 'ADD TO CATALOG'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SubjectModal;
