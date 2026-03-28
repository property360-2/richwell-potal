/**
 * Richwell Portal — Irregular Schedule Builder
 * 
 * Provides a dynamic interface for irregular students to pick specific 
 * sections for their approved subjects. Includes slot counting and 
 * session badge displays.
 * 
 * @param {Object} props
 * @param {Array} props.approvedGrades - Students approved subjects.
 * @param {Object} props.subjectSections - Map of subject IDs to section arrays.
 * @param {Object} props.selectedSections - Currently selected sections map.
 * @param {boolean} props.isProcessing - Loading state for action buttons.
 * @param {Function} props.onSelectSection - Selection callback.
 * @param {Function} props.onConfirm - Submission callback.
 */

import React from 'react';
import { Clock, CheckSquare, Users } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

const IrregularScheduleBuilder = ({ approvedGrades, subjectSections, selectedSections, isProcessing, onSelectSection, onConfirm }) => {
  const selectionCount = Object.keys(selectedSections).length;
  const isComplete = selectionCount === approvedGrades.length;

  return (
    <div className="space-y-12">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-800">Custom Timetable Builder</h3>
        <p className="text-slate-500 max-w-lg mx-auto">Review available slots for each subject and choose the section that fits your preferred daily hours.</p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {approvedGrades.map(grade => (
          <div key={grade.id} className="subject-selection-block p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge variant="ghost" className="text-indigo-600 bg-indigo-50 font-bold px-3 py-1 radius-lg">
                  {grade.subject_details?.code} ({(grade.subject_details?.total_units || 0)} Units)
                </Badge>
                <div className="text-lg font-bold text-slate-800">{grade.subject_details?.description}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(subjectSections[grade.subject] || []).map(section => {
                const isSelected = selectedSections[grade.subject] === section.id;
                const isFull = section.student_count >= section.max_students;

                return (
                  <div 
                    key={section.id}
                    onClick={() => !isFull && onSelectSection(grade.subject, section.id)}
                    className={`relative cursor-pointer transition-all duration-300 p-5 rounded-xl border-2
                      ${isSelected ? 'bg-indigo-50 border-indigo-500' : isFull ? 'bg-slate-50 border-slate-200 opacity-60 grayscale cursor-not-allowed' : 'bg-white border-slate-100 hover:border-slate-300'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-extrabold text-slate-800">{section.name}</div>
                      <Badge variant={section.session === 'AM' ? 'info' : 'warning'} size="sm">{section.session}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-2">
                      <Users size={14} className="text-indigo-400" />
                      SLOTS: <span className={isFull ? 'text-red-500' : 'text-slate-600'}>{section.student_count} / {section.max_students}</span>
                    </div>

                    {isSelected && <div className="absolute top-2 right-2 text-indigo-500 scale-110"><CheckSquare size={16} /></div>}
                  </div>
                );
              })}

              {(subjectSections[grade.subject] || []).length === 0 && (
                 <div className="col-span-full py-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-semibold">
                    NO SECTIONS AVAILABLE FOR THIS SUBJECT
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white p-8 rounded-2xl gap-6 sticky bottom-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Clock size={24} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">Progress Tracker</div>
            <div className="text-lg font-extrabold">{selectionCount} / {approvedGrades.length} Selected</div>
          </div>
        </div>

        <Button 
          variant="primary" 
          size="lg" 
          loading={isProcessing}
          onClick={onConfirm}
          disabled={!isComplete}
          className="bg-indigo-500 hover:bg-indigo-400 border-none px-12"
        >
          Finalize Timetable
        </Button>
      </div>
    </div>
  );
};

export default IrregularScheduleBuilder;
