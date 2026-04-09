/**
 * Richwell Portal — Subject Selection List
 * 
 * Renders a categorized list of available subjects for irregular students 
 * to choose from during advising.
 * 
 * @param {Object} props
 * @param {Object} categorizedSubjects - Subjects grouped by year and semester.
 * @param {Array} selectedSubjectIds - IDs of currently selected subjects.
 * @param {Function} toggleSubject - Callback to select/deselect a subject.
 * @param {Function} checkPrerequisites - Logic to verify prerequisites.
 * @param {Function} isOfferedThisTerm - Validation for current semester offer.
 */

import React from 'react';
import Badge from '../../../../components/ui/Badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const SubjectSelectionList = ({ categorizedSubjects, selectedSubjectIds, toggleSubject, toggleGroup, checkPrerequisites, isOfferedThisTerm }) => {
  const groups = Object.keys(categorizedSubjects);

  if (groups.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        No subjects found matching your curriculum and semester.
      </div>
    );
  }

  const isGroupFullySelected = (subjects) => {
    const eligible = subjects.filter(s => isOfferedThisTerm(s) && checkPrerequisites(s).met);
    return eligible.length > 0 && eligible.every(s => selectedSubjectIds.includes(s.id));
  };

  const hasEligibleSubjects = (subjects) => {
    return subjects.some(s => isOfferedThisTerm(s) && checkPrerequisites(s).met);
  };

  return (
    <div className="subject-selection-list">
      {Object.entries(categorizedSubjects).map(([group, subjects]) => {
        const fullySelected = isGroupFullySelected(subjects);
        const canSelectGroup = hasEligibleSubjects(subjects);

        return (
          <div key={group} className="subject-group">
            <div className="subject-group-header flex items-center justify-between">
              <span>{group}</span>
              {canSelectGroup && (
                <button 
                  type="button"
                  className={`group-select-btn ${fullySelected ? 'active' : ''}`}
                  onClick={() => toggleGroup(subjects)}
                >
                  {fullySelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {subjects.map(subject => {
              const isSelected = selectedSubjectIds.includes(subject.id);
            const prereq = checkPrerequisites(subject);
            const isOffered = isOfferedThisTerm(subject);
            
            return (
              <div 
                key={subject.id}
                className={`subject-selection-item ${isSelected ? 'selected' : ''} ${(!prereq.met || !isOffered) ? 'opacity-50' : ''}`}
                style={{ cursor: (!prereq.met || !isOffered) ? 'not-allowed' : 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}
                onClick={() => toggleSubject(subject)}
              >
                <div className="flex-1">
                   <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{subject.code}</span>
                      <span className="text-xs text-slate-500">• {subject.total_units} Units</span>
                      {!isOffered && (
                        <Badge variant="ghost" size="sm" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                          Not Offered This Term
                        </Badge>
                      )}
                      {!prereq.met && (
                        <Badge variant="error" size="sm" icon={<AlertCircle size={10}/>}>
                          Missing Prereq
                        </Badge>
                      )}
                   </div>
                   <p className="text-sm text-slate-600 mt-1">{subject.description}</p>
                   {!prereq.met && (
                     <p className="text-[10px] text-red-500 font-medium mt-1">{prereq.reason}</p>
                   )}
                </div>
                <div className="selection-checkbox" style={{ flexShrink: 0, width: '24px', textAlign: 'right' }}>
                   {isSelected && <CheckCircle2 size={16} className="text-success" />}
                   {!isSelected && (!prereq.met || !isOffered) && <AlertCircle size={16} className="text-slate-300" />}
                </div>
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);
};

export default SubjectSelectionList;
