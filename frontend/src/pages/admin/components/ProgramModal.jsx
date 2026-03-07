import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { academicsApi } from '../../../api/academics';
import { useToast } from '../../../components/ui/Toast';

const ProgramModal = ({ isOpen, onClose, onSuccess, program = null }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { showToast } = useToast();

  useEffect(() => {
    if (program) {
      setValue('code', program.code);
      setValue('name', program.name);
      setValue('has_summer', program.has_summer ? 'true' : 'false');
      setValue('is_active', program.is_active ? 'true' : 'false');
    } else {
      reset({ has_summer: 'false', is_active: 'true' });
    }
  }, [program, isOpen, setValue, reset]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      has_summer: data.has_summer === 'true',
      is_active: data.is_active === 'true',
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
      showToast('error', 'Failed to save program');
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
