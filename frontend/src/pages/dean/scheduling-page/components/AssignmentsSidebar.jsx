/**
 * File: AssignmentsSidebar.jsx
 * Description: Renders the subject assignment tracking table and color legend for the section management view.
 */

import React from 'react';
import Badge from '../../../../components/ui/Badge';

const AssignmentsSidebar = ({ profSchedules, onOpenSetup }) => {
    const COLORS = [
        { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
        { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
        { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
        { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
        { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
        { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
        { bg: '#ecfeff', border: '#06b6d4', text: '#155e75' },
        { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    ];

    const subjectCodes = [...new Set(profSchedules.map(s => s.subject_code))];
    const colorMap = {};
    subjectCodes.forEach((code, i) => { colorMap[code] = COLORS[i % COLORS.length]; });

    return (
        <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-800 italic">
                        Assignments ({profSchedules.filter(s => s.start_time).length}/{profSchedules.length})
                    </h4>
                    {profSchedules.length > 0 && profSchedules.every(s => s.start_time) && (
                        <Badge variant="success" className="text-[8px]">Complete</Badge>
                    )}
                </div>
                
                <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Subject</th>
                                <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Hours</th>
                                <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Type</th>
                                <th className="p-3 font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profSchedules.map(sched => {
                                const isAssigned = sched.start_time && sched.end_time && sched.days?.length > 0;
                                return (
                                    <tr 
                                        key={sched.id} 
                                        className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => onOpenSetup(sched)}
                                    >
                                        <td className="p-3">
                                            <div className="font-black text-blue-600 group-hover:text-blue-700">{sched.subject_code}</div>
                                            <div className="text-[8px] text-slate-400 truncate w-24 font-medium">{sched.subject_description}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="font-bold text-slate-600">{sched.subject_hrs_per_week}h</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-bold text-slate-500">{sched.component_type}</span>
                                        </td>
                                        <td className="p-3">
                                            <Badge 
                                                variant={isAssigned ? "success" : "neutral"} 
                                                className="text-[8px] px-1 py-0"
                                            >
                                                {isAssigned ? "Assigned" : "Pending"}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Subjects Legend */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Color Legend</h4>
                <div className="space-y-2">
                    {subjectCodes.map(code => {
                        const color = colorMap[code];
                        return (
                            <div key={code} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color?.border || '#ccc' }}></div>
                                <span className="text-[10px] font-bold text-slate-600">{code}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AssignmentsSidebar;
