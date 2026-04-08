/**
 * @file FacultyManagement.jsx
 * @description Administrative module for managing professors, their department assignments,
 * and teaching loads. It provides a central interface for HR and academic workload management.
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Search, 
  Edit, 
  BookOpen 
} from 'lucide-react';

// Styles
import styles from './FacultyManagement.module.css';

// Components
import Pagination from '../../../components/ui/Pagination';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { facultyApi } from '../../../api/faculty';
import ProfessorModal from './components/ProfessorModal';
import ProfessorSubjectModal from './components/ProfessorSubjectModal';
import FacultyLoadModal from './components/FacultyLoadModal';

/**
 * FacultyManagement Component
 * 
 * Main dashboard for faculty human resources and assignment management.
 * Handles listing, searching, and managing individual professor profiles and loads.
 * 
 * @returns {JSX.Element} The rendered Faculty Management dashboard
 */
const FacultyManagement = () => {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfessors();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  /**
   * Fetches the list of professors from the backend.
   * Handles both paginated and non-paginated responses.
   */
  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const res = await facultyApi.getAll({ 
        search: searchTerm,
        page: page 
      });
      
      if (res.data.results) {
        setProfessors(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setProfessors(res.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch professors:', error);
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers the modal for adding a new professor.
   */
  const handleAdd = () => {
    setSelectedProf(null);
    setIsProfModalOpen(true);
  };

  /**
   * Triggers the modal for editing an existing professor.
   * @param {Object} prof - The professor object to edit
   */
  const handleEdit = (prof) => {
    setSelectedProf(prof);
    setIsProfModalOpen(true);
  };

  /**
   * Triggers the modal for assigning subjects to a professor.
   * @param {Object} prof - The selected professor
   */
  const handleAssignSubjects = (prof) => {
    setSelectedProf(prof);
    setIsSubjectModalOpen(true);
  };

  /**
   * Triggers the modal for viewing a professor's teaching load.
   * @param {Object} prof - The selected professor
   */
  const handleViewLoad = (prof) => {
    setSelectedProf(prof);
    setIsLoadModalOpen(true);
  };

  /**
   * Table column definitions
   */
  const columns = [
    {
      header: 'Professor Name',
      render: (prof) => (
        <div className={styles['professor-info']}>
          <div className={styles['professor-name']}>
            {prof.user.first_name} {prof.user.last_name}
          </div>
          <div className={styles['professor-email']}>{prof.user.email}</div>
        </div>
      )
    },
    { header: 'Employee ID', accessor: 'employee_id' },
    { 
      header: 'Hours Assigned', 
      render: (prof) => (
        <div className={styles['hours-display']}>
          {prof.hours_assigned} hrs
        </div>
      )
    },
    { header: 'Department', accessor: 'department' },
    { 
      header: 'Type', 
      render: (prof) => (
        <Badge 
          variant={prof.employment_status === 'FULL_TIME' ? 'primary' : 'warning'} 
          className="text-[10px] font-black uppercase"
        >
          {prof.employment_status === 'FULL_TIME' ? 'Full-time' : 'Part-time'}
        </Badge>
      )
    },
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
        <div className={styles['actions-cell']}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleViewLoad(prof)}
            title="View Teaching Load"
            className="text-primary"
          >
            <Clock size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleAssignSubjects(prof)}
            title="Assign Subjects"
            className="text-slate-500"
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
    <div className={styles['page-container']}>
      <div className={styles['page-header']}>
        <div className={styles['header-title-section']}>
          <h2>Faculty Management</h2>
          <p>Manage professors and their subject assignments</p>
        </div>
        <Button variant="primary" onClick={handleAdd} icon={<Plus size={18} />}>
          Add Professor
        </Button>
      </div>

      <div className={styles['search-section']}>
        <div className={styles['search-wrapper']}>
          <Input
            placeholder="Search by name, ID, or department..."
            icon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card padding="0">
        <Table 
          columns={columns} 
          data={professors} 
          loading={loading} 
          emptyMessage="No professors found matching your search."
        />
        {totalPages > 1 && (
          <div className={styles['pagination-wrapper']}>
            <Pagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
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

      <FacultyLoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        professor={selectedProf}
      />
    </div>
  );
};

export default FacultyManagement;

