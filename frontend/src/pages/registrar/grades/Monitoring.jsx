import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    BookOpen, 
    Search, 
    ChevronRight, 
    ChevronLeft,
    CheckCircle2, 
    Clock, 
    AlertCircle,
    GraduationCap,
    Users,
    Loader2,
    Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import SEO from '../../../components/shared/SEO';
import { api, endpoints } from '../../../api';

const RegistrarGradeMonitoring = () => {
    const { error } = useToast();
    const navigate = useNavigate();
    
    // Drill-down State
    const [view, setView] = useState('programs'); // programs -> sections -> subjects -> student_grades
    const [path, setPath] = useState([]); // [{id, label}]
    
    // Data State
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selection, setSelection] = useState({
        program: null,
        section: null,
        subject: null
    });

    useEffect(() => {
        fetchViewData();
    }, [view, selection]);

    const fetchViewData = async () => {
        try {
            setLoading(true);
            let endpoint = '';
            
            if (view === 'programs') {
                endpoint = '/api/v1/academic/programs/';
            } else if (view === 'sections') {
                endpoint = `/api/v1/academic/sections/?program=${selection.program.id}`;
            } else if (view === 'subjects') {
                endpoint = `/api/v1/enrollment/registrar/sections/${selection.section.id}/subjects/`;
            } else if (view === 'student_grades') {
                endpoint = `/api/v1/grading/students/?section_subject=${selection.subject.id}`;
            }

            const res = await fetch(endpoint);
            if (res.ok) {
                const json = await res.json();
                setData(json.results || json.data || json || []);
            }
        } catch (err) {
            error('Inquiry failed. Synchronizing with academic server...');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (view === 'sections') setView('programs');
        if (view === 'subjects') setView('sections');
        if (view === 'student_grades') setView('subjects');
        setPath(prev => prev.slice(0, -1));
    };

    const selectProgram = (p) => {
        setSelection(prev => ({ ...prev, program: p }));
        setPath([{ id: p.id, label: p.code }]);
        setView('sections');
        setSearchTerm('');
    };

    const selectSection = (s) => {
        setSelection(prev => ({ ...prev, section: s }));
        setPath(prev => [...prev, { id: s.id, label: s.name }]);
        setView('subjects');
        setSearchTerm('');
    };

    const selectSubject = (sub) => {
        setSelection(prev => ({ ...prev, subject: sub }));
        setPath(prev => [...prev, { id: sub.id, label: sub.subject_code }]);
        setView('student_grades');
        setSearchTerm('');
    };

    const filtered = data.filter(item => {
        const query = searchTerm.toLowerCase();
        if (view === 'programs') return item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
        if (view === 'sections') return item.name.toLowerCase().includes(query);
        if (view === 'subjects') return item.subject_code.toLowerCase().includes(query) || item.subject_title.toLowerCase().includes(query);
        if (view === 'student_grades') return item.full_name.toLowerCase().includes(query) || item.student_number?.toLowerCase().includes(query);
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Grade Monitoring" description="Institutional grade submission tracking and compliance monitoring." />
            {/* Navigation & Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-4">
                    {view !== 'programs' && (
                        <button 
                            onClick={handleBack}
                            className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all shadow-inner"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Grade Monitoring</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Registry</span>
                            {path.map((p, idx) => (
                                <React.Fragment key={p.id}>
                                    <ChevronRight className="w-3 h-3 text-gray-200" />
                                    <span className="text-blue-600 font-black uppercase tracking-widest text-[10px]">{p.label}</span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-10 flex gap-6 items-center">
                <div className="relative group flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder={`Search ${view}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-lg font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                    />
                </div>
                {view === 'student_grades' && (
                    <div className="hidden md:flex items-center gap-3 px-8 py-4 bg-blue-50/50 rounded-[24px] border border-blue-100">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Section Analytics Active</span>
                    </div>
                )}
            </div>

            {/* Data Drill-down */}
            {loading ? (
                <div className="py-24 flex justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {view === 'programs' && filtered.map(p => (
                        <CardItem 
                            key={p.id}
                            title={p.code}
                            subtitle={p.name}
                            icon={GraduationCap}
                            meta={`${p.duration_years} Years`}
                            onClick={() => selectProgram(p)}
                        />
                    ))}
                    {view === 'sections' && filtered.map(s => (
                        <CardItem 
                            key={s.id}
                            title={s.name}
                            subtitle={`Year ${s.year_level}`}
                            icon={BookOpen}
                            meta={`${s.enrolled_count || 0} Students`}
                            onClick={() => selectSection(s)}
                        />
                    ))}
                    {view === 'subjects' && filtered.map(sub => (
                        <CardItem 
                            key={sub.id}
                            title={sub.subject_code}
                            subtitle={sub.subject_title}
                            icon={BarChart3}
                            meta={sub.status}
                            status={sub.status === 'Submitted' ? 'success' : 'warning'}
                            onClick={() => selectSubject(sub)}
                        />
                    ))}
                    {view === 'student_grades' && (
                        <div className="col-span-full">
                            <GradeTable students={filtered} />
                        </div>
                    )}
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <div className="py-24 text-center opacity-20">
                    <Filter className="w-20 h-20 mx-auto mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No results found in this drill-down level</p>
                </div>
            )}
        </div>
    );
};

const CardItem = ({ title, subtitle, icon: Icon, meta, status, onClick }) => (
    <div 
        onClick={onClick}
        className="group p-8 bg-white border border-gray-100 rounded-[40px] transition-all hover:shadow-2xl hover:border-blue-100 cursor-pointer flex flex-col justify-between min-h-[220px]"
    >
        <div className="flex justify-between items-start">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                <Icon className="w-6 h-6" />
            </div>
            {status && (
                <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border-2
                    ${status === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {meta}
                </span>
            )}
        </div>
        <div className="mt-6">
            <h4 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">{title}</h4>
            <p className="text-xs font-bold text-gray-400 line-clamp-2 leading-relaxed">{subtitle}</p>
        </div>
        {!status && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{meta}</span>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:translate-x-1 transition-all" />
            </div>
        )}
    </div>
);

const GradeTable = ({ students }) => (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-gray-50/50">
                <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Grade</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Remarks</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-5">
                            <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{s.full_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.student_number}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border-2
                                ${s.is_finalized ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {s.is_finalized ? 'Finalized' : 'Draft'}
                            </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                            <span className={`text-sm font-black ${parseFloat(s.current_grade) > 3.0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                {s.current_grade || '--'}
                            </span>
                        </td>
                        <td className="px-8 py-5 text-xs text-gray-400 font-bold truncate max-w-[200px]">
                            {s.current_remarks || 'No remarks recorded'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default RegistrarGradeMonitoring;
