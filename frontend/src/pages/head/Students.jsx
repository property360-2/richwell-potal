import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    Filter,
    Loader2,
    Users,
    GraduationCap,
    BookOpen,
    ArrowUpRight,
    Calendar,
    Phone,
    Mail,
    UserCheck,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const HeadStudents = () => {
    const { user } = useAuth();
    const { error } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('ALL');

    useEffect(() => {
        initData();
    }, []);

    const initData = async () => {
        try {
            setLoading(true);
            const [studentData, programData] = await Promise.all([
                HeadService.getStudents(),
                HeadService.getPrograms()
            ]);
            setStudents(studentData);
            setPrograms(programData);
        } catch (err) {
            console.error('Failed to load students:', err);
            error('Failed to load student directory');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = 
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.student_number?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (selectedProgram === 'ALL') return matchesSearch;
            return matchesSearch && s.program_code === selectedProgram;
        });
    }, [students, searchTerm, selectedProgram]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Student Directory" description="Explore enrolled students across your assigned programs." />
            
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Student Directory
                        <span className="text-indigo-600/20"><Users className="w-9 h-9" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <UserCheck className="w-3 h-3 text-indigo-500" />
                        Academic Oversight System • Enrolled Students
                    </p>
                </div>
                
                <div className="flex items-center gap-4 w-full lg:w-auto mt-4 lg:mt-0">
                    <div className="bg-white px-6 py-3 rounded-[24px] border border-gray-100 shadow-xl shadow-indigo-500/5 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Students</p>
                            <p className="text-xl font-black tracking-tighter text-indigo-600">{filteredStudents.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-2xl shadow-indigo-500/5 mb-8 flex flex-col md:flex-row items-center gap-4">
                {/* Search */}
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search students by name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                </div>

                {/* Program Filter */}
                {(user?.role === 'ADMIN' || (user?.role === 'DEPARTMENT_HEAD' && user?.department_head_profile?.program_details?.length > 1)) && (
                    <div className="relative group w-full md:w-64">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <select 
                            aria-label="Filter by Program"
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Programs</option>
                            {(user?.role === 'ADMIN' ? programs : (user?.department_head_profile?.program_details || [])).map(p => (
                                <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Directory Table */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-500/5 pb-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Student</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Academic Info</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Contact & Joined</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Path</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center opacity-40">
                                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No students found matching your criteria</p>
                                    </td>
                                </tr>
                            ) : filteredStudents.map((s) => (
                                <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-black border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                {s.first_name.charAt(0)}{s.last_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">
                                                    {s.first_name} {s.last_name}
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {s.student_number}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg w-fit border border-gray-100">{s.program_code}</span>
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                                <BookOpen className="w-3 h-3" /> Year {s.year_level}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" /> {s.user?.email || 'N/A'}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" /> Enrolled: {new Date(s.user?.date_joined || Date.now()).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {s.enrollment_type ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                                <GraduationCap className="w-3 h-3" /> {s.enrollment_type}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-300 uppercase">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {s.status === 'ACTIVE' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100 mx-auto">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 mx-auto">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {s.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HeadStudents;
