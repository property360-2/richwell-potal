import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Button from '../../../../components/ui/Button';
import { facultyApi } from '../../../../api/faculty';
import { useToast } from '../../../../components/ui/Toast';
import { Mail, UserCircle, Briefcase, Calendar, Hash } from 'lucide-react';

const ProfessorModal = ({ isOpen, onClose, professor = null, onSuccess }) => {
  const { showToast } = useToast();
  const isEditing = !!professor;
  
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
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
      const errorData = error.response?.data;
      if (error.response?.status === 400 && errorData && typeof errorData === 'object') {
        Object.keys(errorData).forEach((field) => {
          if (['first_name', 'last_name', 'email', 'department', 'date_of_birth', 'employee_id'].includes(field)) {
            setError(field, {
              type: 'manual',
              message: Array.isArray(errorData[field]) ? errorData[field][0] : errorData[field]
            });
          }
        });
        showToast('Please correct the errors in the form', 'error');
      } else {
        showToast(errorData?.detail || 'An error occurred while saving the professor.', 'error');
      }
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            Save Professor
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfessorModal;
