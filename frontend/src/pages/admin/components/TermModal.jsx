import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';
import { termsApi } from '../../../api/terms';

const TermModal = ({ isOpen, onClose, onSuccess, term }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { showToast } = useToast();

  useEffect(() => {
    if (term) {
      Object.keys(term).forEach(key => setValue(key, term[key]));
    } else {
      reset({
        code: '',
        academic_year: '',
        semester_type: '1',
        start_date: '',
        end_date: '',
        enrollment_start: '',
        enrollment_end: '',
        advising_start: '',
        advising_end: '',
        is_active: false
      });
    }
  }, [term, isOpen, reset, setValue]);

  const onSubmit = async (data) => {
    try {
      if (term) {
        await termsApi.updateTerm(term.id, data);
        showToast('success', 'Term updated successfully');
      } else {
        await termsApi.createTerm(data);
        showToast('success', 'Term created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save term');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={term ? 'Edit Academic Term' : 'Create New Academic Term'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Term Code" 
            placeholder="e.g., 2027-1" 
            {...register('code', { required: 'Code is required' })}
            error={errors.code?.message}
          />
          <Input 
            label="Academic Year" 
            placeholder="e.g., 2027-2028" 
            {...register('academic_year', { required: 'Academic year is required' })}
            error={errors.academic_year?.message}
          />
          <Select 
            label="Semester Type" 
            {...register('semester_type', { required: 'Semester is required' })}
            options={[
              { value: '1', label: 'First Semester' },
              { value: '2', label: 'Second Semester' },
              { value: 'S', label: 'Summer' },
            ]}
          />
          <div className="flex items-end pb-2">
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('is_active')} className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary" />
                <span className="text-sm font-medium text-slate-700">Set as Active Term</span>
             </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Duration & Enrollment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Term Start Date" type="date" {...register('start_date', { required: true })} />
             <Input label="Term End Date" type="date" {...register('end_date', { required: true })} />
             <Input label="Enrollment Start" type="date" {...register('enrollment_start', { required: true })} />
             <Input label="Enrollment End" type="date" {...register('enrollment_end', { required: true })} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Advising Period</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Advising Start" type="date" {...register('advising_start', { required: true })} />
             <Input label="Advising End" type="date" {...register('advising_end', { required: true })} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            {term ? 'Update Term' : 'Create Term'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TermModal;
