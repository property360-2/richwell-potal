import React, { useState, useEffect } from 'react';
import { 
    Users, 
    X, 
    Search, 
    Plus, 
    CheckCircle2, 
    AlertCircle,
    UserCircle,
    Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const SectionStudentModal = ({ isOpen, onClose, sectionId, programCode, yearLevel, onSuccess }) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (isOpen && sectionId) {
            fetchRecommendedStudents();
            setSelectedIds([]);
        }
    }, [isOpen, sectionId]);

    const fetchRecommendedStudents = async () => {
        try {
            setLoading(true);
            // Fetch students from the same program/year who don't have a section yet
            const res = await fetch(`/api/v1/academic/sections/${sectionId}/recommend-students/`);
            if (res.ok) {
                const data = await res.json();
                setAvailableStudents(data || []);
            }
        } catch (err) {
            error('Failed to load student recommendations');
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0) {
            error('Select at least one student to enroll');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`/api/v1/academic/sections/${sectionId}/assign-students/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_ids: selectedIds })
            });

            if (res.ok) {
                success(`${selectedIds.length} students enrolled in section`);
                onSuccess();
                onClose();
            } else {
                error('Batch enrollment failed');
            }
        } catch (err) {
            error('Network sync error');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = availableStudents.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.student_number && s.student_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Batch Enroll Students" size="xl">
            <div className="p-8 space-y-8">
                {/* Recommendation Header */}
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
                    <UserCircle className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                    <div>
                        <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Targeted Recommendation</h5>
                        <p className="text-xs font-bold text-blue-600/60 leading-relaxed">
                            Showing students from <span className="text-blue-600 font-black">{programCode} - Year {yearLevel}</span> who are currently unassigned.
                        </p>
                    </div>
                </div>

                {/* Filter */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filter by name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                    />
                </div>

                {/* Student Selection */}
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
                    ) : (
                        filtered.map(s => (
                            <button
                                key={s.id || s.user_id}
                                onClick={() => toggleStudent(s.id || s.user_id)}
                                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between group
                                    ${selectedIds.includes(s.id || s.user_id) 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' 
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-blue-100 hover:bg-blue-50/50'}`}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-[10px] text-blue-600">
                                        {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-black tracking-tight ${selectedIds.includes(s.id || s.user_id) ? 'text-white' : 'text-gray-900'}`}>
                                            {s.last_name}, {s.first_name}
                                        </h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedIds.includes(s.id || s.user_id) ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {s.student_number || 'TEMP_ID'}
                                        </p>
                                    </div>
                                </div>
                                {selectedIds.includes(s.id || s.user_id) ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                        ))
                    )}
                    {filtered.length === 0 && !loading && (
                        <div className="py-20 text-center opacity-30">
                            <Users className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No unassigned students match this criteria</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 uppercase tracking-widest">
                    <span className="text-[10px] font-black text-gray-400">{selectedIds.length} Enrollment Ready</span>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={onClose}>CANCEL</Button>
                        <Button 
                            variant="primary" 
                            disabled={selectedIds.length === 0 || submitting} 
                            loading={submitting}
                            onClick={handleSubmit}
                        >
                            ENROLL SELECTED
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SectionStudentModal;
