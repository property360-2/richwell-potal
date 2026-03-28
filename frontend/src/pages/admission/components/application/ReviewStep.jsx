/**
 * ReviewStep — Step 5 (Final) of the student application form.
 * 
 * This component displays a summary of all user inputs for final review 
 * before submission, organized into information sections.
 * 
 * @param {Object} props - Component props.
 * @param {Object} props.values - Current form values from react-hook-form.
 * @param {Function} props.getProgramName - Resolver to get program name by ID.
 * @returns {JSX.Element} The rendered step content.
 */

import React from 'react';
import { Send } from 'lucide-react';

const ReviewStep = ({ values, getProgramName }) => {
  return (
    <div className="apply-step-card" key="step-5">
      <div className="step-header">
        <div className="step-header-icon"><Send size={20} /></div>
        <div>
          <h2>Review & Submit</h2>
          <p>Please verify all information before submitting</p>
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">Personal Information</div>
        <div className="review-grid">
          <ReviewItem label="First Name" value={values.first_name} />
          <ReviewItem label="Middle Name" value={values.middle_name} />
          <ReviewItem label="Last Name" value={values.last_name} />
          <ReviewItem label="Date of Birth" value={values.date_of_birth} />
          <ReviewItem label="Gender" value={values.gender} />
          <ReviewItem label="Student Type" value={values.student_type} />
          {values.student_type === 'TRANSFEREE' && (
            <ReviewItem label="Previous School" value={values.previous_school} />
          )}
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">Contact & Address</div>
        <div className="review-grid">
          <ReviewItem label="Email" value={values.email} />
          <ReviewItem label="Contact Number" value={values.contact_number} />
          <ReviewItem label="Municipality" value={values.address_municipality} />
          <ReviewItem label="Barangay" value={values.address_barangay} />
          <ReviewItem label="Full Address" value={values.address_full} />
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">Academic Preference</div>
        <div className="review-grid">
          <ReviewItem label="Program" value={getProgramName(values.program)} />
        </div>
      </div>

      <div className="review-section">
        <div className="review-section-title">Guardian Information</div>
        <div className="review-grid">
          <ReviewItem label="Guardian Name" value={values.guardian_name} />
          <ReviewItem label="Guardian Contact" value={values.guardian_contact} />
        </div>
      </div>

      <div className="certification-card">
        <p>
          By submitting this application, I certify that all information provided is 
          <strong> true and correct</strong>. I understand that any false information 
          may be grounds for rejection of my application.
        </p>
      </div>
    </div>
  );
};

/**
 * ReviewItem — Helper component for rendering a labeled piece of data in the review summary.
 */
const ReviewItem = ({ label, value }) => (
  <div className="review-item">
    <div className="review-label">{label}</div>
    <div className={`review-value ${!value ? 'empty' : ''}`}>
      {value || 'Not provided'}
    </div>
  </div>
);

export default ReviewStep;
