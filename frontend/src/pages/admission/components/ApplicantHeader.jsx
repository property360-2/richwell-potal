/**
 * Applicant Header Component
 * Displays the applicant's basic identity information, avatar, and current status.
 */
import React from 'react';
import { Mail } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

const ApplicantHeader = ({ applicant }) => {
  return (
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
  );
};

export default ApplicantHeader;
