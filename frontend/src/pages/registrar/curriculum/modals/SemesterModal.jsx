import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    X, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    CalendarDays
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';

const SemesterModal = ({ isOpen, onClose, semester, onSuccess }) => {
    const { success, error } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '1st Semester',
        academic_year: '',
        start_date: '',
        end_date: '',
        enrollment_start_date: '',
        enrollment_end_date: '',
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
                is_current: semester.is_current || false,
                status: semester.status || 'SETUP'
            });
        } else {
            // Default for new term
            const currentYear = new Date().getFullYear();
            setFormData({
                name: '1st Semester',
                academic_year: `${currentYear}-${currentYear + 1}`,
                start_date: '',
                end_date: '',
                enrollment_start_date: '',
                enrollment_end_date: '',
                is_current: false,
                status: 'SETUP'
            });
        }
    }, [semester, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.academic_year.match(/^\d{4}-\d{4}$/)) {
            error('Invalid Academic Year format (YYYY-YYYY)');
            return;
        }

        try {
            setSubmitting(true);
            const url = semester 
                ? `/api/v1/academics/semesters/${semester.id}/` 
                : '/api/v1/academics/semesters/';
            
            const method = semester ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                success(semester ? 'Term details updated' : 'New academic term initialized');
                onSuccess();
                onClose();
            } else {
                const errData = await res.json();
                error(errData.detail || 'Failed to save academic term');
            }
        } catch (err) {
            error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={semester ? 'Edit Academic Term' : 'Initialize New Term'} size="lg">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Basic Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Classification</label>
                        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1">Term Name</p>
                                <select 
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                >
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="Summer Term">Summer Term</option>
                                </select>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1">Academic Year</p>
                                <input 
                                    required 
                                    placeholder="2024-2025"
                                    className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300" 
                                    value={formData.academic_year}
                                    onChange={e => setFormData({...formData, academic_year: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Term Status</label>
                        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 h-[calc(100%-32px)] flex flex-col justify-center gap-6">
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-gray-900 uppercase">Primary Active Term</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Visible to all users</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.is_current} onChange={e => setFormData({...formData, is_current: e.target.checked})} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Duration Windows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <CalendarDays className="w-3 h-3" /> Academic Schedule
                        </label>
                        <div className="p-6 bg-indigo-50/30 rounded-[32px] border border-indigo-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1.5">Start Date</p>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-300 transition-all" 
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1.5">End Date</p>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-300 transition-all" 
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Enrollment Window
                        </label>
                        <div className="p-6 bg-green-50/30 rounded-[32px] border border-green-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-green-600 uppercase mb-1.5">Start Date</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2 bg-white border border-green-100 rounded-xl text-xs font-bold focus:outline-none focus:border-green-300 transition-all" 
                                        value={formData.enrollment_start_date}
                                        onChange={e => setFormData({...formData, enrollment_start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-green-600 uppercase mb-1.5">End Date</p>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2 bg-white border border-green-100 rounded-xl text-xs font-bold focus:outline-none focus:border-green-300 transition-all" 
                                        value={formData.enrollment_end_date}
                                        onChange={e => setFormData({...formData, enrollment_end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Administrative Note</p>
                        <p className="text-xs font-bold text-blue-900/60 leading-relaxed">
                            Setting a term as "Active" will override the currently active semester. Enrollment visibility for students is determined by the "Enrollment Open" status in the Term Phase control.
                        </p>
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
                        {semester ? 'SAVE CHANGES' : 'INITIALIZE TERM'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SemesterModal;
