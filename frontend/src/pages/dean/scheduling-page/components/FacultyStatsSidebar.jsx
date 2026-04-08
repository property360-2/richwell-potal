/**
 * File: FacultyStatsSidebar.jsx
 * Description: Renders the faculty load statistics and expertise details for the professor management view.
 */

import React from 'react';
import { BookOpen, Clock } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import styles from '../SchedulingPage.module.css';

const FacultyStatsSidebar = ({ selectedProf, calculateTotalUnits }) => {
    return (
        <div className="lg:col-span-4 space-y-6">
            <div className={`${styles.sidebarCardDark} shadow-xl`}>
                <h4 className="text-lg font-bold uppercase tracking-tight italic border-b border-slate-700 pb-4 mb-4">
                    Expertise & Assignments
                </h4>
                <div className="space-y-3">
                    {selectedProf?.assigned_subjects?.map(ps => (
                        <div key={ps.id} className="p-3 rounded-lg bg-slate-800 border border-slate-700 group hover:border-blue-500 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-black text-blue-400 tracking-tight">
                                    {ps.subject_details?.code}
                                </span>
                                <span className="text-[10px] font-black text-slate-500">
                                    {ps.subject_details?.units} UNITS
                                </span>
                            </div>
                            <div className="text-xs font-bold text-slate-200 line-clamp-1">
                                {ps.subject_details?.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Card title="Load Statistics" className="bg-white border-slate-100">
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-xs font-bold text-slate-400 uppercase">Employment</span>
                        <span className="text-sm font-black text-slate-700">
                            {selectedProf?.employment_status}
                        </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl mt-4">
                        <div className="flex items-center gap-3 text-blue-600 mb-2">
                            <Clock size={16} />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                Time Complexity
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                            Professor teaching window is validated against Section overlaps and general availability to ensure a conflict-free semester.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FacultyStatsSidebar;
