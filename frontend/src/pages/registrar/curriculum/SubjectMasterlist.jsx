import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Book, 
    Plus, 
    Search, 
    Edit2, 
    Trash2, 
    FileText, 
    ChevronRight,
    Loader2,
    Filter,
    Layers,
    Download
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import SEO from '../../../components/shared/SEO';
import SubjectModal from './modals/SubjectModal';
import { api, endpoints } from '../../../api';

const RegistrarSubjectMasterlist = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    // Filters from URL
    const selectedProgram = searchParams.get('program') || '';
    const searchTerm = searchParams.get('q') || '';

    useEffect(() => {
        fetchInitialData();
    }, [selectedProgram, searchTerm]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [progRes, subRes] = await Promise.all([
                fetch('/api/v1/academic/programs/'),
                fetchSubjects()
            ]);

            if (progRes.ok) {
                const progData = await progRes.json();
                setPrograms(progData.results || progData || []);
            }
        } catch (err) {
            error('Failed to sync subject data');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        let url = '/api/v1/academic/subjects/';
        const params = new URLSearchParams();
        if (selectedProgram) params.append('program', selectedProgram);
        if (searchTerm) params.append('search', searchTerm);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            setSubjects(data.results || data || []);
        }
    };

    const handleFilterChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) newParams.set(key, value);
        else newParams.delete(key);
        setSearchParams(newParams);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subject? This might affect existing curricula.')) return;
        
        try {
            const res = await fetch(`/api/v1/academic/subjects/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                success('Subject removed from repository');
                fetchSubjects();
            } else {
                error('Cannot delete subject with active enlistments');
            }
        } catch (err) {
            error('Network error');
        }
    };

    const openEdit = (subject) => {
        setEditingSubject(subject);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingSubject(null);
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Subject Repository" description="Institutional curriculum Course Management and subject details." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Subject Repository</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Curriculum & Course Management</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={openAdd}>
                    ADD NEW SUBJECT
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by code or title..." 
                        value={searchTerm}
                        onChange={(e) => handleFilterChange('q', e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all"
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        value={selectedProgram}
                        onChange={(e) => handleFilterChange('program', e.target.value)}
                        className="flex-1 md:w-64 px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:border-blue-100 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">All Programs</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.code}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Card</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Placement</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Prerequisites</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {subjects.map((subject) => (
                                    <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                                    {subject.code.slice(0, 3)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-gray-900 leading-tight">{subject.code}</p>
                                                        {subject.syllabus && (
                                                            <a href={subject.syllabus} target="_blank" className="text-blue-500 hover:text-blue-700">
                                                                <FileText className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[200px]">
                                                        {subject.title}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 mb-1">
                                                    Y{subject.year_level} S{subject.semester_number}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[100px]">
                                                    {subject.program_codes?.join(', ') || subject.program_code}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xl font-black text-gray-900">{subject.units}</span>
                                            <p className="text-[8px] font-black text-gray-400 uppercase">UNITS</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {subject.prerequisites?.length > 0 ? (
                                                    subject.prerequisites.map(p => (
                                                        <span key={p.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase">
                                                            {p.code}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] text-gray-300 font-bold uppercase italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openEdit(subject)}
                                                    className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(subject.id)}
                                                    className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {subjects.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center">
                                            <Book className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No subjects found in repository</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <SubjectModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                subject={editingSubject}
                programs={programs}
                onSuccess={fetchInitialData}
            />
        </div>
    );
};

export default RegistrarSubjectMasterlist;
