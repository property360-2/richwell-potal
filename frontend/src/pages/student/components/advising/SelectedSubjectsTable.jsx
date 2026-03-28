/**
 * Richwell Portal — Selected Subjects Table
 * 
 * Renders the table of subjects or credits that the student is already 
 * advising for or has been credited for.
 * 
 * @param {Object} props
 * @param {Array} props.enrollingGrades - List of current term enrollment grades.
 * @param {string} props.enrollmentStatus - Status of the current enrollment.
 * @param {Function} props.onReset - Callback to reset selection.
 */

import React from 'react';
import Table from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

const SelectedSubjectsTable = ({ enrollingGrades, enrollmentStatus, onReset }) => {
  if (!enrollingGrades || enrollingGrades.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="table-container" style={{ border: 'none' }}>
        <Table 
           columns={[
              { header: 'Code', render: (row) => <span className="font-bold text-slate-800">{row.subject_details?.code}</span> },
              { header: 'Description', render: (row) => (
                   <span className="text-slate-600">
                     {row.subject_details?.description}
                     {row.is_retake && <Badge variant="error" size="sm" style={{ marginLeft: '8px' }}>Retake</Badge>}
                   </span>
              ) },
              { header: 'Units', align: 'center', render: (row) => <span style={{ textAlign: 'center', display: 'block' }}>{row.subject_details?.total_units}</span> },
              { header: 'Status', align: 'center', render: (row) => (
                   <Badge variant={row.grade_status === 'ENROLLED' ? 'success' : 'warning'}>
                     {row.grade_status_display}
                   </Badge>
              ) }
           ]}
           data={enrollingGrades}
        />
      </div>
      
      {enrollmentStatus === 'REJECTED' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p className="font-semibold text-sm">Reason for Rejection:</p>
            <p className="text-sm mt-1">{enrollingGrades[0]?.rejection_reason || "No specific reason provided."}</p>
            <Button 
              variant="ghost" 
              size="sm"
              className="mt-3 text-red-600 hover:bg-red-100"
              onClick={onReset}
            >
              Reset Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedSubjectsTable;
