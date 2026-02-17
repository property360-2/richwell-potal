import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Clock, 
    CalendarDays,
    GraduationCap,
    Info,
    AlertCircle,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { AdminService } from '../services/AdminService';

const TermModal = ({ isOpen, onClose, semester, onSuccess }) => {
    const { success, error } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '1st Semester',
        academic_year: '',
        start_date: '',
        end_date: '',
        enrollment_start_date: '',
        enrollment_end_date: '',
        grading_start_date: '',
        grading_end_date: '',
        is_current: false,
        status: 'SETUP'
    });

    useEffect(() => {
        if (semester) {
            setFormData({
                name: semester.name || '1st Semester',
                academic_year: semester.academic_year || '',
                start_date: semester.start_date || '',
                end_date: semester.end_date || '',
                enrollment_start_date: semester.enrollment_start_date || '',
                enrollment_end_date: semester.enrollment_end_date || '',
                grading_start_date: semester.grading_start_date || '',
                grading_end_date: semester.grading_end_date || '',
                is_current: semester.is_current || false,
                status: semester.status || 'SETUP'
            });
        } else {
            const currentYear = new Date().getFullYear();
            setFormData({
                name: '1st Semester',
                academic_year: `${currentYear}-${currentYear + 1}`,
                start_date: '',
                end_date: '',
                enrollment_start_date: '',
                enrollment_end_date: '',
                grading_start_date: '',
                grading_end_date: '',
                is_current: false,
                status: 'SETUP'
            });
        }
        setErrors({});
    }, [semester, isOpen]);

    const validate = () => {
        const newErrors = {};
        
        // Academic Year
        if (!formData.academic_year.match(/^\d{4}-\d{4}$/)) {
            newErrors.academic_year = 'Use format YYYY-YYYY (e.g., 2025-2026)';
        }

        // Term Span
        if (formData.start_date && formData.end_date) {
            if (new Date(formData.end_date) <= new Date(formData.start_date)) {
                newErrors.term_span = 'End date must be after start date';
            }
        }

        // Enrollment Window
        if (formData.enrollment_start_date && formData.enrollment_end_date) {
            if (new Date(formData.enrollment_end_date) <= new Date(formData.enrollment_start_date)) {
                newErrors.enrollment_window = 'Closing date must be after opening date';
            }
        }

        // Grading Window
        if (formData.grading_start_date && formData.grading_end_date) {
            if (new Date(formData.grading_end_date) <= new Date(formData.grading_start_date)) {
                newErrors.grading_window = 'Portal close must be after opening date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validate()) {
            error('Please correct the validation errors before proceeding.');
            return;
        }

        try {
            setSubmitting(true);
            if (semester) {
                await AdminService.updateSemester(semester.id, formData);
                success('Term configuration synchronized');
            } else {
                await AdminService.createSemester(formData);
                success('Academic term initialized');
            }
            onSuccess();
            onClose();
        } catch (err) {
            error(err.response?.data?.detail || 'Institutional error: Failed to save term');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClasses = (hasError) => `
        w-full px-4 py-3 bg-white border-2 rounded-2xl text-sm font-semibold tracking-tight
        placeholder:text-gray-300 transition-all duration-200
        ${hasError 
            ? 'border-red-100 bg-red-50/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
            : 'border-gray-100 hover:border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'}
        outline-none
    `;
    
    const labelClasses = "block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 ml-1";
    const sectionClasses = "p-7 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-7 hover:shadow-md transition-shadow duration-300";
    const errorClasses = "mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={semester ? 'Override Term Configuration' : 'Initialize New Period'} 
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[85vh] overflow-y-auto scrollbar-hide">
                {/* General Info */}
                <div className="space-y-6">
                    <div>
                        <label className={labelClasses}>Term Classification</label>
                        <select 
                            className={inputClasses()}
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        >
                            <option value="1st Semester">1st Semester</option>
                            <option value="2nd Semester">2nd Semester</option>
                            <option value="Summer Term">Summer Term</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>Academic cycle</label>
                        <input 
                            required 
                            placeholder="2025-2026"
                            className={inputClasses(errors.academic_year)} 
                            value={formData.academic_year}
                            onChange={e => {
                                setFormData({...formData, academic_year: e.target.value});
                                if (errors.academic_year) validate();
                            }}
                        />
                        {errors.academic_year && (
                            <p className={errorClasses}><AlertTriangle size={12} /> {errors.academic_year}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-5 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                        <div>
                            <p className="text-[12px] font-black text-gray-900 uppercase tracking-tight">Set as Primary Active term</p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5 opacity-70">Global Portal Context Override</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.is_current} onChange={e => setFormData({...formData, is_current: e.target.checked})} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Date Windows */}
                <div className="space-y-8">
                    {/* Academic Schedule */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <CalendarDays size={14} /> Academic Schedule
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Start Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    className={inputClasses(errors.term_span)} 
                                    value={formData.start_date}
                                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>End Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    className={inputClasses(errors.term_span)} 
                                    value={formData.end_date}
                                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                                />
                            </div>
                        </div>
                        {errors.term_span && (
                            <p className={errorClasses}><AlertTriangle size={12} /> {errors.term_span}</p>
                        )}
                    </div>

                    {/* Enrollment Window */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={14} /> Enrollment Window
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Portal Opens</label>
                                <input 
                                    type="date" 
                                    className={inputClasses(errors.enrollment_window)} 
                                    value={formData.enrollment_start_date}
                                    onChange={e => setFormData({...formData, enrollment_start_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Portal Closes</label>
                                <input 
                                    type="date" 
                                    className={inputClasses(errors.enrollment_window)} 
                                    value={formData.enrollment_end_date}
                                    onChange={e => setFormData({...formData, enrollment_end_date: e.target.value})}
                                />
                            </div>
                        </div>
                        {errors.enrollment_window && (
                            <p className={errorClasses}><AlertTriangle size={12} /> {errors.enrollment_window}</p>
                        )}
                    </div>

                    {/* Grading Portal */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <GraduationCap size={14} /> Faculty Final Grading Matrix
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Release Date</label>
                                <input 
                                    type="date" 
                                    className={inputClasses(errors.grading_window)} 
                                    value={formData.grading_start_date}
                                    onChange={e => setFormData({...formData, grading_start_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Lockdown Date</label>
                                <input 
                                    type="date" 
                                    className={inputClasses(errors.grading_window)} 
                                    value={formData.grading_end_date}
                                    onChange={e => setFormData({...formData, grading_end_date: e.target.value})}
                                />
                            </div>
                        </div>
                        {errors.grading_window && (
                            <p className={errorClasses}><AlertTriangle size={12} /> {errors.grading_window}</p>
                        )}
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex gap-4">
                    <Button 
                        type="button" 
                        variant="blue-ghost" 
                        onClick={onClose} 
                        className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="flex-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/10"
                        loading={submitting}
                        disabled={submitting}
                    >
                        {semester ? 'Save Changes' : 'Initialize Term'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TermModal;
