/**
 * Richwell Portal — Advising Summary Card
 * 
 * Displays the current enrollment status, program info, and total unit 
 * calculations. It alerts the student if they exceed unit limits.
 * 
 * @param {Object} props
 * @param {Object} props.enrollment - The student's current enrollment record.
 * @param {boolean} props.isRegular - Whether the student is regular or irregular.
 * @param {number} props.totalUnits - Total calculated units from selection.
 * @param {boolean} props.loading - Loading state for the action button.
 * @param {string} props.enrollmentStatus - Status for submission lock.
 * @param {Array} props.selectedSubjectIds - IDs of currently selected subjects.
 * @param {Function} props.onSubmit - Submission callback for irregular selection.
 */

import React from 'react';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

const AdvisingSummaryCard = ({ enrollment, isRegular, totalUnits, loading, enrollmentStatus, selectedSubjectIds, onSubmit }) => {
  const isUnlocked = enrollment?.student_details?.is_advising_unlocked;
  const isOverlimit = totalUnits > 30;

  return (
    <Card title="Advising Summary">
      <div className="summary-card-content space-y-4">
        <div className="summary-item flex justify-between">
          <span className="summary-label text-slate-500 font-medium">Student ID</span>
          <span className="summary-value font-bold">{enrollment?.student_details?.idn}</span>
        </div>
        <div className="summary-item flex justify-between">
          <span className="summary-label text-slate-500 font-medium">Program</span>
          <span className="summary-value font-bold">{enrollment?.student_details?.program_details?.code}</span>
        </div>
        <div className="summary-item flex justify-between">
          <span className="summary-label text-slate-500 font-medium">Year Level</span>
          <span className="summary-value font-bold">{enrollment?.year_level || '1'}</span>
        </div>
        <div className="summary-item flex justify-between">
          <span className="summary-label text-slate-500 font-medium">Study Type</span>
          <Badge variant="ghost">{isRegular ? 'Regular' : 'Irregular'}</Badge>
        </div>
        
        <div className="summary-divider border-t border-slate-100 my-4"></div>
        
        <div className="total-units-display flex justify-between items-center">
          <span className="summary-label text-slate-500 font-medium">Total Units</span>
          <span className={`total-units-value text-xl font-bold ${isOverlimit ? 'text-red-600' : 'text-blue-600'}`}>
            {totalUnits}
          </span>
        </div>

        {isOverlimit && (
           <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2">
             <AlertCircle size={14} className="shrink-0" />
             Exceeds 30 units limit. Please remove some subjects.
           </div>
        )}

        {enrollmentStatus !== 'APPROVED' && !isRegular && (
          <Button 
            className="w-full mt-2" 
            disabled={selectedSubjectIds.length === 0 || isOverlimit || !isUnlocked}
            onClick={onSubmit}
            loading={loading}
          >
            {!isUnlocked ? 'Locked by Registrar' : 'Submit for Approval'}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default AdvisingSummaryCard;
