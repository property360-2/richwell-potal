/**
 * Applicant Details Modal 
 * Main orchestration component for reviewing and admitting an applicant.
 * Wraps modular sub-components for header, info, approval, checklist, and success states.
 */
import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';

// Sub-components
import ApplicantHeader from './ApplicantHeader';
import ApplicantInfoSummary from './ApplicantInfoSummary';
import AdmissionApprovalPanel from './AdmissionApprovalPanel';
import DocumentChecklist from './DocumentChecklist';
import CredentialsSuccessView from './CredentialsSuccessView';

import './ApplicantDetailsModal.css';

const ApplicantDetailsModal = ({ isOpen, onClose, onSuccess, applicant }) => {
  const [checklist, setChecklist] = useState({});
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [admissionCredentials, setAdmissionCredentials] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (applicant) {
      setChecklist(applicant.document_checklist || {});
      setAdmissionCredentials(null);
      setMonthlyCommitment('');
    }
  }, [applicant, isOpen]);

  const toggleDocument = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        submitted: !prev[key].submitted
      }
    }));
  };

  const handleUpdateChecklist = async () => {
    try {
      await studentsApi.updateStudent(applicant.id, { document_checklist: checklist });
      addToast('success', 'Document checklist updated');
    } catch (err) {
      addToast('error', 'Failed to update checklist');
    }
  };

  const handleAdmit = async () => {
    if (!monthlyCommitment) {
      addToast('error', 'Please enter the monthly commitment amount');
      return;
    }
    if (!window.confirm('Admit this applicant? This will generate their Student ID and account.')) return;
    
    try {
      setIsAdmitting(true);
      // First save the checklist to be sure
      await studentsApi.updateStudent(applicant.id, { document_checklist: checklist });
      const res = await studentsApi.admit(applicant.id, { monthly_commitment: monthlyCommitment });
      
      setAdmissionCredentials(res.data.credentials);
      addToast('success', `Student admitted! IDN: ${res.data.credentials.idn}`);
      onSuccess();
    } catch (err) {
      addToast('error', err.response?.data?.error || 'Failed to admit student');
    } finally {
      setIsAdmitting(false);
    }
  };

  const markAll = (submitted) => {
    setChecklist(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = { ...prev[key], submitted };
      });
      return updated;
    });
  };

  if (!applicant) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    addToast('success', `${label} copied to clipboard`);
  };

  if (admissionCredentials) {
    return (
      <CredentialsSuccessView 
        credentials={admissionCredentials}
        isOpen={isOpen}
        onClose={onClose}
        copyToClipboard={copyToClipboard}
      />
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Applicant Review"
      size="xl"
    >
      <div className="applicant-modal-content">
        <ApplicantHeader applicant={applicant} />

        <div className="applicant-grid">
           <div className="applicant-main-col">
              <ApplicantInfoSummary applicant={applicant} />
              
              <AdmissionApprovalPanel 
                monthlyCommitment={monthlyCommitment}
                setMonthlyCommitment={setMonthlyCommitment}
              />
           </div>

           <DocumentChecklist 
              checklist={checklist}
              onToggle={toggleDocument}
              onMarkAll={markAll}
              onSave={handleUpdateChecklist}
           />
        </div>

        {/* Sticky Footer */}
        <div className="modal-footer-actions">
          <Button variant="ghost" className="text-muted" onClick={onClose}>
            Cancel Review
          </Button>
          
          <Button 
            variant="primary" 
            onClick={handleAdmit} 
            loading={isAdmitting}
            icon={<ShieldCheck size={20} />}
            disabled={!monthlyCommitment}
          >
            Admit & Finalize Registration
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ApplicantDetailsModal;
