import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { facultyApi } from '../../../api/faculty';
import { useToast } from '../../../components/ui/Toast';
import { Mail, UserCircle, Briefcase, Calendar, Hash } from 'lucide-react';

const ProfessorModal = ({ isOpen, onClose, professor = null, onSuccess }) => {
  const { showToast } = useToast();
  const isEditing = !!professor;
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      department: '',
      employment_status: 'FULL_TIME',
      employee_id: '',
      date_of_birth: '',
      is_active: true
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (professor) {
        reset({
          first_name: professor.user.first_name,
          last_name: professor.user.last_name,
          email: professor.user.email,
          department: professor.department,
          employment_status: professor.employment_status,
          employee_id: professor.employee_id,
          date_of_birth: professor.date_of_birth,
          is_active: professor.is_active
        });
      } else {
        reset({
          first_name: '',
          last_name: '',
          email: '',
          department: '',
          employment_status: 'FULL_TIME',
          employee_id: '',
          date_of_birth: '',
          is_active: true
        });
      }
    }
  }, [isOpen, professor, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await facultyApi.update(professor.id, data);
        showToast('Professor details updated successfully.', 'success');
      } else {
        await facultyApi.create(data);
        showToast('Professor created. Account credentials have been generated.', 'success');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving professor:', error);
      showToast(error.response?.data?.email?.[0] || 'An error occurred while saving the professor.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Professor' : 'Add New Professor'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            icon={UserCircle}
            {...register('first_name', { required: 'First name is required' })}
            error={errors.first_name?.message}
          />
          <Input
            label="Last Name"
            icon={UserCircle}
            {...register('last_name', { required: 'Last name is required' })}
            error={errors.last_name?.message}
          />
        </div>

        <Input
          label="Email Address (Login Username)"
          type="email"
          icon={Mail}
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Employee ID (Optional)"
            icon={Hash}
            helperText="Leave blank to auto-generate (EMP-YYseq)"
            {...register('employee_id')}
          />
          <Input
            label="Date of Birth"
            type="date"
            icon={Calendar}
            helperText="Used for default password generation"
            {...register('date_of_birth', { required: 'Date of birth is required' })}
            error={errors.date_of_birth?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Department"
            icon={Briefcase}
            {...register('department', { required: 'Department is required' })}
            error={errors.department?.message}
          />
          <Select
            label="Employment Status"
            {...register('employment_status')}
            options={[
              { value: 'FULL_TIME', label: 'Full-time' },
              { value: 'PART_TIME', label: 'Part-time' }
            ]}
          />
        </div>

        {isEditing && (
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="is_active"
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
              {...register('is_active')}
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-slate-700 font-medium">
              Account is Active
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Professor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfessorModal;
