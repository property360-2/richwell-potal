import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, BookOpen, AlertCircle, Save, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { CurriculumService } from '../services/CurriculumService';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';
import AddSubjectModal from './AddSubjectModal';

const AssignSubjectToCurriculumModal = ({ 
    isOpen, 
    onClose, 
    curriculumId, 
    curriculumName, 
    programId,
    programName,
    yearLevel, 
    semesterNumber,
    onSuccess 
}) => {
    const { success: showSuccess, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [showGlobal, setShowGlobal] = useState(false);
    const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!isOpen) return;
            try {
                setSubjectsLoading(true);
                // Fetch subjects. If showGlobal is false, we restrict to program + global. 
                // If true, we fetch everything (or use include_global)
                const params = showGlobal ? {} : { program: programId };
                const data = await ProgramService.getSubjects(params);
                setAvailableSubjects(data);
            } catch (err) {
                console.error(err);
                showError('Failed to load subjects');
            } finally {
                setSubjectsLoading(false);
            }
        };

        fetchSubjects();
    }, [isOpen, programId, showError, showGlobal]);

    const filteredSubjects = availableSubjects.filter(s => 
        (s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !selectedSubjects.some(selected => selected.id === s.id)
    );

    const handleAddSubject = (subject) => {
        setSelectedSubjects([...selectedSubjects, subject]);
    };

    const handleRemoveSubject = (id) => {
        setSelectedSubjects(selectedSubjects.filter(s => s.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedSubjects.length === 0) {
            showError('Please select at least one subject');
            return;
        }

        setLoading(true);
        try {
            const assignments = selectedSubjects.map(s => ({
                subject_id: s.id,
                year_level: yearLevel,
                semester_number: semesterNumber,
                is_required: true
            }));

            await CurriculumService.assignSubjects(curriculumId, assignments);
            showSuccess(`Successfully assigned ${selectedSubjects.length} subjects`);
            onSuccess();
            onClose();
            setSelectedSubjects([]);
        } catch (err) {
            console.error(err);
            showError(err.message || 'Failed to assign subjects');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-[40px] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl flex flex-col h-[80vh]">
                                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                    {/* Header */}
                                        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                                    <Plus size={24} />
                                                </div>
                                                <div>
                                                    <Dialog.Title as="h3" className="text-xl font-black text-gray-900 tracking-tight">
                                                        Assign Subjects
                                                    </Dialog.Title>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Year {yearLevel} • {semesterNumber === 1 ? '1st' : semesterNumber === 2 ? '2nd' : 'Summer'} Sem • {curriculumName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button 
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setIsAddSubjectOpen(true)}
                                                    className="rounded-xl flex items-center gap-2 border-dashed"
                                                    icon={Plus}
                                                >
                                                    Add New Subject
                                                </Button>
                                                <button
                                                    type="button"
                                                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                                                    onClick={onClose}
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                    {/* Content Area */}
                                    <div className="flex-grow overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                        {/* Left: Selection Area */}
                                        <div className="flex-1 overflow-hidden flex flex-col p-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Search className="text-gray-400" size={16} />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master List</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGlobal(!showGlobal)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                                        showGlobal
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                            : 'bg-white border-gray-200 text-gray-400'
                                                    }`}
                                                >
                                                    <Plus size={12} className={showGlobal ? 'rotate-45 transition-transform' : 'transition-transform'} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{showGlobal ? 'Showing All Programs' : 'Program Only'}</span>
                                                </button>
                                            </div>
                                            <div className="relative mb-6">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search subjects by code or title..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                                                />
                                            </div>

                                            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                                {subjectsLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-20">
                                                        <Loader2 className="text-indigo-600 animate-spin mb-4" size={32} />
                                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Master List...</p>
                                                    </div>
                                                ) : filteredSubjects.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {filteredSubjects.map(subject => (
                                                            <div 
                                                                key={subject.id} 
                                                                onClick={() => handleAddSubject(subject)}
                                                                className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm border border-gray-100">
                                                                        {subject.code}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-800 leading-tight mb-0.5">{subject.title}</p>
                                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{subject.units} Units • {subject.is_major ? 'Major' : 'Minor'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="p-2 text-indigo-600 bg-white rounded-lg shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                    <Plus size={16} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-20 text-center">
                                                        <div className="w-12 h-12 bg-gray-50 text-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                            <BookOpen size={24} />
                                                        </div>
                                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No subjects matches</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nested Add Subject Modal */}
                                        <AddSubjectModal 
                                            isOpen={isAddSubjectOpen}
                                            onClose={() => setIsAddSubjectOpen(false)}
                                            programId={programId}
                                            programName={programName}
                                            onSuccess={() => {
                                                // Refresh subject list
                                                const fetchSubjects = async () => {
                                                    try {
                                                        const params = showGlobal ? {} : { program: programId };
                                                        const data = await ProgramService.getSubjects(params);
                                                        setAvailableSubjects(data);
                                                    } catch (e) { console.error(e); }
                                                };
                                                fetchSubjects();
                                            }}
                                        />

                                        {/* Right: Selected Area */}
                                        <div className="w-full lg:w-[350px] bg-gray-50/30 flex flex-col p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Subjects ({selectedSubjects.length})</h4>
                                                {selectedSubjects.length > 0 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setSelectedSubjects([])}
                                                        className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                                {selectedSubjects.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedSubjects.map(subject => (
                                                            <div key={subject.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50 shadow-sm animate-in zoom-in-95 duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-[9px]">
                                                                        {subject.code}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[11px] font-bold text-gray-800 truncate w-[160px]">{subject.title}</p>
                                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{subject.units} Units</p>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleRemoveSubject(subject.id)}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                                        <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-[32px] flex items-center justify-center mb-4">
                                                            <Plus className="text-gray-300" size={24} />
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Queue Empty</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-8 shrink-0">
                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    disabled={loading || selectedSubjects.length === 0}
                                                    className="w-full rounded-2xl py-4 shadow-indigo-100 shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Save size={18} />
                                                            Assign {selectedSubjects.length} Items
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AssignSubjectToCurriculumModal;
