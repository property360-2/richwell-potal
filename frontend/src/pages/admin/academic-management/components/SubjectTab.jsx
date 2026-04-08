/**
 * @file SubjectTab.jsx
 * @description Manages the subjects view and filters within the Academic Management module.
 * It provides advanced filtering by program, curriculum, year level, and semester.
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Table from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Select from '../../../../components/ui/Select';
import Pagination from '../../../../components/ui/Pagination';
import { academicsApi } from '../../../../api/academics';
import { useToast } from '../../../../components/ui/Toast';
import SubjectModal from './SubjectModal';

/**
 * SubjectTab Component
 * 
 * @returns {JSX.Element} Renders the subjects management tab content.
 */
const SubjectTab = () => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const { showToast } = useToast();

  const YEAR_OPTIONS = [
    { value: '', label: 'All Year Levels' },
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
  ];

  const SEMESTER_OPTIONS = [
    { value: '', label: 'All Semesters' },
    { value: '1', label: '1st Semester' },
    { value: '2', label: '2nd Semester' },
    { value: 'S', label: 'Summer' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await academicsApi.getPrograms({ is_active: true });
        const programList = res.data.results || res.data;
        setPrograms(programList);
        if (programList.length > 0) {
          setSelectedProgramId(programList[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to load programs');
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const fetchCurriculums = async () => {
        try {
          const res = await academicsApi.getCurriculums({ program: selectedProgramId });
          const currList = res.data.results || res.data;
          setCurriculums(currList);
          const active = currList.find(c => c.is_active) || currList[0];
          setSelectedCurriculumId(active?.id || '');
        } catch (err) {
          showToast('error', 'Failed to load curriculums');
        }
      };
      fetchCurriculums();
    }
  }, [selectedProgramId]);

  /**
   * Fetches subjects based on current filtering and pagination.
   */
  const fetchSubjects = async () => {
    if (!selectedCurriculumId) return;
    try {
      setLoading(true);
      const params = { 
        curriculum: selectedCurriculumId,
        search: searchQuery,
        page: page
      };
      if (selectedYearLevel) {
        params.year_level = selectedYearLevel;
      }
      if (selectedSemester) {
        params.semester = selectedSemester;
      }

      const res = await academicsApi.getSubjects(params);
      if (res.data.results) {
        setSubjects(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setSubjects(res.data);
        setTotalPages(1);
      }
    } catch (err) {
      showToast('error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedCurriculumId, selectedYearLevel, selectedSemester, searchQuery, page]);

  /**
   * Handles subject deletion with confirmation.
   * @param {string|number} id - The ID of the subject to delete.
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await academicsApi.deleteSubject(id);
      showToast('success', 'Subject deleted');
      fetchSubjects();
    } catch (err) {
      showToast('error', 'Failed to delete subject');
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Subject Title', accessor: 'description' },
    { 
      header: 'Y/S', 
      render: (row) => `${row.year_level} - ${row.semester === 'S' ? 'Summer' : row.semester + (row.semester === '1' ? 'st' : 'nd')}` 
    },
    { header: 'Units', accessor: 'total_units' },
    { header: 'Hrs/Wk', accessor: 'hrs_per_week' },
    { 
        header: 'Major', 
        render: (row) => row.is_major ? <Badge variant="warning">Major</Badge> : <Badge variant="neutral">Minor</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<Edit2 size={16} />} onClick={() => { setEditingSubject(row); setModalOpen(true); }} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={16} className="text-red-500" />} onClick={() => handleDelete(row.id)} />
        </div>
      )
    }
  ];

  return (
    <div className="tab-content">
      <div className="content-filters bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <Select 
            label="Program" 
            value={selectedProgramId} 
            onChange={(e) => {
              setSelectedProgramId(e.target.value);
              setPage(1);
            }}
            options={programs.map(p => ({ value: p.id, label: p.code }))}
          />
          <Select 
            label="Curriculum" 
            value={selectedCurriculumId} 
            onChange={(e) => {
              setSelectedCurriculumId(e.target.value);
              setPage(1);
            }}
            options={curriculums.map(c => ({ value: c.id, label: c.version_name + (c.is_active ? ' (Active)' : '') }))}
            disabled={!selectedProgramId}
          />
          <Select 
            label="Year Level" 
            value={selectedYearLevel} 
            onChange={(e) => {
              setSelectedYearLevel(e.target.value);
              setPage(1);
            }}
            options={YEAR_OPTIONS}
            disabled={!selectedCurriculumId}
          />
          <Select 
            label="Semester" 
            value={selectedSemester} 
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setPage(1);
            }}
            options={SEMESTER_OPTIONS}
            disabled={!selectedCurriculumId}
          />
          <div className="search-box-container">
             <Input 
                label="Search"
                placeholder="Search..." 
                icon={<Search size={18} />} 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
             />
          </div>
          <div className="flex justify-end">
             <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingSubject(null); setModalOpen(true); }} disabled={!selectedCurriculumId}>
                Add
             </Button>
          </div>
        </div>
      </div>

      <Card padding="0">
        <Table 
          columns={columns} 
          data={subjects} 
          loading={loading} 
          emptyMessage={selectedCurriculumId ? "No subjects found for this selection." : "Please select a program and curriculum."}
        />
      </Card>

      {totalPages > 1 && (
        <div className="pagination-wrapper mt-4 p-4 border-t border-slate-100 flex justify-end">
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {selectedCurriculumId && (
        <SubjectModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={fetchSubjects} 
          curriculumId={selectedCurriculumId}
          subject={editingSubject} 
        />
      )}
    </div>
  );
};

export default SubjectTab;
