import React, { useState, useEffect } from 'react';
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
    Users
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import { FacultyService } from '../services/FacultyService';

// Modals
import FacultyFormModal from '../modals/FacultyFormModal';
import ViewProfessorModal from '../modals/ViewProfessorModal';

const FacultyTab = () => {
    const { success, error } = useToast();
    
    // State
    const [loading, setLoading] = useState(true);
    const [professors, setProfessors] = useState([]);
    const [filters, setFilters] = useState({ search: '' });
    const [pagination, setPagination] = useState({ 
        currentPage: 1, 
        hasNext: false, 
        hasPrev: false 
    });

    // Modals state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    useEffect(() => {
        fetchProfessors();
    }, [pagination.currentPage, filters.search]);

    const fetchProfessors = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.currentPage,
                search: filters.search
            };
            
            const data = await FacultyService.getProfessors(params);
            
            // Handle standard pagination response
            if (data.results) {
                setProfessors(data.results);
                setPagination(prev => ({
                    ...prev,
                    hasNext: !!data.next,
                    hasPrev: !!data.previous
                }));
            } else {
                setProfessors(data || []);
            }
        } catch (err) {
            console.error(err);
            error('Failed to load professors');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (prof) => {
        setSelectedProfessor(prof);
        setIsViewModalOpen(true);
    };

    const handleEdit = (prof) => {
         setSelectedProfessor(prof);
         setIsEditMode(true);
         setIsFormModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedProfessor(null);
        setIsEditMode(false);
        setIsFormModalOpen(true);
    };

    const handleDelete = async (prof) => {
        if (!window.confirm(`Are you sure you want to remove ${prof.first_name} ${prof.last_name}?`)) return;
        
        try {
            await FacultyService.deleteProfessor(prof.id);
            success('Professor removed from roster');
            fetchProfessors();
        } catch (err) {
            error(err.message || 'Failed to remove professor');
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <Users size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Faculty & Staff Roster</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Registry of Academic Personnel</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search professors..." 
                            value={filters.search}
                            onChange={handleSearch}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all outline-none"
                        />
                    </div>
                    
                    <div className="flex gap-3 shrink-0">
                       <Button 
                            variant="primary" 
                            icon={Plus}
                            onClick={handleAdd}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 rounded-2xl px-8 py-4 h-auto transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <span className="font-black uppercase tracking-widest text-[11px]">Add Professor</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Professor</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Specialization</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Records...</span>
                                    </td>
                                </tr>
                            ) : professors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-12 text-center text-gray-400 font-medium italic">
                                        No professors found.
                                    </td>
                                </tr>
                            ) : (
                                professors.map((prof) => (
                                    <tr key={prof.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-gray-900">{prof.last_name}, {prof.first_name}</p>
                                                <p className="text-xs text-gray-500">{prof.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-600 font-medium">
                                            {prof.profile?.department || 'N/A'}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-600 font-medium">
                                            {prof.profile?.specialization || 'N/A'}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                prof.is_active 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-red-50 text-red-600 border border-red-100'
                                            }`}>
                                                {prof.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleView(prof)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                 <button 
                                                    onClick={() => handleEdit(prof)}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(prof)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-5 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Showing {professors.length} records
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={!pagination.hasPrev}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                            className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            disabled={!pagination.hasNext}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                            className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <FacultyFormModal 
                isOpen={isFormModalOpen} 
                onClose={() => {
                    setIsFormModalOpen(false);
                    setSelectedProfessor(null);
                }} 
                onSuccess={() => {
                    fetchProfessors();
                    setIsFormModalOpen(false);
                    setSelectedProfessor(null);
                }}
                professor={isEditMode ? selectedProfessor : null}
            />
            
            <ViewProfessorModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedProfessor(null);
                }}
                professor={selectedProfessor}
            />
        </div>
    );
};

export default FacultyTab;
