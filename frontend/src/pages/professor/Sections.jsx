import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Users, 
    Clock, 
    MapPin, 
    Loader2, 
    ChevronDown, 
    Calendar,
    Award,
    ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import SEO from '../../components/shared/SEO';
import ProfessorLayout from './ProfessorLayout';
import ProfessorService from './services/ProfessorService';

const ProfessorSections = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { error } = useToast();

    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState(null);
    const [assignedSections, setAssignedSections] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        try {
            const data = await api.get(endpoints.semesters);
            const semList = data.results || data || [];
            setSemesters(semList);

            const current = semList.find(s => s.is_current) || semList[0];
            if (current) {
                setSelectedSemesterId(current.id);
                fetchSections(current.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            error('Failed to load semesters');
            setLoading(false);
        }
    };

    const fetchSections = async (semesterId) => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await ProfessorService.getDashboardData(user.id, semesterId);
            if (data) {
                setAssignedSections(data.assigned_sections || []);
            }
        } catch (err) {
            error('Failed to load sections');
        } finally {
            setLoading(false);
        }
    };

    const handleSemesterChange = (id) => {
        setSelectedSemesterId(id);
        fetchSections(id);
    };

    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);

    return (
        <ProfessorLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
                <SEO title="My Sections" description="All assigned sections and teaching load." />
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">My Sections</h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                            {selectedSemester ? `${selectedSemester.name} ${selectedSemester.academic_year}` : 'Teaching Load Overview'}
                        </p>
                    </div>

                    <div className="w-full md:w-64 relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"><Calendar className="w-4 h-4" /></div>
                        <select 
                            value={selectedSemesterId || ''}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                        >
                            {semesters.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.academic_year}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><ChevronDown className="w-4 h-4" /></div>
                    </div>
                </div>

                {/* Summary Stats */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <StatCard label="Sections" value={assignedSections.length} icon={BookOpen} />
                        <StatCard label="Total Students" value={assignedSections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0)} icon={Users} />
                        <StatCard label="Total Units" value={assignedSections.reduce((sum, s) => sum + (s.units || 0), 0)} icon={Award} />
                        <StatCard 
                            label="Unique Subjects" 
                            value={new Set(assignedSections.map(s => s.subject_code)).size} 
                            icon={BookOpen} 
                        />
                    </div>
                )}

                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : assignedSections.length === 0 ? (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-16 text-center">
                        <div className="opacity-20">
                            <BookOpen className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No sections assigned for this term</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {assignedSections.map((section) => (
                            <div 
                                key={section.id}
                                className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all group"
                            >
                                {/* Subject Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-blue-600 text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                            {section.subject_code?.slice(0, 3)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 tracking-tight">{section.subject_code}</h3>
                                            <p className="text-xs font-bold text-gray-400 line-clamp-1">{section.subject_title}</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                        {section.units || 0} Units
                                    </span>
                                </div>

                                {/* Section Details */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[11px] font-bold">{section.section_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[11px] font-bold">{section.enrolled_count || 0} enrolled students</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-gray-500">
                                        <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                        <span className="text-[11px] font-bold leading-relaxed">{section.schedule || 'TBA'}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-6 border-t border-gray-50">
                                    <button 
                                        onClick={() => navigate('/professor/grades')}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                                    >
                                        <Award className="w-3.5 h-3.5" />
                                        Grade Students
                                    </button>
                                    <button 
                                        onClick={() => navigate('/professor/schedule')}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProfessorLayout>
    );
};

const StatCard = ({ label, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg shadow-blue-500/5">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-600" />
            </div>
        </div>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

export default ProfessorSections;
