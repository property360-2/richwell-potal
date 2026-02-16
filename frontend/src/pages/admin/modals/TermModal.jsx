import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    X, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    CalendarDays,
    GraduationCap,
    Info
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { AdminService } from '../services/AdminService';

const TermModal = ({ isOpen, onClose, semester, onSuccess }) => {
    const { success, error, info } = useToast();
    const [submitting, setSubmitting] = useState(false);

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
    }, [semester, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.academic_year.match(/^\d{4}-\d{4}$/)) {
            error('Invalid Academic Year format (YYYY-YYYY)');
            return;
        }

        try {
            setSubmitting(true);
            if (semester) {
                await AdminService.updateSemester(semester.id, formData);
                success('Term details updated');
            } else {
                await AdminService.createSemester(formData);
                success('New academic term initialized');
            }
            onSuccess();
            onClose();
        } catch (err) {
            error(err.response?.data?.detail || 'Failed to save academic term');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={semester ? 'Override Term Configuration' : 'Initialize New Academic Term'} 
            maxWidth="max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="p-8 space-y-10">
                {/* Basic Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Institutional Identification</label>
                        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-4 shadow-inner">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Classification</p>
                                <select 
                                    className="w-full px-6 py-3.5 bg-white border-2 border-transparent rounded-2xl text-sm font-black focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                >
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="Summer Term">Summer Term</option>
                                </select>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Academic Year</p>
                                <input 
                                    required 
                                    placeholder="2025-2026"
                                    className="w-full px-6 py-3.5 bg-white border-2 border-transparent rounded-2xl text-sm font-black focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 shadow-sm" 
                                    value={formData.academic_year}
                                    onChange={e => setFormData({...formData, academic_year: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Active Status Override</label>
                        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 h-[calc(100%-32px)] flex flex-col justify-center gap-6 shadow-inner">
                            <div className="flex items-center justify-between p-5 bg-white rounded-[24px] border border-gray-50 shadow-lg shadow-gray-200/20">
                                <div>
                                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Set as Primary Active Term</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Global context switch</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer scale-110">
                                    <input type="checkbox" className="sr-only peer" checked={formData.is_current} onChange={e => setFormData({...formData, is_current: e.target.checked})} />
                                    <div className="w-12 h-6.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Matrices */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Institutional Time Windows</label>
                   
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Term Schedule */}
                        <div className="p-6 bg-blue-50/50 rounded-[40px] border border-blue-100 space-y-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Academic Term</p>
                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-0.5">Full Semester</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-blue-600/60 uppercase mb-1.5 ml-1">Start Date</p>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-xs font-black focus:outline-none focus:border-blue-400 transition-all shadow-sm" 
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-blue-600/60 uppercase mb-1.5 ml-1">End Date</p>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-xs font-black focus:outline-none focus:border-blue-400 transition-all shadow-sm" 
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Enrollment Window */}
                        <div className="p-6 bg-emerald-50/50 rounded-[40px] border border-emerald-100 space-y-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Enrollment</p>
                                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Student Clearance</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Opening Date</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-2xl text-xs font-black focus:outline-none focus:border-emerald-400 transition-all shadow-sm" 
                                        value={formData.enrollment_start_date}
                                        onChange={e => setFormData({...formData, enrollment_start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Closing Date</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-2xl text-xs font-black focus:outline-none focus:border-emerald-400 transition-all shadow-sm" 
                                        value={formData.enrollment_end_date}
                                        onChange={e => setFormData({...formData, enrollment_end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grading Window */}
                        <div className="p-6 bg-purple-50/50 rounded-[40px] border border-purple-100 space-y-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Grading Matrix</p>
                                    <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-0.5">Faculty Submission</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-purple-600/60 uppercase mb-1.5 ml-1">Portal Open</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3 bg-white border border-purple-100 rounded-2xl text-xs font-black focus:outline-none focus:border-purple-400 transition-all shadow-sm" 
                                        value={formData.grading_start_date}
                                        onChange={e => setFormData({...formData, grading_start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-purple-600/60 uppercase mb-1.5 ml-1">Portal Closed</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3 bg-white border border-purple-100 rounded-2xl text-xs font-black focus:outline-none focus:border-purple-400 transition-all shadow-sm" 
                                        value={formData.grading_end_date}
                                        onChange={e => setFormData({...formData, grading_end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-900 rounded-[32px] border border-gray-800 flex items-start gap-4 shadow-2xl">
                    <Info className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Administrative Guardrail</p>
                        <p className="text-[11px] font-medium text-gray-400 leading-relaxed italic">
                            Phase transitions and institutional visibility are strictly determined by the timestamps configured above. Overriding the "Primary Active Term" will immediately re-sync all dashboards for students and faculty.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button 
                        type="button" 
                        variant="blue-ghost" 
                        onClick={onClose} 
                        className="flex-1 py-5 rounded-2xl text-[10px] font-black tracking-[0.2em]"
                    >
                        ABORT CONFIGURATION
                    </Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="flex-1 py-5 rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-xl shadow-blue-500/20"
                        loading={submitting}
                        disabled={submitting}
                    >
                        {semester ? 'COMMIT OVERRIDES' : 'INITIALIZE PERIOD'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TermModal;
