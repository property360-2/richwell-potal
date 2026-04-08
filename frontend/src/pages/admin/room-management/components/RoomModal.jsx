import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import Select from '../../../../components/ui/Select';
import { useToast } from '../../../../components/ui/Toast';
import { facilitiesApi } from '../../../../api/facilities';

const RoomModal = ({ isOpen, onClose, onSuccess, room }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { showToast } = useToast();

  useEffect(() => {
    if (room) {
      Object.keys(room).forEach(key => setValue(key, room[key]));
    } else {
      reset({
        name: '',
        room_type: 'LECTURE',
        capacity: 35,
        is_active: true
      });
    }
  }, [room, isOpen, reset, setValue]);

  const onSubmit = async (data) => {
    try {
      if (room) {
        await facilitiesApi.updateRoom(room.id, data);
        showToast('success', 'Room updated successfully');
      } else {
        await facilitiesApi.createRoom(data);
        showToast('success', 'Room created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save room');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={room ? 'Edit Room' : 'Add New Room'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Room Name" 
          placeholder="e.g., Room 101, Lab 201" 
          {...register('name', { required: 'Room name is required' })}
          error={errors.name?.message}
        />
        <Select 
          label="Room Type" 
          {...register('room_type', { required: 'Room type is required' })}
          options={[
            { value: 'LECTURE', label: 'Lecture Room' },
            { value: 'COMPUTER_LAB', label: 'Computer Laboratory' },
            { value: 'SCIENCE_LAB', label: 'Science Laboratory' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
        <Input 
          label="Capacity" 
          type="number"
          placeholder="e.g., 35" 
          {...register('capacity', { required: 'Capacity is required', min: 1 })}
          error={errors.capacity?.message}
        />
        <div className="flex items-center gap-2">
            <input type="checkbox" {...register('is_active')} id="is_active" className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary" />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">Active and Available</label>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            {room ? 'Update Room' : 'Add Room'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoomModal;
