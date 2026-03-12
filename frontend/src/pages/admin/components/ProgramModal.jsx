import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { academicsApi } from '../../../api/academics';
import { useToast } from '../../../components/ui/Toast';

const ProgramModal = ({ isOpen, onClose, onSuccess, program = null }) => {
  const { register, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm();
  const { showToast } = useToast();

  const [programHeads, setProgramHeads] = useState([]);
  const [loadingHeads, setLoadingHeads] = useState(false);

  useEffect(() => {
    const fetchHeads = async () => {
      try {
        setLoadingHeads(true);
        const res = await academicsApi.getProgramHeads();
        setProgramHeads(res.data.results || res.data);
      } catch (err) {
        console.error('Failed to load program heads', err);
      } finally {
        setLoadingHeads(false);
      }
    };
    fetchHeads();
  }, []);

  useEffect(() => {
    if (program) {
      setValue('code', program.code);
      setValue('name', program.name);
      setValue('program_head', program.program_head || '');
      setValue('has_summer', program.has_summer ? 'true' : 'false');
      setValue('is_active', program.is_active ? 'true' : 'false');
    } else {
      reset({ has_summer: 'false', is_active: 'true', program_head: '' });
    }
  }, [program, isOpen, setValue, reset]);


  const onSubmit = async (data) => {
    const payload = {
      ...data,
      has_summer: data.has_summer === 'true',
      is_active: data.is_active === 'true',
      program_head: data.program_head || null,
    };


    try {
      if (program) {
        await academicsApi.updateProgram(program.id, payload);
        showToast('success', 'Program updated successfully');
      } else {
        await academicsApi.createProgram(payload);
        showToast('success', 'Program created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const errorData = err.response?.data;
      if (err.response?.status === 400 && errorData && typeof errorData === 'object') {
        Object.keys(errorData).forEach((field) => {
          if (['code', 'name', 'program_head'].includes(field)) {
            setError(field, {
              type: 'manual',
              message: Array.isArray(errorData[field]) ? errorData[field][0] : errorData[field]
            });
          }
        });
        showToast('error', 'Please correct the errors in the form');
      } else {
        showToast('error', errorData?.detail || 'Failed to save program');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={program ? 'Edit Program' : 'Add New Program'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Program Code"
          placeholder="e.g. BSCS"
          error={errors.code?.message}
          {...register('code', { required: 'Code is required' })}
        />
        
        <Input
          label="Program Name"
          placeholder="e.g. Bachelor of Science in Computer Science"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />

        
        <Select
          label="Program Head"
          options={[
            { value: '', label: 'No Program Head Assigned' },
            ...programHeads.map(head => ({ 
              value: head.id, 
              label: `${head.first_name} ${head.last_name} (${head.username})` 
            }))
          ]}
          disabled={loadingHeads}
          {...register('program_head')}
        />


        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Has Summer?"
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
            {...register('has_summer')}
          />
          <Select
            label="Status"
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
            {...register('is_active')}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {program ? 'Save Changes' : 'Create Program'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProgramModal;
