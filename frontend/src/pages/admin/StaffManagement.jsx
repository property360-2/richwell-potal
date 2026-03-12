import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { Plus, Edit2, KeyRound } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'HEAD_REGISTRAR', label: 'Head Registrar' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'DEAN', label: 'Dean' },
  { value: 'PROGRAM_HEAD', label: 'Program Head' },
  { value: 'ADMIN', label: 'Admin' },
];

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { showToast } = useToast();

  const { register, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('accounts/staff/');
      setStaff(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingId(staffMember.id);
      setValue('username', staffMember.username);
      setValue('email', staffMember.email);
      setValue('first_name', staffMember.first_name);
      setValue('last_name', staffMember.last_name);
      setValue('role', staffMember.role);
      setValue('is_active', staffMember.is_active ? 'true' : 'false');
    } else {
      setEditingId(null);
      reset({ is_active: 'true' });
    }
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    data.is_active = data.is_active === 'true';
    
    try {
      if (editingId) {
        await api.patch(`accounts/staff/${editingId}/`, data);
        showToast('success', 'Staff updated successfully');
      } else {
        await api.post('accounts/staff/', data);
        showToast('success', 'Staff created successfully');
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      const errorData = err.response?.data;
      
      if (err.response?.status === 400 && errorData && typeof errorData === 'object') {
        // Map backend errors to form fields
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

  const handleResetPassword = async (id) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) return;
    try {
      const res = await api.post(`accounts/staff/${id}/reset_password/`);
      showToast('success', res.data.detail || 'Password reset successfully');
    } catch (err) {
      showToast('error', 'Failed to reset password');
    }
  };

  const columns = [
    { header: 'ID', accessor: 'username' },
    { 
      header: 'Name', 
      render: (row) => `${row.first_name} ${row.last_name}`
    },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Role', 
      render: (row) => <Badge variant="info">{row.role.replace('_', ' ')}</Badge>
    },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<KeyRound size={16} />} 
            onClick={() => handleResetPassword(row.id)}
            title="Reset Password"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Edit2 size={16} />} 
            onClick={() => handleOpenModal(row)}
            title="Edit"
          />
        </div>
      )
    }
  ];

  return (
    <div className="page-container space-y-8">
      <div className="page-header">
        <div className="header-title-section">
          <h2>Staff Management</h2>
          <p>Manage administrators, registrars, deans, and other personnel.</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
          Add Staff
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          data={staff} 
          loading={loading} 
          emptyMessage="No staff members found."
        />
      </Card>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Staff Member' : 'Add New Staff'}
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
              disabled={!!editingId}
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
              options={ROLE_OPTIONS}
              error={errors.role?.message}
              {...register('role', { required: 'Role is required' })}
            />
            {editingId && (
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
          
          {!editingId && (
            <p className="text-sm text-slate-500 bg-slate-50 p-3 flex rounded-md">
              Note: The initial password will be auto-generated as [Username]1234.
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingId ? 'Save Changes' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffManagement;
