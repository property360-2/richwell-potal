import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, BookOpen } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { facultyApi } from '../../api/faculty';
import ProfessorModal from './components/ProfessorModal';
import ProfessorSubjectModal from './components/ProfessorSubjectModal';

const FacultyManagement = () => {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  useEffect(() => {
    fetchProfessors();
  }, [searchTerm]);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const res = await facultyApi.getAll({ search: searchTerm });
      setProfessors(res.data.results || []);
    } catch (error) {
      console.error('Failed to fetch professors:', error);
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedProf(null);
    setIsProfModalOpen(true);
  };

  const handleEdit = (prof) => {
    setSelectedProf(prof);
    setIsProfModalOpen(true);
  };

  const handleAssignSubjects = (prof) => {
    setSelectedProf(prof);
    setIsSubjectModalOpen(true);
  };

  const columns = [
    {
      header: 'Professor Name',
      render: (prof) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">
            {prof.user.first_name} {prof.user.last_name}
          </div>
          <div className="text-xs text-slate-500">{prof.user.email}</div>
        </div>
      )
    },
    { header: 'Employee ID', accessor: 'employee_id' },
    { header: 'Department', accessor: 'department' },
    {
      header: 'Subjects Assigned',
      render: (prof) => (
        <Badge variant={prof.assigned_subjects.length > 0 ? 'info' : 'neutral'}>
          {prof.assigned_subjects.length} Subjects
        </Badge>
      )
    },
    {
      header: 'Status',
      render: (prof) => (
        <Badge variant={prof.is_active ? 'success' : 'neutral'}>
          {prof.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (prof) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleAssignSubjects(prof)}
            title="Assign Subjects"
            className="text-primary"
          >
            <BookOpen size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEdit(prof)}
            title="Edit Details"
            className="text-slate-400"
          >
            <Edit size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faculty Management</h1>
          <p className="text-slate-500 mt-1">Manage professors and their subject assignments</p>
        </div>
        <Button onClick={handleAdd} icon={<Plus size={18} />}>
          Add Professor
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by name, ID, or department..."
            icon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table 
          columns={columns} 
          data={professors} 
          loading={loading} 
          emptyMessage="No professors found matching your search."
        />
      </Card>

      <ProfessorModal 
        isOpen={isProfModalOpen}
        onClose={() => setIsProfModalOpen(false)}
        professor={selectedProf}
        onSuccess={fetchProfessors}
      />

      <ProfessorSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        professor={selectedProf}
        onSuccess={fetchProfessors}
      />
    </div>
  );
};

export default FacultyManagement;
