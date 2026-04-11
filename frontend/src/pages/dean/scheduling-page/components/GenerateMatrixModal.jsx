import React, { useState } from 'react';
import { Shuffle, CheckCircle2, AlertTriangle, Users, ChevronRight, Info } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { useToast } from '../../../../components/ui/Toast';
import { sectionsApi } from '../../../../api/sections';

/**
 * GenerateMatrixModal Component
 * 
 * Provides a UI for Deans to trigger the automated section generation process.
 * Displays enrollment statistics per Program/Year Level and allows targeting
 * specific groups for section creation.
 * 
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Function to close the modal
 * @param {object} activeTerm - The current active academic term
 * @param {array} enrollmentStats - List of programs/years with student counts
 * @param {function} onGenerateSuccess - Callback after successful generation
 */
const GenerateMatrixModal = ({ 
    isOpen, 
    onClose, 
    activeTerm, 
    enrollmentStats, 
    onGenerateSuccess 
}) => {
    const [generatingId, setGeneratingId] = useState(null); // programId-yearLevel
    const { showToast } = useToast();

    // Grouping stats by program to make it look cleaner
    const groupedStats = enrollmentStats.reduce((acc, curr) => {
        const progId = curr.student__program__id;
        if (!acc[progId]) {
            acc[progId] = {
                id: progId,
                code: curr.student__program__code,
                name: curr.student__program__name,
                levels: []
            };
        }
        acc[progId].levels.push({
            year: curr.year_level,
            count: curr.count
        });
        return acc;
    }, {});

    const handleGenerate = async (programId, yearLevel) => {
        const loadingId = `${programId}-${yearLevel}`;
        try {
            setGeneratingId(loadingId);
            await sectionsApi.generate({
                term_id: activeTerm.id,
                program_id: programId,
                year_level: yearLevel,
                auto_schedule: true // Default to true for better DX
            });
            showToast('success', `Sections generated for Year ${yearLevel}`);
            if (onGenerateSuccess) onGenerateSuccess();
        } catch (err) {
            console.error(err);
            showToast('error', err.response?.data?.error || 'Section generation failed');
        } finally {
            setGeneratingId(null);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Section Generation Matrix"
            size="lg"
        >
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-4 items-start">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Automatic Generation Logic</h4>
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">
                            The system will automatically split students into sections (approx. 40 students each) and assign empty schedule slots based on the active curriculum. If "Auto-Schedule" is enabled, it will also try to find conflict-free time blocks.
                        </p>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-8">
                    {Object.values(groupedStats).length === 0 ? (
                        <div className="py-12 text-center">
                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400">No approved student advising found for {activeTerm?.code}.</p>
                        </div>
                    ) : (
                        Object.values(groupedStats).map(program => (
                            <div key={program.id} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{program.name} ({program.code})</span>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {program.levels.map(level => {
                                        const isGenerating = generatingId === `${program.id}-${level.year}`;
                                        return (
                                            <div 
                                                key={level.year} 
                                                className="p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/30 transition-all flex justify-between items-center group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Year</span>
                                                        <span className="text-lg font-black text-slate-700 leading-none">{level.year}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="info" className="text-[9px] font-black uppercase tracking-tighter">
                                                                {level.count} Approved Students
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Needs ~{Math.ceil(level.count / 40)} Sections
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <Button 
                                                    variant="primary" 
                                                    size="sm" 
                                                    className="rounded-lg px-4"
                                                    icon={isGenerating ? <LoadingSpinner size="xs" /> : <Shuffle size={14} />}
                                                    onClick={() => handleGenerate(program.id, level.year)}
                                                    disabled={isGenerating || level.count === 0}
                                                >
                                                    {isGenerating ? 'GEN...' : 'GENERATE'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={onClose} className="font-bold">Close Manager</Button>
                </div>
            </div>
        </Modal>
    );
};

export default GenerateMatrixModal;
