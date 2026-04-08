/**
 * TransferModal.jsx
 * 
 * Logic and UI for transferring official student primary section assignment.
 */

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import Select from '../../../../components/ui/Select';
import Button from '../../../../components/ui/Button';

/**
 * TransferModal Component
 * 
 * @param {Object} props
 * @param {Boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.student - Data for student being transferred
 * @param {Array} props.sections - Available target sections
 * @param {Object} props.currentSection - Student's current section assignment
 * @param {Boolean} props.loading - Transfer in-progress state
 * @param {Function} props.onConfirm - Confirm transfer callback
 */
const TransferModal = ({ 
  isOpen, 
  onClose, 
  student, 
  sections, 
  currentSection, 
  loading, 
  onConfirm 
}) => {
  const [targetId, setTargetId] = useState('');

  const handleConfirm = () => {
    onConfirm(targetId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Student"
    >
      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</div>
          <div className="font-bold text-slate-800 uppercase">{student?.student_name}</div>
          <div className="text-xs text-slate-500">{student?.student_idn}</div>
        </div>

        <Select 
          label="Select Target Section"
          placeholder="Choose a section..."
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          options={sections
            .filter(s => s.id !== currentSection?.id && s.program === currentSection?.program && s.year_level === currentSection?.year_level)
            .map(s => ({
              value: s.id,
              label: `${s.name} (${s.student_count}/${s.max_students})`
            }))
          }
        />

        <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 flex gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-[10px] font-bold leading-relaxed uppercase">
            Transferring a student will update their primary section and all associated subject schedules.
          </p>
        </div>

        <div className="flex gap-3 justify-end mt-8">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleConfirm}>Complete Transfer</Button>
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;
