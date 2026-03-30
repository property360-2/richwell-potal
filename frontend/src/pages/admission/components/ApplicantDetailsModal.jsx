import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  MapPin, 
  Mail,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Check,
  Copy, 
  Printer
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';
import Input from '../../../components/ui/Input';
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
      <Modal isOpen={isOpen} onClose={onClose} title="Account Created Successfully" size="md">
        <div className="credentials-success">
          <div className="credentials-success-icon">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <h3 className="credentials-success-title">Student Admitted!</h3>
            <p className="credentials-success-subtitle">The following student account has been generated. Please provide these credentials to the student.</p>
          </div>

          <div className="credentials-box">
            <div className="credential-item">
              <span className="credential-label">Student ID (IDN)</span>
              <div className="credential-value-wrap">
                <span className="credential-value" style={{color: 'var(--color-primary)'}}>{admissionCredentials.idn}</span>
                <button 
                  onClick={() => copyToClipboard(admissionCredentials.idn, 'Student ID')}
                  className="credential-copy"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="credential-divider"></div>

            <div className="credential-item">
              <span className="credential-label">Default Password</span>
              <div className="credential-value-wrap">
                <span className="credential-value">{admissionCredentials.password}</span>
                <button 
                  onClick={() => copyToClipboard(admissionCredentials.password, 'Password')}
                  className="credential-copy"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="credentials-actions">
            <Button variant="primary" style={{width: '100%'}} onClick={() => { window.print(); }} icon={<Printer size={18} />}>
              Print Credentials
            </Button>
            <Button variant="ghost" style={{width: '100%'}} onClick={onClose}>
              Close and Refresh List
            </Button>
          </div>
        </div>
      </Modal>
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
        {/* Enhanced Identity Header */}
        <div className="applicant-header">
          <div className="applicant-header-bg"></div>
          
          <div className="applicant-identity">
            <div className="applicant-avatar">
               {applicant.user.first_name[0]}{applicant.user.last_name[0]}
            </div>
            <div>
               <div className="applicant-name-wrap">
                 <h3 className="applicant-name">
                   {applicant.user.first_name} {applicant.user.last_name}
                 </h3>
                 <Badge variant="warning" style={{ fontSize: '10px' }}>Pending Admission</Badge>
               </div>
               <div className="applicant-email">
                 <Mail size={14} />
                 <span>{applicant.user.email}</span>
               </div>
            </div>
          </div>

          <div className="applicant-meta">
            <div className="meta-box">
              <span className="meta-label">Status</span>
              <span className="meta-value" style={{color: 'var(--color-warning)'}}>Applicant</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Applied</span>
              <span className="meta-value">{new Date(applicant.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="applicant-grid">
           {/* Left/Main Column: Information Summary */}
           <div className="applicant-main-col">
              {/* Detailed Information Grid */}
              <div className="info-cards-row">
                <section className="info-card">
                   <h4 className="info-card-header">
                      <User size={14} /> Personal Information
                   </h4>
                   <div className="info-content">
                      <DataRow label="Gender" value={applicant.gender} />
                      <DataRow label="Birthdate" value={new Date(applicant.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                      <DataRow label="Municipality" value={applicant.address_municipality} />
                      <DataRow label="Contact" value={applicant.contact_number} />
                   </div>
                </section>

                <section className="info-card">
                   <h4 className="info-card-header">
                      <GraduationCap size={14} /> Academic Profile
                   </h4>
                   <div className="info-content">
                      <div className="info-row" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                         <span className="info-label">Preferred Program</span>
                         <span className="info-value" style={{textAlign: 'left'}}>{applicant.program_details?.code}</span>
                         <span style={{fontSize: '12px', color: '#64748b', marginTop: '4px'}}>{applicant.program_details?.name}</span>
                      </div>
                      <DataRow label="Curriculum" value={applicant.curriculum_details?.version_name || 'V1 (Auto)'} />
                      <div className="info-row" style={{alignItems: 'center'}}>
                        <span className="info-label">Student Type</span>
                        <Badge variant={applicant.student_type === 'FRESHMAN' ? 'primary' : 'warning'}>{applicant.student_type}</Badge>
                      </div>
                   </div>
                </section>
              </div>

              {/* Admission Approval Step */}
              <section className="admission-panel">
                 <ShieldCheck size={100} className="admission-panel-icon" />
                 
                 <div style={{position: 'relative', zIndex: 10}}>
                   <h4 className="admission-panel-title">
                      <CheckCircle2 size={16} /> Final Review & Admission
                   </h4>
                   <p>
                     Verify all documents below before admitting. You must specify the <strong>Monthly Payment Commitment</strong> for the financial agreement.
                   </p>
                   
                   <div className="admission-input-wrapper">
                      <Input 
                        label="Monthly Payment Commitment" 
                        type="number" 
                        placeholder="e.g. 5000"
                        value={monthlyCommitment}
                        onChange={(e) => setMonthlyCommitment(e.target.value)}
                        icon={<span style={{fontWeight: 'bold', color: '#94a3b8'}}>₱</span>}
                      />
                   </div>
                 </div>
              </section>
           </div>

           {/* Right Column: Interactive Checklist */}
           <div style={{height: '100%'}}>
             <section className="checklist-panel">
                <div className="checklist-header">
                  <h4 className="checklist-title">
                     <FileText size={14} style={{color: 'var(--color-primary)'}} /> Document Tracking
                  </h4>
                  <div className="checklist-actions">
                    <button type="button" onClick={() => markAll(true)} className="checklist-btn primary">All</button>
                    <button type="button" onClick={() => markAll(false)} className="checklist-btn secondary">Clear</button>
                  </div>
                </div>

                <div className="checklist-items">
                   {Object.keys(checklist).map(key => {
                      const isChecked = checklist[key].submitted;
                      return (
                      <label 
                        key={key} 
                        className={`checklist-item ${isChecked ? 'checked' : ''}`}
                      >
                         <div className="check-box-icon">
                            {isChecked && <Check size={14} strokeWidth={4} />}
                         </div>

                         <span className="check-label">
                            {key.replace(/_/g, ' ')}
                         </span>

                         {isChecked && <div className="check-verified-badge">Verified</div>}

                         <input 
                           type="checkbox" 
                           checked={isChecked} 
                           onChange={() => toggleDocument(key)}
                           style={{display: 'none'}}
                         />
                      </label>
                   )})}
                </div>
                
                <div className="checklist-save-btn">
                  <Button variant="secondary" style={{width: '100%'}} onClick={handleUpdateChecklist}>
                    Save Progress Only
                  </Button>
                </div>
             </section>
           </div>
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

const DataRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className="info-value">{value || 'N/A'}</span>
  </div>
);

export default ApplicantDetailsModal;
