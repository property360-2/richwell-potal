/**
 * PersonalInfoStep — Step 1 of the student application form.
 * 
 * This component renders fields for first/middle/last name, DOB, gender, 
 * student type, and previous school if the student is a transferee.
 * 
 * @param {Object} props - Component props.
 * @param {Function} props.register - React Hook Form's register function.
 * @param {Object} props.errors - React Hook Form's current error state.
 * @param {string} props.studentType - The current 'student_type' watch value.
 * @returns {JSX.Element} The rendered step content.
 */

import React from 'react';
import { User, GraduationCap } from 'lucide-react';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import DateSelector from '../../../../components/ui/DateSelector';

const PersonalInfoStep = ({ register, errors, studentType }) => {
  return (
    <div className="apply-step-card" key="step-1">
      <div className="step-header">
        <div className="step-header-icon"><User size={24} /></div>
        <div>
          <h2>Personal Information</h2>
          <p>Provide your legal identity as it appears on official documents</p>
        </div>
      </div>

      <div className="form-grid-3">
        <Input 
          label="First Name" 
          placeholder="e.g. Juan"
          {...register('first_name', { required: 'First name is required' })} 
          error={errors.first_name?.message} 
        />
        <Input 
          label="Middle Name" 
          placeholder="e.g. Santos (Optional)"
          {...register('middle_name')} 
        />
        <Input 
          label="Last Name" 
          placeholder="e.g. Dela Cruz"
          {...register('last_name', { required: 'Last name is required' })} 
          error={errors.last_name?.message} 
        />
      </div>

      <DateSelector register={register} errors={errors} />

      <div className="form-grid-2 form-row">
        <Select 
          label="Gender" 
          {...register('gender', { required: 'Gender is required' })} 
          options={[
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' },
            { value: 'OTHER', label: 'Other' }
          ]}
          error={errors.gender?.message}
        />
        <Select 
          label="Student Type" 
          {...register('student_type', { required: 'Student type is required' })} 
          options={[
            { value: 'FRESHMAN', label: 'Freshman' },
            { value: 'TRANSFEREE', label: 'Transferee' }
          ]}
          error={errors.student_type?.message}
        />
      </div>

      {studentType === 'TRANSFEREE' && (
        <div className="form-row pt-4 border-t border-slate-50 mt-6">
          <Input 
            label="Previous School / University" 
            placeholder="Name of last institution attended"
            icon={<GraduationCap size={18} className="text-primary/50" />}
            {...register('previous_school', { required: 'Previous school is required for transferees' })} 
            error={errors.previous_school?.message} 
          />
        </div>
      )}
    </div>
  );
};

export default PersonalInfoStep;
