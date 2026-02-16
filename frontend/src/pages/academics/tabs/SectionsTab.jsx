import React, { useState, useEffect } from 'react';
import { 
    Layers, 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Loader2,
    Filter,
    Users,
    Calendar,
    BookOpen
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { SectionService } from '../services/SectionService';
import { ProgramService } from '../services/ProgramService';
import { useToast } from '../../../context/ToastContext';
import AddSectionModal from '../modals/AddSectionModal';
import EditSectionModal from '../modals/EditSectionModal';

const SectionsTab = () => {
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
            const activeSem = semData.find(s => s.is_active);
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

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this section?')) return;
        
        try {
            await SectionService.deleteSection(id);
            showSuccess('Section deleted successfully');
            fetchSections();
        } catch (err) {
            showError('Failed to delete section');
        }
    };

    const openEditModal = (section) => {
        setSelectedSection(section);
        setIsEditModalOpen(true);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-[22px] flex items-center justify-center shadow-lg shadow-indigo-100 rotate-3">
                        <Layers className="text-white -rotate-3" size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Section Management</h2>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Academic Administration</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search section name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border-2 border-gray-100 text-gray-700 text-sm font-bold rounded-[20px] pl-12 pr-6 py-3.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-full md:w-[320px] shadow-sm"
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-[20px] px-8 py-4 h-auto shadow-xl shadow-indigo-100 flex items-center gap-2 group"
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
                            {s.academic_year} - {s.semester === 3 ? 'SUMMER' : `${s.semester}${s.semester === 1 ? 'ST' : 'ND'} SEM`}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map(section => (
                        <div key={section.id} className="group bg-white rounded-[32px] border border-gray-100 p-8 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden">
                            {/* Decorative Background Element */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100/50 transition-colors"></div>
                            
                            <div className="relative flex flex-col h-full">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{section.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">
                                                    Year {section.year_level}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {section.program_code || (section.program && section.program.code)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openEditModal(section)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(section.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-gray-50">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <Users size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Enrollment</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-700">
                                            {section.student_count || 0} / <span className="text-gray-400">{section.capacity || 40}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <div className="flex items-center gap-1.5 text-gray-400 justify-end">
                                            <BookOpen size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Subjects</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-700">
                                            {section.subject_count || (section.section_subjects ? section.section_subjects.length : 0)} Active
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Calendar size={14} />
                                        <span className="text-[10px] font-bold">
                                            {section.semester_name || (section.semester && section.semester.academic_year)}
                                        </span>
                                    </div>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
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

