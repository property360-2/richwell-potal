/**
 * @file StaffModal.jsx
 * @description Modal component for adding or editing staff members.
 * It uses react-hook-form for validation and handles interaction with the staff API.
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import api from '../../../api/axios';
import { useToast } from '../../../components/ui/Toast';

const ROLE_OPTIONS = [
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'HEAD_REGISTRAR', label: 'Head Registrar' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'DEAN', label: 'Dean' },
  { value: 'PROGRAM_HEAD', label: 'Program Head' },
  { value: 'ADMIN', label: 'Admin' },
];

const REGISTRAR_ONLY_OPTIONS = [
  { value: 'REGISTRAR', label: 'Registrar' },
];

/**
 * StaffModal Component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Is modal open
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.staffMember - Staff member to edit (null for add)
 * @param {Function} props.onSuccess - Callback on successful save
 * @param {string} props.currentUserRole - Role of the currently logged-in user
 * @returns {JSX.Element}
 */
const StaffModal = ({ isOpen, onClose, staffMember, onSuccess, currentUserRole }) => {
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (staffMember) {
      setValue('username', staffMember.username);
      setValue('email', staffMember.email);
      setValue('first_name', staffMember.first_name);
      setValue('last_name', staffMember.last_name);
      setValue('role', staffMember.role);
      setValue('is_active', staffMember.is_active ? 'true' : 'false');
    } else {
      reset({ is_active: 'true' });
    }
  }, [staffMember, isOpen, reset, setValue]);

  /**
   * Handles form submission to create or update a staff member.
   * @param {Object} data - Form data
   */
  const onSubmit = async (data) => {
    data.is_active = data.is_active === 'true';
    
    try {
      if (staffMember?.id) {
        await api.patch(`accounts/staff/${staffMember.id}/`, data);
        showToast('success', 'Staff updated successfully');
      } else {
        await api.post('accounts/staff/', data);
        showToast('success', 'Staff created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const errorData = err.response?.data;
      
      if (err.response?.status === 400 && errorData && typeof errorData === 'object') {
        Object.keys(errorData).forEach((field) => {
          if (['username', 'email', 'first_name', 'last_name', 'role'].includes(field)) {
            setError(field, {
              type: 'manual',
              message: Array.isArray(errorData[field]) ? errorData[field][0] : errorData[field]
            });
          }
        });
        showToast('error', 'Please correct the errors in the form');
      } else {
        const msg = errorData?.detail || 'Failed to save staff';
        showToast('error', msg);
      }
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={staffMember ? 'Edit Staff Member' : 'Add New Staff'}
    >
      <form id="staff-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            error={errors.first_name?.message}
            {...register('first_name', { required: 'First name is required' })}
          />
          <Input
            label="Last Name"
            error={errors.last_name?.message}
            {...register('last_name', { required: 'Last name is required' })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username (Login ID)"
            disabled={!!staffMember}
            error={errors.username?.message}
            {...register('username', { required: 'Username is required' })}
          />
          <Input
            label="Email Address"
            type="email"
            error={errors.email?.message}
            {...register('email', { 
              required: 'Email is required',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            options={currentUserRole === 'HEAD_REGISTRAR' ? REGISTRAR_ONLY_OPTIONS : ROLE_OPTIONS}
            error={errors.role?.message}
            {...register('role', { required: 'Role is required' })}
          />
          {staffMember && (
            <Select
              label="Status"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              {...register('is_active')}
            />
          )}
        </div>
        
        {!staffMember && (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 flex rounded-md">
            Note: The initial password will be auto-generated as [Username]1234.
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {staffMember ? 'Save Changes' : 'Create Staff'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StaffModal;
