/**
 * Richwell Portal — Add Student Modal Component
 * 
 * Provides a manual entry form for registrars to add new students to the 
 * system, with validation for unique identifiers like IDN and email.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Button from '../../../../components/ui/Button';
import { studentsApi } from '../../../../api/students';
import { useToast } from '../../../../components/ui/Toast';

/**
 * AddStudentModal Component
 * 
 * @param {boolean} isOpen - Modal visibility state.
 * @param {Function} onClose - Close handler.
 * @param {Array} programs - List of academic programs.
 * @param {Array} curriculums - List of curriculums for the selected program.
 * @param {string} selectedProgram - The currently selected program ID.
 * @param {Function} fetchStudents - Callback to refresh the student list.
 */
const AddStudentModal = ({
  isOpen,
  onClose,
  programs,
  curriculums,
  selectedProgram,
  fetchStudents
}) => {
  const { addToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: 'onBlur'
  });

  const onSubmit = async (data) => {
    try {
      await studentsApi.manualAdd(data);
      addToast('success', `Student added! Password set to: ${data.idn}${data.date_of_birth.replace(/-/g, '').slice(4, 8)}`);
      onClose();
      reset();
      fetchStudents();
    } catch (err) {
      addToast('error', err.response?.data?.error || 'Failed to add student');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Student Entry">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} />
          <Input label="Last Name" {...register('last_name', { required: 'Required' })} error={errors.last_name?.message} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Email" 
            type="email" 
            {...register('email', { 
              required: 'Required',
              validate: async (value) => {
                if (!value) return true;
                try {
                  const res = await studentsApi.checkEmail(value);
                  return res.data.exists ? 'Email is already taken' : true;
                } catch (err) { return true; }
              }
            })} 
            error={errors.email?.message} 
          />
          <Input label="Date of Birth" type="date" {...register('date_of_birth', { required: 'Required' })} error={errors.date_of_birth?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Student ID (IDN)" 
            {...register('idn', { 
              required: 'IDN is required',
              validate: async (value) => {
                if (!value) return true;
                try {
                  const res = await studentsApi.checkIdn(value);
                  return res.data.exists ? 'Student ID already exists' : true;
                } catch (err) { return true; }
              }
            })} 
            error={errors.idn?.message} 
            placeholder="e.g. 260011" 
          />
          <Select 
            label="Gender" 
            options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }]} 
            {...register('gender', { required: 'Required' })} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Student Type" 
            options={[
              { value: 'REGULAR', label: 'Regular Freshman' }, 
              { value: 'TRANSFEREE', label: 'Transferee' },
              { value: 'CURRENT', label: 'Current Student' },
              { value: 'RETURNING', label: 'Returning Student' }
            ]} 
            {...register('student_type', { required: 'Required' })} 
          />
          <Select label="Program" options={programs} {...register('program', { required: 'Required' })} error={errors.program?.message} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Select 
            label="Curriculum" 
            options={curriculums} 
            {...register('curriculum', { required: 'Required' })} 
            disabled={!selectedProgram || curriculums.length === 0} 
            error={errors.curriculum?.message} 
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Add Student</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddStudentModal;
