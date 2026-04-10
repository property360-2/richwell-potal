import React from 'react';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Clock,
  Layers
} from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

/**
 * IrregularScheduleBuilder — Native CSS Glassmorphic Builder
 * 
 * Provides irregular students with a visual catalog of approved subjects 
 * and available sections using a robust native CSS layout.
 * 
 * @param {Array} approvedGrades - List of subjects approved for enrollment
 * @param {Object} subjectSections - Mapping of subject IDs to available sections
 * @param {Object} selectedSections - Currently selected sections
 * @param {Boolean} isProcessing - Loading state for confirmation
 * @param {Function} onSelectSection - Callback when a section is picked
 * @param {Function} onConfirm - Callback to finalize the schedule
 */
const IrregularScheduleBuilder = ({ 
  approvedGrades, 
  subjectSections, 
  selectedSections, 
  isProcessing, 
  onSelectSection, 
  onConfirm 
}) => {
  const selectionCount = Object.keys(selectedSections).length;
  const isComplete = selectionCount === approvedGrades.length;
  
  const totalUnits = approvedGrades.reduce((acc, curr) => 
    acc + (curr.subject_details?.total_units || 0), 0
  );
  
  const selectedUnits = approvedGrades.reduce((acc, curr) => {
    return selectedSections[curr.subject] !== undefined ? 
      acc + (curr.subject_details?.total_units || 0) : acc;
  }, 0);

  return (
    <div className="animate-slide-up relative">
      {/* Floating Progress Tracker */}
      <div className="floating-tracker glass-card sp-card-content animate-fade-in">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="sp-icon-box mb-0 active" style={{ width: 44, height: 44 }}>
                   <Layers size={20} className="text-white" />
                </div>
                <div>
                   <h5 className="text-2xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Building</h5>
                   <p className="text-xs font-black text-slate-900 uppercase">Registration</p>
                </div>
             </div>
             <div className="text-right">
                <div className="text-xl font-black text-indigo-600 leading-none">
                 {Math.round((selectionCount / approvedGrades.length) * 100) || 0}%
                </div>
                <div className="text-3xs font-black text-slate-400 uppercase tracking-widest mt-1">Complete</div>
             </div>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
             <div 
               className="h-full bg-indigo-500 transition-all duration-700 ease-out" 
               style={{ width: `${(selectionCount / approvedGrades.length) * 100}%` }}
             ></div>
          </div>

          <div className="space-y-3 mb-8">
             <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Subjects Picked</span>
                <span className="text-slate-900 font-black">{selectionCount} / {approvedGrades.length}</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Selected Units</span>
                <span className="text-slate-900 font-black">{selectedUnits} / {totalUnits}</span>
             </div>
          </div>

          <Button 
             className="sp-btn-premium w-full"
             loading={isProcessing}
             disabled={!isComplete}
             onClick={onConfirm}
           >
             Finalize Timetable
             <ChevronRight size={14} className="ml-2" />
          </Button>
      </div>

      {/* Subject Catalog List */}
      <div className="sp-section-header">
        <h3 className="text-slate-800">Section Configuration</h3>
        <p className="text-slate-500">Select one section for each of your approved subjects below.</p>
      </div>

      <div className="sp-subject-list">
        {approvedGrades.map((grade, idx) => {
          const sections = subjectSections[grade.subject] || [];
          const selectedSectionId = selectedSections[grade.subject];
          const isSelected = selectedSectionId !== undefined;

          return (
            <div 
              key={grade.id} 
              className={`subject-card glass-card mb-6 animate-slide-up ${isSelected ? 'active' : ''}`}
              style={{ 
                animationDelay: `${idx * 0.05}s`,
                borderLeft: isSelected ? '4px solid var(--picking-accent)' : '4px solid #e2e8f0'
              }}
            >
              <div className="sp-card-content">
                <div className="flex flex-col md:flex-row gap-8">
                   {/* Left: Subject Info */}
                   <div className="md:w-1/3">
                      <div className="flex items-center gap-3 mb-4">
                         <div className={`sp-icon-box mb-0 ${isSelected ? 'active' : ''}`} style={{ width: 48, height: 48 }}>
                            <BookOpen size={24} />
                         </div>
                         <div>
                            <span className="text-2xs font-black text-indigo-500 uppercase tracking-widest leading-none mb-1 block">
                              {grade.subject_details?.code}
                            </span>
                            <h4 className="text-lg font-black text-slate-900 italic tracking-tighter leading-tight">
                              {grade.subject_details?.description}
                            </h4>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                         <Badge variant="secondary">
                            {grade.subject_details?.total_units} Units
                         </Badge>
                         {isSelected && (
                           <Badge variant="default">
                             <CheckCircle2 size={10} className="mr-1" /> VALIDATED
                           </Badge>
                         )}
                      </div>
                   </div>

                   {/* Right: Section Grid */}
                   <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-2xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Users size={12} className="text-indigo-400" /> Slot Availability
                         </span>
                         {isSelected && (
                           <span className="text-2xs font-black text-indigo-500 uppercase tracking-widest">
                             Selected: {sections.find(s => s.id === selectedSectionId)?.name}
                           </span>
                         )}
                      </div>

                      {sections.length > 0 ? (
                        <div className="sp-selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                          {sections.map((section) => {
                            const isSectionSelected = selectedSectionId === section.id;
                            const isFull = section.student_count >= section.max_students;

                            return (
                              <button
                                key={section.id}
                                disabled={isFull}
                                onClick={() => onSelectSection(grade.subject, section.id)}
                                className={`section-capsule glass-card p-4 text-left transition-all relative
                                  ${isSectionSelected ? 'active' : isFull ? 'disabled' : ''}`}
                                style={{ border: isSectionSelected ? '2px solid var(--picking-accent)' : '1px solid #e2e8f0' }}
                              >
                                {isSectionSelected && (
                                  <div className="absolute top-3 right-3 text-indigo-500">
                                    <CheckCircle2 size={14} />
                                  </div>
                                )}
                                <div className="flex justify-between items-center mb-2">
                                   <span className={`text-xs font-black uppercase tracking-widest ${isSectionSelected ? 'text-indigo-600' : 'text-slate-900'}`}>
                                     {section.name}
                                   </span>
                                   <Badge variant={section.session === 'AM' ? 'secondary' : 'default'} style={{ fontSize: '8px', padding: '2px 6px' }}>
                                     {section.session}
                                   </Badge>
                                </div>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-1.5 text-2xs text-slate-400 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                      <Clock size={10} /> {section.time_display || 'Sched TBA'}
                                   </div>
                                   <div className={`text-3xs font-black uppercase ${isFull ? 'text-red-500' : 'text-slate-500'}`}>
                                      {section.student_count} / {section.max_students} Slots
                                   </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <AlertTriangle size={24} className="text-amber-400 mb-2 opacity-50" />
                           <p className="text-2xs font-black text-slate-400 uppercase tracking-widest">No matching sections available</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IrregularScheduleBuilder;
