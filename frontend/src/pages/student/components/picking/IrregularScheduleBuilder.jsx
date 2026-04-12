import React from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Clock,
  Zap,
  Info
} from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { getScheduleConflict } from '../../../../utils/conflictDetector';

/**
 * IrregularScheduleBuilder
 * 
 * A compact, information-dense tabular interface for irregular student schedule selection.
 * Uses inline "Schedule Pills" for ultra-fast, 1-click selection.
 */
const IrregularScheduleBuilder = ({ 
  approvedGrades, 
  subjectSections, 
  selectedSections, 
  isProcessing, 
  onSelectSection, 
  onConfirm 
}) => {
  // Derived stats
  const selectionCount = Object.keys(selectedSections).length;
  const isComplete = selectionCount === approvedGrades.length;
  
  const totalUnits = approvedGrades.reduce((acc, curr) => 
    acc + (curr.subject_details?.total_units || 0), 0
  );
  
  const selectedUnits = approvedGrades.reduce((acc, curr) => {
    return selectedSections[curr.subject] !== undefined ? 
      acc + (curr.subject_details?.total_units || 0) : acc;
  }, 0);

  /**
   * Helper to get schedules of all CURRENTLY selected sections
   * Used for conflict checking against a candidate section.
   */
  const getSelectedSchedulesMap = () => {
    const map = {};
    Object.entries(selectedSections).forEach(([subjectId, sectionId]) => {
      const section = (subjectSections[subjectId] || []).find(s => s.id === sectionId);
      if (section && section.subject_schedules) {
        map[subjectId] = section.subject_schedules;
      }
    });
    return map;
  };

  const selectedSchedulesMap = getSelectedSchedulesMap();

  return (
    <div className="animate-slide-up pb-32">
      {/* Header Info */}
      <div className="sp-section-header flex justify-between items-end mb-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="p-1 px-3 bg-indigo-500 rounded-full">
                <span className="text-3xs font-black text-white uppercase tracking-widest">Irregular Mode</span>
             </div>
             <span className="text-2xs font-black text-slate-400 uppercase tracking-widest">Section Selection</span>
           </div>
           <h3 className="text-slate-800 italic tracking-tighter">Academic Palette</h3>
           <p className="text-slate-500 text-sm">Select a schedule pill for each subject. Conflicting times are automatically disabled.</p>
        </div>
        
        <div className="hidden lg:flex gap-4">
           <div className="flex flex-col items-end">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Enrollment Progress</span>
              <div className="flex items-center gap-2">
                 <div className="text-lg font-black text-slate-900">{selectionCount}<span className="text-slate-300 mx-1">/</span>{approvedGrades.length}</div>
                 <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ width: `${(selectionCount / approvedGrades.length) * 100}%` }}
                    />
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="ir-container">
        <table className="ir-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Subject & Description</th>
              <th style={{ width: '10%' }}>Units</th>
              <th style={{ width: '45%' }}>Available Schedules</th>
              <th style={{ width: '10%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {approvedGrades.map((grade, idx) => {
              const sections = subjectSections[grade.subject] || [];
              const selectedSectionId = selectedSections[grade.subject];
              const isSelected = selectedSectionId !== undefined;

              return (
                <tr 
                  key={grade.id} 
                  className={`ir-subject-row ${isSelected ? 'selected' : ''}`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Subject Column */}
                  <td>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 rotate-6' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                        {isSelected ? <CheckCircle2 size={24} /> : <BookOpen size={22} />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                            {grade.subject_details?.code}
                          </span>
                        </div>
                        <div className="text-base font-extrabold text-slate-800 leading-tight tracking-tight">
                          {grade.subject_details?.description}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Units Column */}
                  <td>
                    <Badge variant="secondary" className="px-3 font-black bg-slate-100 text-slate-600">
                      {grade.subject_details?.total_units} U
                    </Badge>
                  </td>

                  {/* Schedule Pills Column */}
                  <td className="py-2">
                    {sections.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {sections.map(section => {
                          const isSectionSelected = selectedSectionId === section.id;
                          const isFull = section.student_count >= section.max_students;
                          
                          // Conflict detection
                          const conflict = getScheduleConflict(
                            section.subject_schedules, 
                            selectedSchedulesMap, 
                            grade.subject
                          );

                          // Determine Pill Styling
                          let pillClasses = "px-3 py-2 border rounded-xl text-xs transition-all duration-200 text-left flex flex-col gap-1 ";
                          
                          if (isSectionSelected) {
                            pillClasses += "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 scale-[1.02] active";
                          } else if (isFull) {
                            pillClasses += "bg-rose-50 border-rose-200 text-slate-400 opacity-60 cursor-not-allowed grayscale";
                          } else if (conflict) {
                            pillClasses += "bg-slate-50 border-dashed border-red-300 text-slate-400 opacity-60 cursor-not-allowed";
                          } else {
                            pillClasses += "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-sm cursor-pointer hover:-translate-y-0.5";
                          }

                          return (
                            <button 
                              key={section.id}
                              className={pillClasses}
                              disabled={isFull || conflict}
                              onClick={() => onSelectSection(grade.subject, section.id)}
                            >
                              <div className="flex items-center gap-1.5 font-black uppercase tracking-tight">
                                {isSectionSelected ? <CheckCircle2 size={12} className="text-white"/> : <Clock size={12} className={conflict ? 'text-red-400' : 'text-slate-400'}/>}
                                <span>{section.time_display || 'TBA'}</span>
                              </div>
                              <div className="flex justify-between items-center w-full gap-3 mt-0.5">
                                 <span className={`text-[10px] font-bold ${isSectionSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                   SEC {section.name}
                                 </span>
                                 <span className={`text-[9px] font-black uppercase ${isSectionSelected ? 'text-white' : isFull ? 'text-rose-500' : conflict ? 'text-red-500' : 'text-indigo-400'}`}>
                                   {isFull ? 'FULL' : conflict ? 'CONFLICT' : `${section.max_students - section.student_count} Slots`}
                                 </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-50 px-3 py-2 border border-amber-100 rounded-lg inline-flex">
                        <AlertTriangle size={14} /> No Schedules Available
                      </div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td>
                    {isSelected ? (
                      <Badge variant="default" className="bg-indigo-100 text-indigo-700 font-black border-0">
                        ADDED
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-bold border-0">
                        WAITING
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky Footer Tracker */}
      <div className="ir-sticky-footer">
        <div className="flex items-center gap-8">
           <div className="footer-stat">
              <span className="footer-stat-label">Subjects</span>
              <span className="footer-stat-value">{selectionCount} / {approvedGrades.length}</span>
           </div>
           
           <div className="footer-divider" />
           
           <div className="footer-stat">
              <span className="footer-stat-label">Units</span>
              <span className="footer-stat-value">{selectedUnits} / {totalUnits}</span>
           </div>

           <div className="footer-divider" />

           <div className="hidden md:flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                 {isComplete ? <CheckCircle2 size={20} /> : <Zap size={20} />}
              </div>
              <div>
                 <div className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">
                    {isComplete ? 'Verified' : 'In Progress'}
                 </div>
                 <div className="text-2xs text-slate-400 font-bold uppercase tracking-widest">
                    {isComplete ? 'Ready to Finalize' : `Finish ${approvedGrades.length - selectionCount} more`}
                 </div>
              </div>
           </div>
        </div>

        <Button 
          className="sp-btn-premium h-14 px-10"
          loading={isProcessing}
          disabled={!isComplete}
          onClick={onConfirm}
        >
          Finalize Timetable
          <ChevronRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default IrregularScheduleBuilder;
