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
import { Send, User, MapPin, GraduationCap, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';

const ReviewStep = ({ values, getProgramName, register, errors }) => {
  return (
    <div className="apply-step-card" key="step-5">
      <div className="step-header">
        <div className="step-header-icon"><Send size={24} /></div>
        <div>
          <h2>Review & Submit</h2>
          <p>Please verify all information before finishing your application</p>
        </div>
      </div>

      <div className="space-y-10">
        <section className="review-section">
          <div className="review-section-header">
            <User size={14} className="text-primary" />
            <h4 className="review-section-title">Personal Information</h4>
          </div>
          <div className="review-grid">
            <ReviewItem label="First Name" value={values.first_name} />
            <ReviewItem label="Middle Name" value={values.middle_name} />
            <ReviewItem label="Last Name" value={values.last_name} />
            <ReviewItem 
              label="Date of Birth" 
              value={values.birth_month && values.birth_day && values.birth_year ? 
                `${values.birth_month}/${values.birth_day}/${values.birth_year}` : 
                values.date_of_birth
              } 
              icon={<Calendar size={14} />}
            />
            <ReviewItem label="Gender" value={values.gender} />
            <ReviewItem label="Student Type" value={values.student_type} />
            {values.student_type === 'TRANSFEREE' && (
              <ReviewItem label="Previous School" value={values.previous_school} />
            )}
          </div>
        </section>

        <section className="review-section">
          <div className="review-section-header">
            <MapPin size={14} className="text-primary" />
            <h4 className="review-section-title">Contact & Address</h4>
          </div>
          <div className="review-grid">
            <ReviewItem label="Email" value={values.email} />
            <ReviewItem label="Contact Number" value={values.contact_number} />
            <ReviewItem label="Municipality" value={values.address_municipality} />
            <ReviewItem label="Barangay" value={values.address_barangay} />
            <div className="review-item col-span-2">
               <div className="review-label">Full Address</div>
               <div className="review-value">{values.address_full}</div>
            </div>
          </div>
        </section>

        <section className="review-section">
          <div className="review-section-header">
            <GraduationCap size={14} className="text-primary" />
            <h4 className="review-section-title">Academic Preference</h4>
          </div>
          <div className="review-grid">
            <ReviewItem label="Preferred Program" value={getProgramName(values.program)} />
          </div>
        </section>

        <section className="review-section">
          <div className="review-section-header">
            <ShieldCheck size={14} className="text-primary" />
            <h4 className="review-section-title">Guardian Information</h4>
          </div>
          <div className="review-grid">
            <ReviewItem label="Guardian Name" value={values.guardian_name} />
            <ReviewItem label="Guardian Contact" value={values.guardian_contact} />
          </div>
        </section>
      </div>

      <div className="certification-card">
        <label className="confirmation-checkbox-wrap">
          <input 
            type="checkbox" 
            className="confirmation-checkbox"
            {...register('confirm_details', { required: true })}
          />
          <div className="confirmation-text">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-primary/60 mt-0.5 shrink-0" />
              <p>
                By submitting this application, I certify that all information provided is 
                <strong> true and correct</strong>. I understand that any false information 
                may be grounds for rejection of my application.
              </p>
            </div>
            {errors.confirm_details && (
              <span className="checkbox-error mt-2 block text-xs font-bold text-red-500">
                You must confirm your details before submitting.
              </span>
            )}
          </div>
        </label>
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
