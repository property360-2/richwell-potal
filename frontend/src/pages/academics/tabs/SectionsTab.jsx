import React, { useState, useEffect } from 'react';
import { 
    Layers, 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Loader2,
    Filter,
    Calendar
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import ConfirmModal from '../../../components/shared/ConfirmModal';
import { SectionService } from '../services/SectionService';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';
import AddSectionModal from '../modals/AddSectionModal';
import EditSectionModal from '../modals/EditSectionModal';

const SectionsTab = ({ programId, onUpdate }) => {
    const { success: showSuccess, error: showError } = useToast();
    const [sections, setSections] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('');
    const [yearLevelFilter, setYearLevelFilter] = useState('');
    
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);

    const fetchData = async () => {
        try {
            const [progData, semData] = await Promise.all([
                ProgramService.getPrograms(),
                SectionService.getSemesters()
            ]);
            setPrograms(progData);
            setSemesters(semData);
            
            // Set active semester as default if available
            const activeSem = semData.find(s => s.is_current);
            if (activeSem) setSemesterFilter(activeSem.id);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSections = async () => {
        setLoading(true);
        try {
            const params = {
                search: searchQuery,
                program: programFilter,
                semester: semesterFilter,
                year_level: yearLevelFilter
            };
            
            // Remove empty params
            Object.keys(params).forEach(key => !params[key] && delete params[key]);
            
            const data = await SectionService.getSections(params);
            setSections(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load academic sections.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(fetchSections, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, programFilter, semesterFilter, yearLevelFilter]);

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
            title: 'Delete Section?',
            message: 'Are you sure you want to delete this section? This might affect enrolled students.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await SectionService.deleteSection(id); // Changed from ProgramService.deleteSection
                    showSuccess('Section deleted successfully'); // Changed from success
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    fetchSections(); // Changed from if (onUpdate) onUpdate();
                } catch (err) {
                    console.error(err);
                    showError('Failed to delete section'); // Changed from error
                }
            }
        });
    };

    const openEditModal = (section) => {
        setSelectedSection(section);
        setIsEditModalOpen(true);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <Layers size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Section Management</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Repository of Academic Sections</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search section name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full lg:w-80 pl-12 pr-6 py-4 shadow-sm transition-all outline-none"
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-8 py-4 h-auto shadow-xl shadow-indigo-100 flex items-center gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white transition-all group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-black uppercase tracking-widest text-[11px]">New Section</span>
                    </Button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-5 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2.5 px-4 py-2.5 text-indigo-600 bg-indigo-50 rounded-2xl mr-2">
                    <Filter size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest leading-none">Filters</span>
                </div>

                {/* Semester Filter */}
                <select 
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[180px]"
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.academic_year} - {s.name}
                        </option>
                    ))}
                </select>

                {/* Program Filter */}
                <select 
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[160px]"
                >
                    <option value="">All Programs</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.code}</option>
                    ))}
                </select>

                {/* Year Level */}
                <select 
                    value={yearLevelFilter}
                    onChange={(e) => setYearLevelFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <option value="">Year Level</option>
                    {[1, 2, 3, 4, 5].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                    ))}
                </select>

                {/* Reset */}
                {(searchQuery || programFilter || semesterFilter || yearLevelFilter) && (
                    <button 
                        onClick={() => {
                            setSearchQuery('');
                            setProgramFilter('');
                            setSemesterFilter('');
                            setYearLevelFilter('');
                        }}
                        className="ml-auto text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest px-5 py-3 hover:bg-indigo-50 rounded-2xl transition-all"
                    >
                        Reset All
                    </button>
                )}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm">
                    <Loader2 className="text-indigo-600 animate-spin mb-4" size={48} />
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading sections...</p>
                </div>
            ) : sections.length > 0 ? (
                <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Section Name</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Program & Year</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Semester</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Enrollment</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Subjects</th>
                                <th className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.map(section => (
                                <tr key={section.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                <Layers size={20} />
                                            </div>
                                            <span className="font-black text-gray-900 text-sm">{section.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900">{section.program_code || (section.program && section.program.code)}</span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Year {section.year_level}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar size={14} />
                                            <span className="text-xs font-bold">
                                                {section.semester_name || (section.semester && section.semester.academic_year)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                                            {section.student_count || 0} / {section.capacity || 40}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                                            {section.subject_count || (section.section_subjects ? section.section_subjects.length : 0)}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2 text-gray-300 opacity-60 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => openEditModal(section)}
                                                className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit Section"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(section.id)}
                                                className="p-2 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Section"
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
                    <div className="p-6 bg-white rounded-[24px] shadow-sm mb-6">
                        <Layers size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">No Sections Found</h3>
                    <p className="text-gray-500 text-sm font-medium mb-8">Try adjusting your filters or create a new section.</p>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-10 shadow-lg shadow-indigo-100"
                    >
                        Create Your First Section
                    </Button>
                </div>
            )}

            {/* Modals */}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText="Delete Section"
            />
            {isAddModalOpen && (
                <AddSectionModal 
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchSections();
                        showSuccess('Section created successfully!');
                    }}
                    programs={programs}
                    semesters={semesters}
                />
            )}
            
            {/* Edit Section Modal logic was fine outside the deleted block */}


            {isEditModalOpen && selectedSection && (
                <EditSectionModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        fetchSections();
                        showSuccess('Section updated successfully!');
                    }}
                    section={selectedSection}
                    programs={programs}
                    semesters={semesters}
                />
            )}
        </div>
    );
};

export default SectionsTab;

