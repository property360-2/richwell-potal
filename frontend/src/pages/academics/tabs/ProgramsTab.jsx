import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Edit2, BookOpen, AlertCircle, ChevronRight, Hash, GraduationCap } from 'lucide-react';
import { ProgramService } from '../services/ProgramService';
import Button from '../../../components/ui/Button';
import AddProgramModal from '../modals/AddProgramModal';

const ProgramsTab = () => {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);

    const loadPrograms = async () => {
        setLoading(true);
        try {
            const data = await ProgramService.getPrograms(searchQuery);
            setPrograms(data);
        } catch (error) {
            console.error('Error loading programs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(loadPrograms, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleView = (program) => {
        navigate(`/academics/programs/${program.id}`);
    };

    const handleEdit = (program) => {
        // Edit logic placeholder - reusing view or add modal context eventually
        setSelectedProgram(program);
        setIsAddModalOpen(true); // Temporary placeholder
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <GraduationCap size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Academic Program Catalog</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Repository of Degree Offerings</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search programs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full lg:w-80 pl-12 pr-6 py-4 shadow-sm transition-all outline-none"
                        />
                    </div>
                    
                    <Button 
                        onClick={() => { setSelectedProgram(null); setIsAddModalOpen(true); }}
                        className="rounded-2xl px-8 py-4 h-auto shadow-indigo-100 shadow-xl flex items-center gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white transition-all group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Add New Program</span>
                    </Button>
                </div>
            </div>

            {/* Programs Table/List */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">Program Code</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">Program Name</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-center">Duration</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-5 bg-gray-100 rounded-lg w-20"></div></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-gray-100 rounded-lg w-48"></div></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-gray-100 rounded-lg w-12 mx-auto"></div></td>
                                        <td className="px-8 py-6 text-right"><div className="h-8 bg-gray-100 rounded-lg w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : programs.length > 0 ? (
                                programs.map((prog) => (
                                    <tr key={prog.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs border border-indigo-100">
                                                    {prog.code}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900">{prog.name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider line-clamp-1 max-w-xs">{prog.description || 'No description available'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[11px] font-black uppercase tracking-wider">
                                                <Hash size={12} />
                                                {prog.duration_years} Years
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleView(prog)}
                                                    className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="View Program Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(prog)}
                                                    className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                                    title="Edit Program"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                                                <BookOpen size={48} />
                                            </div>
                                            <p className="text-gray-400 font-medium">No programs found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddProgramModal 
                isOpen={isAddModalOpen} 
                onClose={() => { setIsAddModalOpen(false); setSelectedProgram(null); }} 
                onSuccess={() => { loadPrograms(); setSelectedProgram(null); }}
                program={selectedProgram}
            />
        </div>
    );
};

export default ProgramsTab;
