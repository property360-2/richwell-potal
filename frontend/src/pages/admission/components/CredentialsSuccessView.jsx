/**
 * Credentials Success View Component
 * Displays the generated Student ID and default password upon successful admission.
 */
import React from 'react';
import { CheckCircle2, Copy, Printer } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

const CredentialsSuccessView = ({ credentials, isOpen, onClose, copyToClipboard }) => {
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
              <span className="credential-value" style={{color: 'var(--color-primary)'}}>{credentials.idn}</span>
              <button 
                onClick={() => copyToClipboard(credentials.idn, 'Student ID')}
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
              <span className="credential-value">{credentials.password}</span>
              <button 
                onClick={() => copyToClipboard(credentials.password, 'Password')}
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
};

export default CredentialsSuccessView;
