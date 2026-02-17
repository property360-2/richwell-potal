import React, { useState, useEffect } from 'react';
import { X, Search, User, Check, AlertCircle, UserMinus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { FacultyService } from '../services/FacultyService';

const AssignProfessorModal = ({ isOpen, onClose, onAssign, subject, currentProfessorId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [professors, setProfessors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfessors();
            setSearchQuery('');
            setSelectedProfessor(null);
        }
    }, [isOpen]);

    const fetchProfessors = async () => {
        setLoading(true);
        try {
            const data = await FacultyService.getProfessors({ status: 'ACTIVE' });
            setProfessors(data);
        } catch (error) {
            console.error('Failed to load professors', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedProfessor) return;
        
        setIsSubmitting(true);
        try {
            await onAssign(selectedProfessor.id, selectedProfessor);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('Are you sure you want to remove the assigned professor?')) return;
        
        setIsSubmitting(true);
        try {
            await onAssign(null, null); // Null means clear assignment
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProfessors = professors.filter(p => 
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Assign Professor</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 line-clamp-1">
                            {subject?.subject_code} - {subject?.subject_title}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-header actions */}
                <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100">
                    <div className="relative group mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search professor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-12 pr-4 py-3 shadow-sm transition-all outline-none"
                            autoFocus
                        />
                    </div>
                    
                    {currentProfessorId && (
                        <div className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current</div>
                                    <div className="text-sm font-bold text-gray-900">
                                        {professors.find(p => p.id === currentProfessorId)?.full_name || 'Assigned'}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleClear}
                                disabled={isSubmitting}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                                title="Remove Assignment"
                            >
                                <UserMinus size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm font-bold">
                            Loading professors...
                        </div>
                    ) : filteredProfessors.length > 0 ? (
                        filteredProfessors.map(prof => {
                            const isSelected = selectedProfessor?.id === prof.id;
                            const isCurrent = currentProfessorId === prof.id;
                            
                            return (
                                <div 
                                    key={prof.id}
                                    onClick={() => !isCurrent && setSelectedProfessor(prof)}
                                    className={`
                                        group flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-500 shadow-md transform scale-[1.01]' 
                                            : isCurrent
                                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-default'
                                            : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}
                                        `}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                {prof.full_name}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {prof.department || 'General Faculty'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isSelected && <Check size={20} className="text-indigo-600" />}
                                    {isCurrent && <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current</span>}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <AlertCircle className="text-gray-300 mb-2" size={32} />
                            <p className="text-sm font-bold text-gray-400">No professors found</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex gap-3">
                        <Button 
                            variant="ghost" 
                            className="w-full"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            className="w-full"
                            onClick={handleAssign}
                            disabled={!selectedProfessor || isSubmitting}
                            isLoading={isSubmitting}
                        >
                            Confirm Assignment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignProfessorModal;
