/**
 * Richwell Portal — Grade Resolution Modals Component
 * 
 * Contains the Reject and Details modals used in the Grade Finalization 
 * dashboard for managing INC resolutions.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';

/**
 * GradeResolutionModals Component
 * 
 * @param {boolean} isRejectModalOpen - Controls rejection modal visibility.
 * @param {Function} setIsRejectModalOpen - Setter for rejection modal state.
 * @param {Object} selectedRes - The resolution object being rejected.
 * @param {string} rejectReason - Current text in the rejection input.
 * @param {Function} setRejectReason - Setter for rejection reason.
 * @param {Function} handleReject - Submission handler for rejection.
 * @param {boolean} isDetailsModalOpen - Controls details modal visibility.
 * @param {Function} setIsDetailsModalOpen - Setter for details modal state.
 * @param {Object} selectedDetails - The resolution object to show details for.
 * @param {boolean} loading - Loading state for async actions.
 */
const GradeResolutionModals = ({
  isRejectModalOpen,
  setIsRejectModalOpen,
  selectedRes,
  rejectReason,
  setRejectReason,
  handleReject,
  isDetailsModalOpen,
  setIsDetailsModalOpen,
  selectedDetails,
  loading
}) => {
  return (
    <>
      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Resolution Request"
      >
        <div className="space-y-4 p-4">
          <p className="text-sm text-slate-500">
            Please provide a reason for rejecting the resolution request for <strong>{selectedRes?.student_name}</strong>.
          </p>
          <Input
            multiline
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ height: '120px' }}
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button 
              variant="danger" 
              onClick={handleReject}
              loading={loading}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Resolution Details"
      >
        <div className="p-5 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student Information</h4>
              <p className="font-bold text-slate-800 text-lg">{selectedDetails?.student_name}</p>
              <p className="font-mono text-sm text-slate-500">{selectedDetails?.student_idn}</p>
            </div>
            <Badge variant={selectedDetails?.remaining_days <= 30 ? "danger" : "info"}>
              {selectedDetails?.remaining_days || 0} Days Left
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</p>
              <p className="text-sm font-bold text-slate-700">{selectedDetails?.subject_details?.code}</p>
              <p className="text-xs text-slate-500 truncate">{selectedDetails?.subject_details?.name}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Original Term</p>
              <p className="text-sm font-bold text-slate-700">{selectedDetails?.term_details?.name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">{selectedDetails?.term_details?.code}</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <div className="text-xs text-amber-900">
              <p className="font-bold mb-1 uppercase tracking-tight text-amber-700">Resolution Deadline</p>
              <p>This INC grade will lapse on <strong>{selectedDetails?.inc_deadline}</strong>.</p>
              <p className="mt-1 opacity-75 italic">Once lapsed, the grade will automatically convert to a **RETAKE** status if not resolved.</p>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" fullWidth onClick={() => setIsDetailsModalOpen(false)}>Close Overview</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GradeResolutionModals;
