import React, { useState, useEffect } from 'react';
import { 
    Users, 
    X, 
    CheckCircle2, 
    Layers, 
    BookOpen,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';

const SectionModal = ({ isOpen, onClose, section, semester, onSuccess }) => {
    const { success, error } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [programs, setPrograms] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        program_id: '',
        year_level: 1,
        capacity: 40,
        semester_id: semester?.id || ''
    });

    useEffect(() => {
        fetchPrograms();
    }, []);

    useEffect(() => {
        if (section) {
            setFormData({
                name: section.name || '',
                program_id: section.program_id || section.program?.id || '',
                year_level: section.year_level || 1,
                capacity: section.capacity || 40,
                semester_id: section.semester_id || semester?.id || ''
            });
        } else {
            setFormData({
                name: '',
                program_id: '',
                year_level: 1,
                capacity: 40,
                semester_id: semester?.id || ''
            });
        }
    }, [section, semester, isOpen]);

    const fetchPrograms = async () => {
        try {
            const res = await fetch('/api/v1/academic/programs/');
            if (res.ok) {
                const data = await res.json();
                setPrograms(data.results || data || []);
            }
        } catch (err) {
            console.error('Failed to load programs', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.program_id) {
            error('Please select a program');
            return;
        }

        try {
            setSubmitting(true);
            const url = section 
                ? `/api/v1/academic/sections/${section.id}/` 
                : '/api/v1/academic/sections/';
            
            const method = section ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                success(section ? 'Section updated' : 'Section created successfully');
                onSuccess();
                onClose();
            } else {
                const errData = await res.json();
                error(errData.detail || 'Failed to save section');
            }
        } catch (err) {
            error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={section ? 'Edit Section' : 'Create New Section'} size="lg">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Identity Section */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Structure Identification</label>
                    <div className="p-8 bg-gray-50/50 rounded-[40px] border border-gray-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2 ml-1">Section Name</p>
                                <input 
                                    required 
                                    placeholder="e.g. BSIT-1A or GRADE-12-ST"
                                    className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300 shadow-sm"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2 ml-1">Academic Program</p>
                                <select 
                                    required
                                    className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer shadow-sm"
                                    value={formData.program_id}
                                    onChange={e => setFormData({...formData, program_id: e.target.value})}
                                >
                                    <option value="">Select Program</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2 ml-1">Year Level</p>
                                <select 
                                    className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer shadow-sm"
                                    value={formData.year_level}
                                    onChange={e => setFormData({...formData, year_level: parseInt(e.target.value)})}
                                >
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(y => (
                                        <option key={y} value={y}>Level {y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2 ml-1">Student Capacity</p>
                                <input 
                                    type="number"
                                    required 
                                    className="w-full px-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:border-blue-100 transition-all shadow-sm"
                                    value={formData.capacity}
                                    onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-xs font-bold text-blue-900/60 leading-relaxed">
                        Sections are cycle-specific. Creating a section in <span className="text-blue-600 font-black">{semester?.name}</span> will make it available for enrollment during this term's window.
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
                        {section ? 'UPDATE SECTION' : 'CREATE SECTION'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SectionModal;
