/**
 * StudentManagement.jsx
 * 
 * Main administrative interface for managing the student body.
 * Orchestrates student listing, filtering, and manual entry through
 * modular sub-components to ensure Rule 7 compliance.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Pagination from '../../../components/ui/Pagination';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';
import { academicsApi } from '../../../api/academics';
import { reportsApi } from '../../../api/reports';
import { termsApi } from '../../../api/terms';

// Modular Components
import StudentFilters from './components/StudentFilters';
import StudentTable from './components/StudentTable';
import AddStudentModal from './components/AddStudentModal';
import styles from './StudentManagement.module.css';

/**
 * StudentManagement Component
 * 
 * Central hub for student administrative tasks.
 */
const StudentManagement = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const dropdownRef = useRef(null);

  // State Management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ADMITTED,ENROLLED,INACTIVE,GRADUATED');
  const [programFilter, setProgramFilter] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('');
  const [activeTerm, setActiveTerm] = useState(null);
  const [dropdownStudentId, setDropdownStudentId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, statusFilter, programFilter, yearLevelFilter, page]);

  useEffect(() => {
    fetchAcademics();
    fetchActiveTerm();
    
    // Click outside listener for the "Release Document" dropdown
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownStudentId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActiveTerm = async () => {
    try {
      const res = await termsApi.getActiveTerm();
      setActiveTerm(res.data?.[0] || res.data?.results?.[0]);
    } catch (err) { console.error("Term fetch failed"); }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ 
        search: searchTerm,
        status: statusFilter,
        program: programFilter,
        year_level: yearLevelFilter,
        page: page,
        page_size: 10
      });
      setStudents(res.data.results || []);
      setTotalCount(res.data.count || 0);
      setTotalPages(Math.ceil((res.data.count || 0) / 10));
    } catch (error) { setStudents([]); }
    finally { setLoading(false); }
  };

  const fetchAcademics = async () => {
    try {
      const progRes = await academicsApi.getPrograms({ page_size: 100 });
      setPrograms(progRes.data.results.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` })));
    } catch (err) { addToast('error', 'Academic data load failed'); }
  };

  const handleDownloadCOR = async (student) => {
    if (!activeTerm) return addToast('error', 'No active term for COR');
    try {
      setLoading(true);
      const res = await reportsApi.getCOR({ student_id: student.id, term_id: activeTerm.id });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `COR_${student.idn}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('success', 'COR downloaded');
    } catch (err) { addToast('error', 'COR failed. Check enrollment status.'); }
    finally { setLoading(false); setDropdownStudentId(null); }
  };

  return (
    <div className={`${styles.pageContainer} space-y-8 p-6`}>
      <div className={`${styles.pageHeader} flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100`}>
        <div className={styles.headerTitleSection}>
          <h2 className="text-2xl font-bold text-slate-800">Student Management</h2>
          <p className="text-slate-500 text-sm">View and manage enrolled and admitted students</p>
        </div>
        <Button variant="primary" icon={<UserPlus size={18} />} onClick={() => setModalOpen(true)}>
          Add Student
        </Button>
      </div>

      <StudentFilters 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        programFilter={programFilter} setProgramFilter={setProgramFilter}
        programs={programs}
        yearLevelFilter={yearLevelFilter} setYearLevelFilter={setYearLevelFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        setPage={setPage}
      />

      <Card className="overflow-hidden border-none shadow-xl">
        <StudentTable 
          students={students} loading={loading}
          dropdownStudentId={dropdownStudentId} setDropdownStudentId={setDropdownStudentId}
          dropdownRef={dropdownRef} handleDownloadCOR={handleDownloadCOR}
        />
        
        {totalPages > 1 && (
          <div className={`${styles.paginationWrapper} px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30`}>
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="text-slate-900 font-bold">{students.length}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> results
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <AddStudentModal 
        isOpen={modalOpen} onClose={() => setModalOpen(false)}
        programs={programs} curriculums={curriculums}
        fetchStudents={fetchStudents}
      />
    </div>
  );
};

export default StudentManagement;
