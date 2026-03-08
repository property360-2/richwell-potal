import React, { useState, useEffect } from 'react';
import { Search, UserCheck, GraduationCap, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { studentsApi } from '../../api/students';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // We want all non-applicant students (Approved, Enrolled, etc.)
      const res = await studentsApi.getStudents({ search: searchTerm });
      // Filter out applicants if the API returns them too (since they are in ApplicantManagement)
      const allStudents = res.data.results || [];
      setStudents(allStudents.filter(s => s.status !== 'APPLICANT'));
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Student Management</h1>
          <p className="text-slate-500 mt-1">View and manage enrolled and approved students</p>
        </div>
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
    </div>
  );
};

export default StudentManagement;
