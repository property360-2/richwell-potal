import React from 'react';
import { LayoutGrid, Shuffle, ArrowRight } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import styles from '../SchedulingPage.module.css';

const SectionMatrix = ({ filteredSections, onManageSection }) => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Active Matrix</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Manage section assignments and professor loading
                    </p>
                </div>
                <div className={`flex items-center gap-3 ${styles.glassPanel} px-6 py-3 rounded-2xl border border-white/50 bg-white/40`}>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Total Enrolled</span>
                        <span className="text-xl font-black text-primary leading-none">150</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200/50 mx-2"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Sections</span>
                        <span className="text-xl font-black text-slate-800 leading-none">{filteredSections.length}</span>
                    </div>
                </div>
            </div>

            <div className="min-h-[400px]">
                {filteredSections.length === 0 ? (
                    <div className={styles.premiumEmptyState}>
                        <div className={styles.emptyStateIconWrapper}>
                            <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No Sections Found</h3>
                        <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm">
                            No sections match your current search criteria.
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" size="lg" className="rounded-xl px-8">Refresh Data</Button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.sectionGridPro + " pb-10"}>
                        {filteredSections.map(section => (
                            <div 
                                key={section.id} 
                                className={`${styles.sectionCardPro} group`}
                                onClick={() => onManageSection(section)}
                            >
                                <div className={styles.cardStatusBadge}>
                                    <Badge 
                                        variant={section.scheduling_status === 'FULL' ? 'success' : section.scheduling_status === 'PARTIAL' ? 'warning' : 'neutral'}
                                        className="shadow-sm font-black text-[9px] uppercase px-2"
                                    >
                                        {section.scheduling_status}
                                    </Badge>
                                </div>
                                
                                <div className="mb-6">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                                        {section.program_code}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 group-hover:text-primary transition-colors">
                                        {section.name}
                                    </h4>
                                    <div className="text-[11px] font-extrabold text-slate-300 mt-1 uppercase tracking-wider">
                                        {section.session} Session
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Year</span>
                                            <span className="text-xs font-black text-slate-700">{section.year_level}</span>
                                        </div>
                                        <div className="flex flex-col pl-4 border-l border-slate-100">
                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Components</span>
                                            <span className="text-xs font-black text-slate-700">{section.subject_count} Subjects</span>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="xs" 
                                        className="bg-slate-50 hover:bg-primary hover:text-white rounded-lg transition-all"
                                        icon={<ArrowRight size={14}/>}
                                    >
                                        Manage
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectionMatrix;
