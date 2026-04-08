/**
 * Applicant Info Summary Component
 * Displays the applicant's personal information and academic profile in a grid format.
 */
import React from 'react';
import { User, GraduationCap } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

const DataRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className="info-value">{value || 'N/A'}</span>
  </div>
);

const ApplicantInfoSummary = ({ applicant }) => {
  return (
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
  );
};

export default ApplicantInfoSummary;
