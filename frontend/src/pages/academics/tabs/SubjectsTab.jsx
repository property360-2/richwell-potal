import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Plus, 
    Search, 
    Globe, 
    ShieldAlert, 
    Edit, 
    Trash2, 
    Loader2,
    Filter,
    Link
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';
import AddSubjectModal from '../modals/AddSubjectModal';
import EditSubjectModal from '../modals/EditSubjectModal';
import ConfirmModal from '../../../components/shared/ConfirmModal';

const SubjectsTab = ({ subjects: initialSubjects = [], programId, onUpdate }) => {
    const { success: showSuccess, error: showError } = useToast();
    const [subjects, setSubjects] = useState(initialSubjects);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filter State
    const [programFilter, setProgramFilter] = useState('');
    const [scopeFilter, setScopeFilter] = useState('');
    const [classificationFilter, setClassificationFilter] = useState('');
    
    // Sort State
    const [ordering, setOrdering] = useState('code');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);

    const fetchPrograms = async () => {
        const data = await ProgramService.getPrograms();
        setPrograms(data);
    };

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const params = { 
                search: searchQuery,
                program: programFilter,
                is_global: scopeFilter === 'global' ? 'true' : scopeFilter === 'program' ? 'false' : '',
                is_major: classificationFilter === 'major' ? 'true' : classificationFilter === 'minor' ? 'false' : '',
                ordering: ordering
            };
            
            // Remove empty params
            Object.keys(params).forEach(key => !params[key] && delete params[key]);
            
            const data = await ProgramService.getSubjects(params);
            setSubjects(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load subject catalog.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(fetchSubjects, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, programFilter, scopeFilter, classificationFilter, ordering]);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDestructive: false
    });

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Subject?',
            message: 'Are you sure you want to delete this subject? This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await ProgramService.deleteSubject(id);
                    showSuccess('Subject deleted successfully');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    fetchSubjects(); // Call fetchSubjects to refresh the list
                } catch (err) {
                    console.error(err);
                    showError('Failed to delete subject');
                }
            }
        });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Master Subject Catalog</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Repository of Academic Courses</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                            type="text"
                            placeholder="Search by code or title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full lg:w-80 pl-14 pr-6 py-4 shadow-sm transition-all"
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-8 shadow-indigo-100 shadow-xl flex items-center gap-2 shrink-0"
                    >
                        <Plus size={20} />
                        New Subject
                    </Button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-[24px] border border-gray-100 p-4 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 rounded-xl mr-2">
                    <Filter size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Filters</span>
                </div>

                {/* Program Filter */}
                <select 
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[140px]"
                >
                    <option value="">All Programs</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.code}</option>
                    ))}
                </select>

                {/* Scope Filter */}
                <select 
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <option value="">All Scopes</option>
                    <option value="global">Global Only</option>
                    <option value="program">Program Exclusive</option>
                </select>

                {/* Classification */}
                <select 
                    value={classificationFilter}
                    onChange={(e) => setClassificationFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <option value="">Classification</option>
                    <option value="major">Major Subjects</option>
                    <option value="minor">Minor Subjects</option>
                </select>



                <div className="h-6 w-px bg-gray-100 mx-1"></div>

                {/* Sorting */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sort By:</span>
                    <select 
                        value={ordering}
                        onChange={(e) => setOrdering(e.target.value)}
                        className="bg-white border text-gray-700 text-[11px] font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer border-gray-100"
                    >
                        <option value="code">Code (A-Z)</option>
                        <option value="-code">Code (Z-A)</option>
                        <option value="title">Title (A-Z)</option>
                        <option value="-title">Title (Z-A)</option>
                        <option value="units">Units (Min-Max)</option>
                        <option value="-units">Units (Max-Min)</option>
                        <option value="-created_at">Newest First</option>
                    </select>
                </div>

                {(programFilter || scopeFilter || classificationFilter || searchQuery) && (
                    <button 
                        onClick={() => {
                            setProgramFilter('');
                            setScopeFilter('');
                            setClassificationFilter('');
                            setSearchQuery('');
                            setOrdering('code');
                        }}
                        className="ml-auto text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        Reset All
                    </button>
                )}
            </div>

            {/* Table Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="text-indigo-600 animate-spin mb-4" size={32} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Repository...</p>
                </div>
            ) : subjects.length > 0 ? (
                <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Subject</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Scope</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Prerequisites</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Curricula</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subjects.map((subject) => (
                                <tr key={subject.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="w-fit px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] border border-indigo-100 shadow-sm">
                                                {subject.code}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{subject.title}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">Updated {new Date(subject.updated_at || Date.now()).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {subject.is_global ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                                                <Globe size={10} /> Global / All Programs
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 items-center max-w-[200px]">
                                                {subject.program_codes && subject.program_codes.length > 0 ? (
                                                    subject.program_codes.map(code => (
                                                        <span key={code} className={`px-2 py-1 rounded text-[10px] font-bold border ${code === subject.program_code ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                            {code}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-700">{subject.program_name || subject.program_code}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {subject.prerequisites && subject.prerequisites.length > 0 ? (
                                                subject.prerequisites.map(prereq => (
                                                    <span key={prereq.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold">
                                                        <Link size={8} /> {prereq.code}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-gray-300 font-medium italic">No Prerequisites</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                                            {subject.curriculum_codes && subject.curriculum_codes.length > 0 ? (
                                                subject.curriculum_codes.map(code => (
                                                    <span key={code} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-black tracking-tight">
                                                        {code}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-gray-300 font-medium italic">Not in any curriculum</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-black text-gray-700">{subject.units} Units</span>
                                            {subject.is_major ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                                                    <ShieldAlert size={10} /> Major
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                                                    <BookOpen size={10} /> Minor
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSelectedSubject(subject);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(subject.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200">
                    <div className="p-6 bg-indigo-100 text-indigo-600 rounded-3xl mb-6 shadow-xl shadow-indigo-100 scale-110">
                        <BookOpen size={48} />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Catalog Empty</h4>
                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed font-medium mb-8 text-center">
                        No subjects match your search. Start by adding a new academic course to the institutional master list.
                    </p>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-8 shadow-indigo-100 shadow-xl flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add First Subject
                    </Button>
                </div>
            )}

            {/* Modals */}
            <AddSubjectModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                programId={null} // Master catalog doesn't have a fixed program
                programName="Master List"
                onSuccess={fetchSubjects}
            />

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText="Delete Subject"
            />

            {selectedSubject && (
                <EditSubjectModal 
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedSubject(null);
                    }}
                    subject={selectedSubject}
                    programId={selectedSubject.program_id} // Use the primary program of the subject
                    programName={selectedSubject.program_code}
                    onSuccess={fetchSubjects}
                />
            )}
        </div>
    );
};

export default SubjectsTab;
