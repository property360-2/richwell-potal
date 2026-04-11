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
import { academicsApi } from '../../../../api/academics';
import { useToast } from '../../../../components/ui/Toast';
import DateSelector from '../../../../components/ui/DateSelector';

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
  fetchStudents
}) => {
  const { addToast } = useToast();
  const [internalCurriculums, setInternalCurriculums] = React.useState([]);
  const [loadingCurriculums, setLoadingCurriculums] = React.useState(false);

  const { 
    register, 
    handleSubmit, 
    reset, 
    watch, 
    setValue, 
    formState: { errors, isSubmitting } 
  } = useForm({
    mode: 'all'
  });

  const selectedProgramId = watch('program');

  React.useEffect(() => {
    const fetchCurriculums = async () => {
      if (!selectedProgramId) {
        setInternalCurriculums([]);
        setValue('curriculum', '');
        return;
      }

      // Reset curriculum selection when program changes
      setValue('curriculum', '');

      try {
        setLoadingCurriculums(true);
        const res = await academicsApi.getCurriculums({ program: selectedProgramId, is_active: true });
        const data = res.data.results || res.data; // Handle both paginated and non-paginated
        setInternalCurriculums(data.map(c => ({ 
          value: c.id, 
          label: c.version_name || c.name // Fallback to name if version_name is missing
        })));
      } catch (err) {
        setInternalCurriculums([]);
        addToast('error', 'Failed to load curriculums for the selected program');
      } finally {
        setLoadingCurriculums(false);
      }
    };

    fetchCurriculums();
  }, [selectedProgramId]);

  const onSubmit = async (data) => {
    try {
      // Combine separate date fields into YYYY-MM-DD
      const dateOfBirth = `${data.birth_year}-${data.birth_month}-${data.birth_day}`;
      const payload = {
        ...data,
        date_of_birth: dateOfBirth
      };

      await studentsApi.manualAdd(payload);
      addToast('success', `Student added! Password set to: ${data.idn}${dateOfBirth.replace(/-/g, '').slice(4, 8)}`);
      onClose();
      reset();
      fetchStudents();
    } catch (err) {
      // Improve error handling: try to look for specific field errors or generic data error
      const errorData = err.response?.data;
      let errorMessage = 'Failed to add student';

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // If it's a field-level error dictionary (e.g. { "idn": ["..."] })
          const fields = Object.keys(errorData);
          if (fields.length > 0) {
            errorMessage = `${fields[0]}: ${errorData[fields[0]][0]}`;
          }
        }
      }
      
      addToast('error', errorMessage);
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
          <DateSelector register={register} errors={errors} label="Date of Birth" className="mt-[-8px]" />
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

        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Curriculum" 
            options={internalCurriculums} 
            {...register('curriculum', { required: 'Required' })} 
            disabled={!selectedProgramId || internalCurriculums.length === 0 || loadingCurriculums} 
            error={errors.curriculum?.message} 
          />
          <Input 
            label="Monthly Commitment" 
            type="number" 
            step="0.01"
            placeholder="e.g. 500.00"
            {...register('monthly_commitment', { 
              required: 'Required',
              min: { value: 0, message: 'Must be at least 0' }
            })} 
            error={errors.monthly_commitment?.message} 
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
