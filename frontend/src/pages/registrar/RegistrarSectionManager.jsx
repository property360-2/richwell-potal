import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Users, 
    Plus, 
    Calendar, 
    Search, 
    Filter, 
    MoreVertical, 
    ChevronRight,
    Loader2,
    BookOpen,
    UserCheck,
    LayoutGrid,
    Grid3X3,
    ArrowLeft
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import SectionModal from './SectionModal';
import { api, endpoints } from '../../api';

const RegistrarSectionManager = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [activeSemester, setActiveSemester] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    // Filter state
    const selectedSemesterId = searchParams.get('semester');
    const searchTerm = searchParams.get('q') || '';

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeSemester) {
            fetchSections();
        }
    }, [activeSemester, searchTerm]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/academic/semesters/');
            if (res.ok) {
                const data = await res.json();
                const list = data.semesters || data || [];
                setSemesters(list);
                
                // Set initial active semester from URL or current
                const fromUrl = list.find(s => s.id.toString() === selectedSemesterId);
                const current = list.find(s => s.is_current);
                setActiveSemester(fromUrl || current || list[0]);
            }
        } catch (err) {
            error('Failed to sync management data');
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        if (!activeSemester) return;
        try {
            let url = `/api/v1/academic/sections/?semester=${activeSemester.id}`;
            if (searchTerm) url += `&search=${searchTerm}`;
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSections(data.results || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch sections', err);
        }
    };

    const handleSemesterChange = (id) => {
        const selected = semesters.find(s => s.id.toString() === id);
        setActiveSemester(selected);
        setSearchParams({ semester: id });
    };

    const handleSearch = (val) => {
        const newParams = new URLSearchParams(searchParams);
        if (val) newParams.set('q', val);
        else newParams.delete('q');
        setSearchParams(newParams);
    };

    const openAdd = () => {
        setEditingSection(null);
        setIsModalOpen(true);
    };

    const getYearBadge = (year) => {
        const themes = {
            1: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            2: 'bg-blue-50 text-blue-600 border-blue-100',
            3: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            4: 'bg-rose-50 text-rose-600 border-rose-100'
        };
        return themes[year] || 'bg-gray-50 text-gray-600 border-gray-100';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Section Manager" description="Institutional class orchestration and student distribution." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Section Manager</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Class Orchestration & Logistics</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Button variant="secondary" icon={Grid3X3} onClick={() => navigate('/registrar/sections/schedule')}>
                        MASTER SCHEDULE
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={openAdd}>
                        CREATE SECTION
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-8 flex flex-col md:flex-row gap-4">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by section name..." 
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                    />
                </div>
                <select 
                    className="md:w-64 px-6 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer"
                    value={activeSemester?.id || ''}
                    onChange={(e) => handleSemesterChange(e.target.value)}
                >
                    {semesters.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name} {s.academic_year} {s.is_current ? '• ACTIVE' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map((section) => (
                        <div 
                            key={section.id} 
                            onClick={() => navigate(`/registrar/sections/${section.id}`)}
                            className="group relative bg-white border border-gray-100 rounded-[40px] p-8 transition-all hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-100 cursor-pointer overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${getYearBadge(section.year_level)}`}>
                                    Year {section.year_level}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">
                                    {section.name}
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                    {section.program_code || section.program?.code} • {section.semester_name || activeSemester?.name}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-50">
                                <div className="text-center">
                                    <p className="text-xl font-black text-gray-900 leading-none">{section.enrolled_count || 0}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase mt-1">Students</p>
                                </div>
                                <div className="text-center border-x border-gray-50">
                                    <p className="text-xl font-black text-gray-900 leading-none">{section.capacity || 40}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase mt-1">CAPACITY</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black text-gray-900 leading-none">{section.subject_count || 0}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase mt-1">LOAD</p>
                                </div>
                            </div>

                            {/* Hover Action */}
                            <div className="absolute bottom-4 right-8 translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                <span className="flex items-center gap-1 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                                    Manage <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    ))}
                    {sections.length === 0 && (
                        <div className="lg:col-span-3 py-20 text-center bg-white rounded-[40px] border border-gray-100 shadow-sm">
                            <LayoutGrid className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">No sections configured</h3>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Initialize sections for the current academic term</p>
                        </div>
                    )}
                </div>
            )}

            <SectionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                section={editingSection}
                semester={activeSemester}
                onSuccess={fetchSections}
            />
        </div>
    );
};

export default RegistrarSectionManager;
