import React, { useState, useEffect } from 'react';
import { 
    X, 
    Layers, 
    Calendar, 
    Users, 
    Target,
    BookOpen,
    Loader2,
    Save,
    Edit
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SectionService } from '../services/SectionService';

const EditSectionModal = ({ isOpen, onClose, onSuccess, section, programs, semesters }) => {
    const [formData, setFormData] = useState({
        name: section.name,
        program: section.program?.id || section.program,
        semester: section.semester?.id || section.semester,
        curriculum: section.curriculum?.id || section.curriculum,
        year_level: section.year_level,
        capacity: section.capacity || 40
    });

    const [curricula, setCurricula] = useState([]);
    const [loadingCurricula, setLoadingCurricula] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch curricula when program changes
    useEffect(() => {
        if (formData.program) {
            fetchCurricula(formData.program);
        } else {
            setCurricula([]);
        }
    }, [formData.program]);

    const fetchCurricula = async (programId) => {
        setLoadingCurricula(true);
        try {
            const data = await SectionService.getProgramCurricula(programId);
            setCurricula(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCurricula(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Section name is required';
        if (!formData.program) newErrors.program = 'Program is required';
        if (!formData.semester) newErrors.semester = 'Semester is required';
        if (!formData.year_level) newErrors.year_level = 'Year level is required';
        if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await SectionService.updateSection(section.id, formData);
            onSuccess();
        } catch (err) {
            console.error(err);
            setErrors({ submit: err.message || 'Failed to update section' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="bg-amber-500 p-10 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-amber-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    
                    <div className="relative flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/30 shadow-inner">
                                <Edit className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Edit Section</h2>
                                <p className="text-amber-50 text-[11px] font-black uppercase tracking-[0.2em] mt-0.5">Modify Academic Group</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all ring-1 ring-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section Name */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Section Name</label>
                            <div className="relative group">
                                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-600 transition-colors" size={18} />
                                <input 
                                    type="text"
                                    placeholder="e.g. BSIT 1-A"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    className={`w-full bg-gray-50 border-2 ${errors.name ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-amber-500 ring-amber-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none`}
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.name}</p>}
                            </div>
                        </div>

                        {/* Program Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Program</label>
                            <div className="relative group">
                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-600 transition-colors pointer-events-none" size={18} />
                                <select 
                                    value={formData.program}
                                    onChange={(e) => setFormData({ ...formData, program: e.target.value, curriculum: '' })}
                                    className={`w-full bg-gray-50 border-2 ${errors.program ? 'border-red-200 focus:border-red-500 ring-red-500/10' : 'border-gray-50 focus:border-amber-500 ring-amber-500/10'} rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold appearance-none focus:ring-4 transition-all outline-none`}
                                >
                                    <option value="">Select Program</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.code}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Semester Selection (Read-only) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Semester/Year</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 transition-colors pointer-events-none" size={18} />
                                <div className="w-full bg-amber-50/50 border-2 border-amber-100/50 rounded-[20px] pl-12 pr-6 py-4 text-sm font-black text-amber-700">
                                    {(() => {
                                        const s = semesters.find(item => item.id === formData.semester);
                                        return s ? `${s.academic_year} - ${s.name}` : 'Unknown Term';
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Curriculum Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Effective Curriculum</label>
                            <div className="relative group">
                                <BookOpen className={`absolute left-4 top-1/2 -translate-y-1/2 ${loadingCurricula ? 'text-amber-600 animate-spin' : 'text-gray-400'} group-focus-within:text-amber-600 transition-colors pointer-events-none`} size={18} />
                                <select 
                                    value={formData.curriculum}
                                    onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                                    disabled={!formData.program || loadingCurricula}
                                    className={`w-full bg-gray-50 border-2 border-gray-50 focus:border-amber-500 ring-amber-500/10 rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold appearance-none focus:ring-4 transition-all outline-none disabled:opacity-50`}
                                >
                                    <option value="">Select Curriculum</option>
                                    {curricula.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.effective_year})</option>
                                    ))}
                                </select>
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
                                            ? 'bg-amber-600 text-white shadow-amber-100 shadow-lg' 
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        L{year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Capacity</label>
                            <div className="relative group">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-600 transition-colors pointer-events-none" size={18} />
                                <input 
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 border-2 border-gray-50 focus:border-amber-500 ring-amber-500/10 rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 transition-all outline-none"
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

                    <div className="mt-10 flex gap-4">
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
                            disabled={isSubmitting}
                            className="flex-[2] rounded-[22px] py-4 h-auto shadow-xl shadow-amber-100 flex items-center justify-center gap-3 group bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                            )}
                            <span className="font-black uppercase tracking-widest text-[11px]">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSectionModal;
