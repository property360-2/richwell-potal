/**
 * GuardianStep — Step 4 of the student application form.
 * 
 * This component renders fields for the student's parent or guardian details, 
 * including full name and contact number with validation.
 * 
 * @param {Object} props - Component props.
 * @param {Function} props.register - React Hook Form's register function.
 * @param {Object} props.errors - React Hook Form's current error state.
 * @param {Function} props.handlePhoneInput - Sanitizer for phone input fields.
 * @returns {JSX.Element} The rendered step content.
 */

import React from 'react';
import { ShieldCheck, Phone } from 'lucide-react';
import Input from '../../../../components/ui/Input';

const GuardianStep = ({ register, errors, handlePhoneInput }) => {
  return (
    <div className="apply-step-card" key="step-4">
      <div className="step-header">
        <div className="step-header-icon"><ShieldCheck size={20} /></div>
        <div>
          <h2>Guardian Information</h2>
          <p>Parent or guardian details</p>
        </div>
      </div>

      <div className="form-grid-2">
        <Input 
          label="Guardian / Parent Name" 
          placeholder="Full name"
          {...register('guardian_name', { required: 'Guardian name is required' })} 
          error={errors.guardian_name?.message} 
        />
        <Input 
          label="Guardian Contact Number" 
          placeholder="09XXXXXXXXX"
          icon={<Phone size={16} />} 
          maxLength={11}
          onInput={handlePhoneInput}
          {...register('guardian_contact', { 
            required: 'Guardian contact is required',
            pattern: {
              value: /^09\d{9}$/,
              message: "Must be 11 digits starting with 09"
            }
          })} 
          error={errors.guardian_contact?.message} 
        />
      </div>
    </div>
  );
};

export default GuardianStep;
