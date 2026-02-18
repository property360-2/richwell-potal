import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    X, 
    Search, 
    Plus, 
    CheckCircle2, 
    AlertCircle,
    Layers
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';

const SectionSubjectModal = ({ isOpen, onClose, sectionId, programId, currentSubjects, onSuccess }) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [termSubjects, setTermSubjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (isOpen && programId) {
            fetchProgramSubjects();
            setSelectedIds([]);
        }
    }, [isOpen, programId]);

    const fetchProgramSubjects = async () => {
        try {
            setLoading(true);
            // Fetch subjects for this program that aren't already assigned to this section
            const res = await fetch(`/api/v1/academics/subjects/?program=${programId}`);
            if (res.ok) {
                const data = await res.json();
                const all = data.results || data || [];
                const assignedIds = currentSubjects.map(s => s.subject?.id || s.id);
                setTermSubjects(all.filter(s => !assignedIds.includes(s.id)));
            }
        } catch (err) {
            error('Failed to load curriculum subjects');
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0) {
            error('Select at least one subject to assign');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`/api/v1/academics/sections/${sectionId}/assign-subjects/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_ids: selectedIds })
            });

            if (res.ok) {
                success(`${selectedIds.length} subjects added to section load`);
                onSuccess();
                onClose();
            } else {
                error('Failed to assign subjects');
            }
        } catch (err) {
            error('Save failed due to connection error');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = termSubjects.filter(s => 
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Assign Subjects to Section" size="xl">
            <div className="p-8 space-y-8">
                {/* Search Header */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Filter by code or title..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {/* Selection List */}
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
                    ) : (
                        filtered.map(s => (
                            <button
                                key={s.id}
                                onClick={() => toggleSubject(s.id)}
                                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group
                                    ${selectedIds.includes(s.id) 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' 
                                        : 'bg-white border-gray-100 text-gray-500 hover:border-blue-100 hover:bg-blue-50/50'}`}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all
                                        ${selectedIds.includes(s.id) ? 'bg-white/20' : 'bg-gray-50 text-blue-600 border border-gray-100'}`}>
                                        {s.units}U
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-black tracking-tight ${selectedIds.includes(s.id) ? 'text-white' : 'text-gray-900'}`}>{s.code}</h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedIds.includes(s.id) ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {s.title}
                                        </p>
                                    </div>
                                </div>
                                {selectedIds.includes(s.id) ? <CheckCircle2 className="w-6 h-6" /> : <Plus className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                        ))
                    )}
                    {filtered.length === 0 && !loading && (
                        <div className="py-20 text-center opacity-30">
                            <BookOpen className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No subjects available to assign</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {selectedIds.length} Subjects Selected
                    </p>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={onClose}>CANCEL</Button>
                        <Button 
                            variant="primary" 
                            disabled={selectedIds.length === 0 || submitting} 
                            loading={submitting}
                            onClick={handleSubmit}
                        >
                            ASSIGN SELECTED
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const Loader2 = ({ className }) => <BookOpen className={`${className} animate-pulse`} />; // Themed loader

export default SectionSubjectModal;
