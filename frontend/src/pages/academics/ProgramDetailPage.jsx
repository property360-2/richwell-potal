import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    BookOpen, 
    Layers, 
    ClipboardList, 
    AlertTriangle, 
    ArrowLeft, 
    Calendar,
    Clock,
    CheckCircle2,
    Loader2,
    Edit,
    Trash2,
    Globe,
    ShieldAlert,
    Link,
    Search
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { ProgramService } from './services/ProgramService';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/shared/SEO';
import AddSubjectModal from './modals/AddSubjectModal';
import EditSubjectModal from './modals/EditSubjectModal';
import CurriculumTab from './tabs/CurriculumTab';

const ProgramDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subjects');
    const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
    const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    
    // Filtering State for subjects list
    const [subjectSearch, setSubjectSearch] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [semFilter, setSemFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [subjOrdering, setSubjOrdering] = useState('year-sem-code');

    useEffect(() => {
        const fetchProgramDetail = async () => {
            setLoading(true);
            try {
                const data = await ProgramService.getProgramDetail(id);
                setProgram(data);
            } catch (err) {
                console.error(err);
                showError('Failed to load program details.');
                navigate('/academics', { state: { activeTab: 'programs' } });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProgramDetail();
        }
    }, [id, navigate, showError]);

    const handleSubjectSuccess = () => {
        // Reload program data to reflect new subject count/list
        const fetchProgramDetail = async () => {
            try {
                const data = await ProgramService.getProgramDetail(id);
                setProgram(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchProgramDetail();
    };

    const handleDeleteSubject = async (subjectId) => {
        if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) return;
        
        try {
            await ProgramService.deleteSubject(subjectId);
            showSuccess('Subject deleted successfully');
            handleSubjectSuccess();
        } catch (err) {
            console.error(err);
            showError('Failed to delete subject');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Program details...</p>
            </div>
        );
    }

    if (!program) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <SEO title={`${program.code} - Program Detail`} />

            {/* Breadcrumbs / Back button */}
            <div className="mb-8">
                <button 
                    onClick={() => navigate('/academics', { state: { activeTab: 'programs' } })}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-black uppercase tracking-widest text-[10px]"
                >
                    <ArrowLeft size={16} />
                    Back to Programs
                </button>
            </div>

            {/* Hero Header */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-indigo-500/5 p-10 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {program.code}
                                </span>
                                {program.is_active ? (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Active
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 leading-tight tracking-tight mb-2">
                                {program.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6 text-gray-500 text-sm font-bold lowercase tracking-normal">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-400" />
                                    <span>{program.duration_years} Years Duration</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-400" />
                                    <span>Added {new Date(program.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-50 max-w-3xl relative z-10">
                    <p className="text-gray-500 leading-relaxed font-medium italic">
                        {program.description || 'No description provided for this academic program.'}
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-indigo-500/5 overflow-hidden">
                {/* Top Tabs Navigation */}
                <div className="flex border-b border-gray-100 bg-gray-50/30">
                    <button
                        onClick={() => setActiveTab('subjects')}
                        className={`flex-1 flex items-center justify-center gap-3 py-6 transition-all border-b-4 ${
                            activeTab === 'subjects'
                                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                    >
                        <BookOpen size={20} />
                        <span className="font-black uppercase tracking-widest text-xs">Subjects Catalog</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('curriculum')}
                        className={`flex-1 flex items-center justify-center gap-3 py-6 transition-all border-b-4 ${
                            activeTab === 'curriculum'
                                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                    >
                        <Layers size={20} />
                        <span className="font-black uppercase tracking-widest text-xs">Curriculum Structure</span>
                    </button>
                </div>

                {/* Tab Content View */}
                <div className="p-10 min-h-[500px]">
                    {activeTab === 'subjects' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900">Program Subjects</h2>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Master Subject Catalog</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="primary" 
                                    onClick={() => setIsAddSubjectOpen(true)}
                                    className="rounded-2xl px-8 shadow-indigo-100 shadow-xl"
                                >
                                    Add Subject
                                </Button>
                            </div>

                            {/* Filters Row */}
                            <div className="bg-gray-50/50 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4 border border-gray-100">
                                <div className="relative flex-grow md:max-w-xs group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Search subjects..."
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-[11px] font-bold rounded-xl pl-11 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                                    />
                                </div>

                                <select 
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="">Year Level</option>
                                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                                </select>

                                <select 
                                    value={semFilter}
                                    onChange={(e) => setSemFilter(e.target.value)}
                                    className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="">Semester</option>
                                    <option value="1">1st Semester</option>
                                    <option value="2">2nd Semester</option>
                                    <option value="3">Summer</option>
                                </select>

                                <select 
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                    className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="">Category</option>
                                    <option value="major">Major</option>
                                    <option value="minor">Minor</option>
                                </select>

                                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                                <select 
                                    value={subjOrdering}
                                    onChange={(e) => setSubjOrdering(e.target.value)}
                                    className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm ml-auto"
                                >
                                    <option value="year-sem-code">Default Order</option>
                                    <option value="title">Title (A-Z)</option>
                                    <option value="code">Code (A-Z)</option>
                                    <option value="units-desc">Units (High-Low)</option>
                                </select>

                                {(subjectSearch || yearFilter || semFilter || classFilter) && (
                                    <button 
                                        onClick={() => {
                                            setSubjectSearch('');
                                            setYearFilter('');
                                            setSemFilter('');
                                            setClassFilter('');
                                        }}
                                        className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {program.subjects && program.subjects.length > 0 ? (
                                <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Subject</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Prerequisites</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Curricula & Sharing</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Details</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {program.subjects
                                                .filter(s => {
                                                    const matchesSearch = s.title.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                                                                        s.code.toLowerCase().includes(subjectSearch.toLowerCase());
                                                    const matchesYear = !yearFilter || s.year_level === parseInt(yearFilter);
                                                    const matchesSem = !semFilter || s.semester_number === parseInt(semFilter);
                                                    const matchesClass = !classFilter || (classFilter === 'major' ? s.is_major : !s.is_major);
                                                    return matchesSearch && matchesYear && matchesSem && matchesClass;
                                                })
                                                .sort((a, b) => {
                                                    if (subjOrdering === 'title') return a.title.localeCompare(b.title);
                                                    if (subjOrdering === 'code') return a.code.localeCompare(b.code);
                                                    if (subjOrdering === 'units-desc') return b.units - a.units;
                                                    
                                                    // Default: Year -> Sem -> Code
                                                    if (a.year_level !== b.year_level) return a.year_level - b.year_level;
                                                    if (a.semester_number !== b.semester_number) return a.semester_number - b.semester_number;
                                                    return a.code.localeCompare(b.code);
                                                })
                                                .map((subject) => (
                                                <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="w-fit px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] border border-indigo-100 shadow-sm">
                                                                {subject.code}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{subject.title}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Year {subject.year_level} • Sem {subject.semester_number}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                            {subject.prerequisites && subject.prerequisites.length > 0 ? (
                                                                subject.prerequisites.map(prereq => (
                                                                    <span key={prereq.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-bold">
                                                                        <Link size={8} /> {prereq.code}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[9px] text-gray-300 font-medium italic uppercase tracking-tighter">No Prerequisites</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-2">
                                                            {/* Curricula */}
                                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                                {subject.curriculum_codes && subject.curriculum_codes.length > 0 ? (
                                                                    subject.curriculum_codes.map(code => (
                                                                        <span key={code} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[8px] font-black tracking-tighter uppercase">
                                                                            {code}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[9px] text-gray-300 font-medium italic uppercase tracking-tighter">Not in curriculum</span>
                                                                )}
                                                            </div>
                                                            {/* Sharing */}
                                                            <div className="flex items-center gap-1.5">
                                                                {subject.is_global ? (
                                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 text-[8px] font-black uppercase">
                                                                        <Globe size={8} /> Global
                                                                    </span>
                                                                ) : subject.program_codes && subject.program_codes.filter(c => c !== program.code).length > 0 && (
                                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                                                                        Shared With: {subject.program_codes.filter(c => c !== program.code).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <span className="text-xs font-black text-gray-700">{subject.units} Units</span>
                                                            {subject.is_major ? (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                                                    <ShieldAlert size={8} /> Major
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                                                    <BookOpen size={8} /> Minor
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedSubject(subject);
                                                                    setIsEditSubjectOpen(true);
                                                                }}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                title="Edit Subject"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteSubject(subject.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Delete Subject"
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
                                <div className="flex flex-col items-center justify-center h-full py-24 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-200">
                                    <div className="p-5 bg-amber-100 text-amber-600 rounded-3xl mb-6 shadow-xl shadow-amber-100 scale-110">
                                        <ClipboardList size={48} />
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No Subjects Found</h4>
                                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed font-medium">
                                        This program doesn't have any subjects assigned yet. Click "Add Subject" to begin building the curriculum.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'curriculum' && (
                        <CurriculumTab program={program} />
                    )}
                </div>
            </div>
            <AddSubjectModal 
                isOpen={isAddSubjectOpen}
                onClose={() => setIsAddSubjectOpen(false)}
                programId={id}
                programName={program.name}
                onSuccess={handleSubjectSuccess}
            />

            <EditSubjectModal 
                isOpen={isEditSubjectOpen}
                onClose={() => {
                    setIsEditSubjectOpen(false);
                    setSelectedSubject(null);
                }}
                subject={selectedSubject}
                programId={id}
                programName={program.name}
                onSuccess={handleSubjectSuccess}
            />
        </div>
    );
};

export default ProgramDetailPage;
