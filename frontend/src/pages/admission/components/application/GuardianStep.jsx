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
        <div className="step-header-icon"><ShieldCheck size={24} /></div>
        <div>
          <h2>Guardian Information</h2>
          <p>Person to contact for emergencies and school updates</p>
        </div>
      </div>

      <div className="form-grid-2">
        <Input 
          label="Guardian / Parent Name" 
          placeholder="e.g. Maria Dela Cruz"
          {...register('guardian_name', { required: 'Guardian name is required' })} 
          error={errors.guardian_name?.message} 
        />
        <Input 
          label="Guardian Contact Number" 
          placeholder="09XXXXXXXXX"
          icon={<Phone size={18} className="text-primary/50" />} 
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

      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3 my-8">
        <ShieldCheck size={18} className="text-orange-600 mt-0.5" />
        <p className="text-xs text-orange-800 leading-relaxed">
          <strong>Privacy Note:</strong> This information will only be used for emergency and administrative communication. We respect your family's data privacy.
        </p>
      </div>
    </div>
  );
};

export default GuardianStep;
