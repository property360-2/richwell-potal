import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Search, UserCheck, GraduationCap, Clock, Plus, UserPlus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { studentsApi } from '../../api/students';
import { academicsApi } from '../../api/academics';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const { showToast } = useToast();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const selectedProgram = watch('program');

  useEffect(() => {
    fetchStudents();
  }, [searchTerm]);

  useEffect(() => {
    if (modalOpen) {
      fetchAcademics();
    }
  }, [modalOpen]);

  // Refetch curricula when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchCurriculums(selectedProgram);
    }
  }, [selectedProgram]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ search: searchTerm });
      const allStudents = res.data.results || [];
      setStudents(allStudents.filter(s => s.status !== 'APPLICANT'));
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademics = async () => {
    try {
      const progRes = await academicsApi.getPrograms({ page_size: 100 });
      setPrograms(progRes.data.results.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` })));
    } catch (err) {
      showToast('error', 'Failed to load academic data');
    }
  };

  const fetchCurriculums = async (programId) => {
    try {
      const res = await academicsApi.getCurriculums({ program: programId, is_active: true });
      setCurriculums(res.data.results.map(c => ({ value: c.id, label: c.version_name })));
    } catch (err) {
      console.error('Failed to fetch curriculums');
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await studentsApi.manualAdd(data);
      showToast('success', `Student added! Password set to: ${data.idn}${data.date_of_birth.replace(/-/g, '').slice(4, 8)}`);
      setModalOpen(false);
      reset();
      fetchStudents();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to add student');
    }
  };

  const columns = [
    {
      header: 'Student Name',
      render: (student) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">
            {student.user.first_name} {student.user.last_name}
          </div>
          <div className="text-xs text-slate-500">{student.user.email}</div>
        </div>
      )
    },
    { 
      header: 'Student ID (IDN)', 
      accessor: 'idn',
      render: (student) => (
        <div className="font-mono font-medium text-primary">
          {student.idn}
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: 'student_type',
      render: (student) => (
        <div className="capitalize">{student.student_type.toLowerCase()}</div>
      )
    },
    {
      header: 'Year Level',
      render: (student) => (
        <Badge variant="info">
          {student.latest_enrollment?.year_level || 'N/A'} Year
        </Badge>
      )
    },
    {
      header: 'Study Mode',
      render: (student) => (
        <Badge variant={student.latest_enrollment?.is_regular ? 'success' : 'warning'}>
          {student.latest_enrollment?.is_regular ? 'Regular' : 'Irregular'}
        </Badge>
      )
    },
    {
      header: 'Status',
      render: (student) => {
        const variants = {
          'APPROVED': 'info',
          'ENROLLED': 'success',
          'INACTIVE': 'neutral',
          'GRADUATED': 'warning'
        };
        return (
          <Badge variant={variants[student.status] || 'neutral'}>
            {student.status}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="page-container space-y-8">
      <div className="page-header">
        <div className="header-title-section">
          <h2>Student Management</h2>
          <p>View and manage enrolled and approved students</p>
        </div>
        <Button variant="primary" icon={<UserPlus size={18} />} onClick={() => setModalOpen(true)}>
          Add Student
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by name, IDN, or email..."
            icon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table 
          columns={columns} 
          data={students} 
          loading={loading} 
          emptyMessage="No students found matching your search."
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Manual Student Entry">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} />
            <Input label="Last Name" {...register('last_name', { required: 'Required' })} error={errors.last_name?.message} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" {...register('email', { required: 'Required' })} error={errors.email?.message} />
            <Input label="Date of Birth" type="date" {...register('date_of_birth', { required: 'Required' })} error={errors.date_of_birth?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Student ID (IDN)" {...register('idn', { required: 'IDN is required' })} error={errors.idn?.message} placeholder="e.g. 260011" />
            <Input label="Year Level" type="number" {...register('year_level', { required: 'Required', min: 1, max: 5 })} error={errors.year_level?.message} defaultValue={1} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Gender" 
              options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }]} 
              {...register('gender', { required: 'Required' })} 
            />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Program" options={programs} {...register('program', { required: 'Required' })} error={errors.program?.message} />
            <Select 
              label="Curriculum" 
              options={curriculums} 
              {...register('curriculum', { required: 'Required' })} 
              disabled={!selectedProgram || curriculums.length === 0} 
              error={errors.curriculum?.message} 
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Add Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentManagement;
