import React, { useState, useEffect } from 'react';
import { 
    X, 
    Layers, 
    Calendar, 
    Users, 
    Target,
    BookOpen,
    Loader2,
    CheckCircle2,
    Plus
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SectionService } from '../services/SectionService';

const AddSectionModal = ({ isOpen, onClose, onSuccess, programs, semesters }) => {
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        section_count: 1, // Number of sections to generate
        program: '',
        semester: '',
        curriculum: '',
        year_level: '',
        capacity: 40
    });

    const [curricula, setCurricula] = useState([]);
    const [existingSections, setExistingSections] = useState([]);
    const [loadingCurricula, setLoadingCurricula] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Default to active semester
    useEffect(() => {
        if (semesters && semesters.length > 0) {
            const activeSem = semesters.find(s => s.is_current); // Use is_current instead of is_active
            if (activeSem) {
                setFormData(prev => ({ ...prev, semester: activeSem.id }));
            }
        }
    }, [semesters]);

    // Fetch curricula and existing sections when program changes
    useEffect(() => {
        if (formData.program) {
            fetchCurricula(formData.program);
            fetchExistingSections(formData.program, formData.semester);
        } else {
            setCurricula([]);
            setExistingSections([]);
        }
    }, [formData.program, formData.semester]);

    const fetchCurricula = async (programId) => {
        setLoadingCurricula(true);
        try {
            const data = await SectionService.getProgramCurricula(programId);
            setCurricula(data);
            
            // Auto-select active curriculum if only one
            const activeCur = data.find(c => c.is_active);
            if (activeCur) {
                setFormData(prev => ({ ...prev, curriculum: activeCur.id }));
            } else if (data.length > 0) {
                setFormData(prev => ({ ...prev, curriculum: data[0].id }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCurricula(false);
        }
    };

    const fetchExistingSections = async (programId, semesterId) => {
        if (!programId || !semesterId) return;
        try {
            const data = await SectionService.getSections({ program: programId, semester: semesterId });
            setExistingSections(data.results || data || []);
        } catch (err) {
            console.error('Failed to fetch existing sections', err);
        }
    };

    // Helper to extract program code for prefix
    const getProgramCode = () => {
        if (!formData.program || !programs) return '';
        const program = programs.find(p => p.id === formData.program);
        return program ? program.code.toUpperCase() : '';
    };

    // Helper to find the next available sequence index
    const getStartingIndex = () => {
        const prefix = getProgramCode();
        if (!prefix || !formData.year_level) return 1;

        const pattern = new RegExp(`^${prefix}${formData.year_level}-([0-9]+)$`);
        let maxIndex = 0;

        existingSections.forEach(section => {
            const match = section.name.toUpperCase().match(pattern);
            if (match) {
                const index = parseInt(match[1]);
                if (index > maxIndex) maxIndex = index;
            }
        });

        return maxIndex + 1;
    };

    // Helper to generate section names
    const getGeneratedNames = () => {
        const prefix = getProgramCode();
        if (!prefix || !formData.year_level || formData.section_count < 1) return [];
        
        const startingIndex = getStartingIndex();
        const names = [];
        for (let i = 0; i < formData.section_count; i++) {
            names.push(`${prefix}${formData.year_level}-${startingIndex + i}`);
        }
        return names;
    };

    // Auto-update single name based on auto-sequence
    useEffect(() => {
        if (!isBulkMode && formData.program && formData.year_level) {
            const names = getGeneratedNames();
            if (names.length > 0) {
                setFormData(prev => ({ ...prev, name: names[0] }));
            }
        }
    }, [formData.program, formData.year_level, existingSections, isBulkMode]);

    const validate = () => {
        const newErrors = {};
        const generatedNames = getGeneratedNames();
        const existingNames = existingSections.map(s => s.name.toUpperCase());

        if (!isBulkMode) {
            if (!formData.name) {
                newErrors.name = 'Section name is required';
            } else if (existingNames.includes(formData.name.toUpperCase())) {
                newErrors.name = 'Section name already exists in this program/semester';
            }
        } else {
            if (formData.section_count < 1) {
                newErrors.section_count = 'Count must be at least 1';
            }
            
            // Check for duplicates in generated names against existing
            const dupes = generatedNames.filter(name => existingNames.includes(name));
            if (dupes.length > 0) {
                newErrors.bulk_dupes = `The following sections already exist: ${dupes.join(', ')}`;
            }
        }

        if (!formData.program) newErrors.program = 'Program is required';
        if (!formData.semester) newErrors.semester = 'Semester is required';
        if (!formData.curriculum) newErrors.curriculum = 'Curriculum is required';
        if (!formData.year_level) newErrors.year_level = 'Year level is required';
        if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Auto-update validation errors on field changes
    useEffect(() => {
        if (formData.program || formData.name || formData.year_level) {
            validate();
        }
    }, [formData, isBulkMode, existingSections]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            if (isBulkMode) {
                const bulkPayload = {
                    program: formData.program,
                    year_level: formData.year_level,
                    curriculum: formData.curriculum,
                    semester: formData.semester,
                    capacity: formData.capacity,
                    section_names: getGeneratedNames()
                };

                await SectionService.bulkCreateSections(bulkPayload);
            } else {
                await SectionService.createSection(formData);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            setErrors({ submit: err.message || (isBulkMode ? 'Failed to bulk create sections' : 'Failed to create section') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasValidationErrors = Object.keys(errors).some(k => k !== 'submit');
    const generatedNames = getGeneratedNames();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-indigo-600 p-8 relative overflow-hidden shrink-0">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-indigo-500/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    
                    <div className="relative flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/30 shadow-inner">
                                <Plus className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">
                                    {isBulkMode ? 'Bulk Create Sections' : 'Create Section'}
                                </h2>
                                <p className="text-indigo-100 text-[11px] font-black uppercase tracking-[0.2em] mt-0.5">Setup Academic Group</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Bulk Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsBulkMode(!isBulkMode)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                                    isBulkMode 
                                    ? 'bg-white text-indigo-600 border-white shadow-lg' 
                                    : 'bg-indigo-500/30 text-white border-white/20 hover:bg-indigo-500/50'
                                }`}
                            >
                                {isBulkMode ? 'Bulk Mode: ON' : 'Switch to Bulk'}
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all ring-1 ring-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Program Suggestion Info */}
                        <div className="md:col-span-2 bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl flex items-start gap-4 mb-2">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-50">
                                <Layers className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Automated Section Identity</h4>
                                <p className="text-[10px] font-bold text-indigo-600/70 mt-0.5 leading-relaxed">
                                    Names are generated based on Course Prefix + Year Level + Sequence.
                                </p>
                            </div>
                        </div>

                        {/* Bulk Logic: Count for Bulk Mode */}
                        {isBulkMode && (
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Number of Sections to Generate</label>
                                <div className="relative group">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                    <input 
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.section_count}
                                        onChange={(e) => setFormData({ ...formData, section_count: Math.min(20, Math.max(1, parseInt(e.target.value) || 0)) })}
                                        className={`w-full bg-gray-50 border-2 ${errors.section_count ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-indigo-500 ring-indigo-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none`}
                                    />
                                    {errors.section_count && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.section_count}</p>}
                                </div>
                            </div>
                        )}

                        {/* Program Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Program</label>
                            <div className="relative group">
                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={18} />
                                <select 
                                    value={formData.program}
                                    onChange={(e) => setFormData({ ...formData, program: e.target.value, curriculum: '' })}
                                    className={`w-full bg-gray-50 border-2 ${errors.program ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-indigo-500 ring-indigo-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold appearance-none focus:ring-4 transition-all outline-none`}
                                >
                                    <option value="">Select Program</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.code}</option>
                                    ))}
                                </select>
                                {errors.program && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.program}</p>}
                            </div>
                        </div>

                        {/* Semester Indicator (Read-only) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Active Term</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 transition-colors pointer-events-none" size={18} />
                                <div className="w-full bg-indigo-50/50 border-2 border-indigo-100/50 rounded-[20px] pl-12 pr-6 py-4 text-sm font-black text-indigo-700">
                                    {(() => {
                                        const s = semesters.find(item => item.id === formData.semester);
                                        return s ? `${s.academic_year} - ${s.name}` : 'No Active Term Found';
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Curriculum Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Effective Curriculum</label>
                            <div className="relative group">
                                <BookOpen className={`absolute left-4 top-1/2 -translate-y-1/2 ${loadingCurricula ? 'text-indigo-600 animate-spin' : 'text-gray-400'} group-focus-within:text-indigo-600 transition-colors pointer-events-none`} size={18} />
                                <select 
                                    value={formData.curriculum}
                                    onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                                    disabled={!formData.program || loadingCurricula}
                                    className={`w-full bg-gray-50 border-2 ${errors.curriculum ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-indigo-500 ring-indigo-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold appearance-none focus:ring-4 transition-all outline-none disabled:opacity-50`}
                                >
                                    <option value="">{formData.program ? 'Select Curriculum' : 'Select Program First'}</option>
                                    {curricula.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.effective_year})</option>
                                    ))}
                                </select>
                                {errors.curriculum && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.curriculum}</p>}
                            </div>
                        </div>

                        {/* Year Level */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Year Level</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(year => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, year_level: year })}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                                            formData.year_level === year 
                                            ? 'bg-indigo-600 text-white shadow-indigo-100 shadow-lg' 
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        L{year}
                                    </button>
                                ))}
                            </div>
                            {errors.year_level && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.year_level}</p>}
                        </div>

                        {/* Section Preview (Always show if prefix/year level set) */}
                        {getProgramCode() && formData.year_level && (
                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Section Identity Preview</label>
                                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Auto-sequenced</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {generatedNames.map((name, idx) => (
                                        <div 
                                            key={idx}
                                            className="px-4 py-3 rounded-[18px] text-[11px] font-black flex items-center justify-between border-2 bg-indigo-50/30 border-indigo-100/50 text-indigo-600 transition-all animate-in zoom-in-95"
                                        >
                                            <span>{name}</span>
                                            <CheckCircle2 size={14} className="text-indigo-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Capacity */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Capacity</label>
                            <div className="relative group">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={18} />
                                <input 
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 border-2 border-gray-50 focus:border-indigo-500 ring-indigo-500/10 rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100">
                            <X className="shrink-0" size={20} />
                            <p className="text-[11px] font-black uppercase tracking-tight">{errors.submit}</p>
                        </div>
                    )}

                    <div className="mt-10 flex gap-4 shrink-0">
                        <Button 
                            variant="secondary" 
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-[22px] py-4 h-auto font-black uppercase tracking-widest text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 border-none"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={isSubmitting || hasValidationErrors}
                            className={`flex-[2] rounded-[22px] py-4 h-auto shadow-xl flex items-center justify-center gap-3 group transition-all ${
                                hasValidationErrors 
                                ? 'bg-gray-300 shadow-none cursor-not-allowed grayscale' 
                                : 'shadow-indigo-100'
                            }`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                            )}
                            <span className="font-black uppercase tracking-widest text-[11px]">
                                {isSubmitting ? (isBulkMode ? 'Creating Sections...' : 'Creating...') : (isBulkMode ? `Create ${formData.section_count} Sections` : 'Finalize Section')}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSectionModal;
