import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    Search, 
    Filter, 
    Plus, 
    MoreVertical, 
    Eye, 
    Edit, 
    Trash2, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Users,
    ArrowUpDown
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import SEO from '../../../components/shared/SEO';
import AddStudentModal from './modals/AddStudentModal';

const RegistrarStudentMasterlist = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { success, error, warning } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        currentPage: parseInt(searchParams.get('page')) || 1
    });

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        program: searchParams.get('program') || ''
    });

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('action') === 'add');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [pagination.currentPage, searchParams]);

    const fetchInitialData = async () => {
        try {
            const res = await fetch('/api/v1/academic/programs/');
            if (res.ok) {
                const data = await res.json();
                setPrograms(data.results || data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                page: pagination.currentPage,
                search: filters.search,
                program: filters.program
            }).toString();

            const res = await fetch(`/api/v1/registrar/students/?${query}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.results || []);
                setPagination(prev => ({
                    ...prev,
                    count: data.count,
                    next: data.next,
                    previous: data.previous
                }));
            } else {
                error('Failed to load students');
            }
        } catch (err) {
            error('Network error while fetching students');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        const newParams = new URLSearchParams(searchParams);
        if (value) newParams.set(key, value);
        else newParams.delete(key);
        newParams.set('page', '1');
        setSearchParams(newParams);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, currentPage: newPage }));
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', newPage.toString());
        setSearchParams(newParams);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'text-green-600 bg-green-50 border-green-100';
            case 'INACTIVE': return 'text-red-600 bg-red-50 border-red-100';
            case 'GRADUATED': return 'text-purple-600 bg-purple-50 border-purple-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Student Masterlist" description="Comprehensive archive of institutional student records and profiles." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Student Management</h1>
                    </div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-1">Archive & Masterlist</p>
                </div>
                <Button 
                    variant="primary" 
                    icon={Plus} 
                    onClick={() => setIsAddModalOpen(true)}
                >
                    ADD STUDENT
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-8 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest flex items-center gap-2">
                        <Search className="w-3 h-3" /> Quick Search
                    </label>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Name or Student Number..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-blue-100 transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest flex items-center gap-2">
                        <Filter className="w-3 h-3" /> Academic Program
                    </label>
                    <select 
                        value={filters.program}
                        onChange={(e) => handleFilterChange('program', e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-black text-gray-900 focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">All Programs</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                    </select>
                </div>
                <Button 
                    variant="secondary" 
                    className="h-[60px] px-8"
                    onClick={() => {
                        setFilters({ search: '', program: '' });
                        setSearchParams({});
                    }}
                >
                    RESET
                </Button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Info</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Year</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronizing Records...</p>
                                    </td>
                                </tr>
                            ) : students.length > 0 ? (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                                    {student.last_name[0]}{student.first_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm leading-tight">{student.last_name}, {student.first_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{student.student_number || 'NO STUDENT ID'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
                                                {student.program_code || student.program?.code}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-gray-600 text-sm">
                                            {student.year_level}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(student.status)}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => navigate(`/registrar/students/${student.id}`)} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all">
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold italic">No students found matching your criteria</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.count > 0 && (
                    <div className="bg-gray-50/50 px-8 py-6 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Showing <span className="text-gray-900">{students.length}</span> of <span className="text-gray-900">{pagination.count}</span> Students
                        </p>
                        <div className="flex gap-2">
                            <button 
                                disabled={!pagination.previous}
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-50 hover:border-blue-200 hover:text-blue-600 transition-all font-black text-xs flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> PREV
                            </button>
                            <button 
                                disabled={!pagination.next}
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-50 hover:border-blue-200 hover:text-blue-600 transition-all font-black text-xs flex items-center gap-2"
                            >
                                NEXT <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} programs={programs} onSuccess={fetchStudents} />
        </div>
    );
};

export default RegistrarStudentMasterlist;
