import React, { useState, useEffect, useCallback } from 'react';
import { 
    Layers, 
    Plus, 
    ChevronDown, 
    RefreshCw,
    AlertCircle,
    Calendar,
    FileText
} from 'lucide-react';
import { CurriculumService } from '../services/CurriculumService';
import CurriculumStructureView from '../components/CurriculumStructureView';
import Button from '../../../components/ui/Button';
import AddCurriculumModal from '../modals/AddCurriculumModal';
import AssignSubjectToCurriculumModal from '../modals/AssignSubjectToCurriculumModal';

const CurriculumTab = ({ program }) => {
    const [curricula, setCurricula] = useState([]);
    const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
    const [structure, setStructure] = useState({});
    const [loading, setLoading] = useState(true);
    const [structureLoading, setStructureLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ year: 1, sem: 1 });

    const fetchCurricula = useCallback(async () => {
        try {
            setLoading(true);
            const data = await CurriculumService.getCurricula(program.id);
            setCurricula(data);
            
            // Auto-select active one or the most recent
            if (data.length > 0) {
                const active = data.find(c => c.is_active) || data[0];
                setSelectedCurriculumId(active.id);
            }
        } catch (e) {
            setError('Failed to load curricula');
        } finally {
            setLoading(false);
        }
    }, [program.id]);

    const fetchStructure = useCallback(async (id) => {
        if (!id) return;
        try {
            setStructureLoading(true);
            const data = await CurriculumService.getCurriculumStructure(id);
            setStructure(data.structure || {});
        } catch (e) {
            console.error('Failed to load structure', e);
        } finally {
            setStructureLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurricula();
    }, [fetchCurricula]);

    useEffect(() => {
        if (selectedCurriculumId) {
            fetchStructure(selectedCurriculumId);
        }
    }, [selectedCurriculumId, fetchStructure]);

    const activeCurriculum = curricula.find(c => c.id === selectedCurriculumId);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <RefreshCw className="text-indigo-600 animate-spin mb-4" size={32} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Curricula...</p>
            </div>
        );
    }

    if (curricula.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200">
                <div className="p-6 bg-indigo-100 text-indigo-600 rounded-3xl mb-6 shadow-xl shadow-indigo-100 scale-110">
                    <Layers size={48} />
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No Curricula Defined</h4>
                <p className="text-gray-500 max-w-md mx-auto leading-relaxed font-medium mb-8">
                    Start by creating the first curriculum revision for <strong>{program.name}</strong>.
                </p>
                <Button 
                    variant="primary" 
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-2xl px-8 shadow-indigo-100 shadow-xl flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create First Version
                </Button>
            </div>
        );
    }

    const handleAssignClick = (year, sem) => {
        setAssignTarget({ year, sem });
        setIsAssignModalOpen(true);
    };

    const handleRemoveSubject = async (subjectId) => {
        if (!window.confirm('Remove this subject from the curriculum structure?')) return;
        
        try {
            setStructureLoading(true);
            await CurriculumService.deleteCurriculumSubject(selectedCurriculumId, subjectId);
            fetchStructure(selectedCurriculumId);
        } catch (e) {
            console.error('Failed to remove subject', e);
        } finally {
            setStructureLoading(false);
        }
    };

    const handleCurriculumSuccess = () => {
        fetchCurricula();
    };

    const handleAssignSuccess = () => {
        fetchStructure(selectedCurriculumId);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Selector */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <Layers size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Curriculum Revisions</h2>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                {curricula.length} Versions
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage Program Structure & Graduation Requirements</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <select 
                            value={selectedCurriculumId}
                            onChange={(e) => setSelectedCurriculumId(e.target.value)}
                            className="appearance-none bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full lg:w-72 px-6 py-4 shadow-sm hover:border-indigo-200 transition-all cursor-pointer pr-12"
                        >
                            {curricula.map(cur => (
                                <option key={cur.id} value={cur.id}>
                                    {cur.code} - {cur.name} ({cur.effective_year})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={20} />
                    </div>

                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-8 shadow-indigo-100 shadow-xl flex items-center gap-2 shrink-0"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">New Revision</span>
                    </Button>
                </div>
            </div>

            {/* Curriculum Summary Card */}
            {activeCurriculum && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Effective Year</p>
                            <p className="text-base font-black text-gray-900">{activeCurriculum.effective_year}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <FileText size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Revision Code</p>
                            <p className="text-base font-black text-gray-900 uppercase">{activeCurriculum.code}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <RefreshCw size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeCurriculum.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <p className="text-base font-black text-gray-900">{activeCurriculum.is_active ? 'Active' : 'Archived'}</p>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* Structure View */}
            {structureLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <RefreshCw className="text-indigo-600 animate-spin mb-4" size={32} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Mapping Structure...</p>
                </div>
            ) : (
                <CurriculumStructureView 
                    structure={structure}
                    program={program}
                    onAssign={handleAssignClick}
                    onRemove={handleRemoveSubject}
                />
            )}

            {/* Modals */}
            <AddCurriculumModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                programId={program.id}
                programName={program.name}
                onSuccess={handleCurriculumSuccess}
            />

            <AssignSubjectToCurriculumModal 
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                curriculumId={selectedCurriculumId}
                curriculumName={activeCurriculum?.name}
                programId={program.id}
                programName={program.name}
                yearLevel={assignTarget.year}
                semesterNumber={assignTarget.sem}
                onSuccess={handleAssignSuccess}
            />
        </div>
    );
};

export default CurriculumTab;
