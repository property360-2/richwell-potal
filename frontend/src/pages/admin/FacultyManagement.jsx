import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, BookOpen, Trash } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faculty Management</h1>
          <p className="text-slate-500 mt-1">Manage professors and their subject assignments</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus size={18} /> Add Professor
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200">
          <Input
            placeholder="Search by name, ID, or department..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[200px]">Professor Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Employee ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects Assigned</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    Loading professors...
                  </td>
                </tr>
              ) : professors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No professors found.
                  </td>
                </tr>
              ) : (
                professors.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-slate-900">
                        {prof.user.first_name} {prof.user.last_name}
                      </div>
                      <div className="text-sm text-slate-500">{prof.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium whitespace-nowrap">
                      {prof.employee_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {prof.department}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <Badge variant={prof.assigned_subjects.length > 0 ? 'primary' : 'default'}>
                        {prof.assigned_subjects.length} Subjects
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <Badge variant={prof.is_active ? 'success' : 'neutral'}>
                        {prof.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAssignSubjects(prof)}
                          title="Assign Subjects"
                        >
                          <BookOpen size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(prof)}
                          title="Edit Details"
                        >
                          <Edit size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
