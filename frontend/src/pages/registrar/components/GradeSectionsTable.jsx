/**
 * Richwell Portal — Grade Sections Table Component
 * 
 * A reusable table component for the Grade Finalization dashboard that displays 
 * section details, grading progress, and action buttons.
 */

import React from 'react';
import { BookOpen, Users, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

/**
 * GradeSectionsTable Component
 * 
 * @param {Array} data - List of section objects to display.
 * @param {string} type - Tab type ('queue', 'finalized', 'resolutions').
 * @param {Function} onSelect - Callback when a section is clicked.
 */
const GradeSectionsTable = ({ data, type, onSelect }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900/50 rounded-xl border border-slate-800/50">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="text-slate-600" size={24} />
        </div>
        <h3 className="text-slate-300 font-medium">No sections found</h3>
        <p className="text-slate-500 text-sm mt-1">There are no records matching the current criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
            <th className="px-6 py-3">Section Info</th>
            <th className="px-6 py-3">Instructor</th>
            <th className="px-6 py-3">Progress</th>
            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((section) => (
            <tr 
              key={section.id} 
              className="group bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer rounded-lg overflow-hidden border border-slate-800 shadow-sm"
              onClick={() => onSelect(section)}
            >
              <td className="px-6 py-4 rounded-l-lg border-y border-l border-transparent group-hover:border-slate-700/50">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-wide text-sm">
                    {section.code || section.section_code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                    {section.subject_title || section.subject_name}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 border-y border-transparent group-hover:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {section.instructor_name?.split(' ').map(n => n[0]).join('') || 'IA'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-300">
                      {section.instructor_name || 'Unassigned'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Instructor
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 border-y border-transparent group-hover:border-slate-700/50">
                <div className="w-32 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">GRADING</span>
                    <span className={section.grading_progress === 100 ? "text-emerald-400" : "text-blue-400"}>
                      {section.grading_progress}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out ${
                        section.grading_progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${section.grading_progress}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 rounded-r-lg border-y border-r border-transparent group-hover:border-slate-700/50 text-right">
                <div className="flex items-center justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                  {section.grading_progress === 100 ? (
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px]">READY</Badge>
                  ) : (
                    <Badge variant="ghost" className="bg-slate-800 text-slate-500 border-none text-[10px]">IN PROGRESS</Badge>
                  )}
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GradeSectionsTable;
