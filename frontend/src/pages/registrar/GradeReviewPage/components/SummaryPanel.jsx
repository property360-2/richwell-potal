/**
 * SummaryPanel.jsx
 * 
 * Side panel for GradeReviewPage. Displays section metadata and the finalization status.
 */

import React from 'react';
import { CheckCircle, Layers } from 'lucide-react';
import Card from '../../../../components/ui/Card';

/**
 * SummaryPanel Component
 * 
 * @param {Object} props
 * @param {Object} props.meta - Metadata about the section/subject being reviewed
 * @param {Number} props.totalCount - Total number of enrolled students
 */
const SummaryPanel = ({ meta, totalCount }) => {
  return (
    <div className="space-y-6">
      <Card title="Review Summary" className="border-none shadow-xl shadow-slate-200/50">
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="text-emerald-800 font-bold flex items-center gap-2 mb-1">
              <CheckCircle size={16} />
              Ready for Finalization
            </div>
            <p className="text-xs text-emerald-600 leading-relaxed text-pretty">
              All students in this section have submitted grades. Please verify the accuracy before locking.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-slate-50">
              <span className="text-slate-500">Section</span>
              <span className="font-bold text-slate-800">{meta.sectionName}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-slate-50">
              <span className="text-slate-500">Subject Code</span>
              <span className="font-bold text-slate-800">{meta.subjectCode}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-slate-500">Total Enrolled</span>
              <span className="font-bold text-slate-800">{totalCount}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Layers size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 mb-1">Permanent Action</h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            Once finalized, grades for this section and subject cannot be changed by the professor. 
            Only official Resolution Requests can unlock them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
