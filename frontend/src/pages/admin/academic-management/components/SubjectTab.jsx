/**
 * @file SubjectTab.jsx
 * @description Manages the subjects view and filters within the Academic Management module.
 * It provides advanced filtering by program, curriculum, year level, and semester.
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RotateCcw } from 'lucide-react';
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
 * @param {Object} props - Component properties.
 * @param {Object} props.styles - The styles object from AcademicManagement.module.css.
 * @returns {JSX.Element} Renders the subjects management tab content.
 */
const SubjectTab = ({ styles }) => {
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

  // Fetch programs on mount
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

  // Fetch curriculums when program changes
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
    const delayDebounceFn = setTimeout(() => {
      fetchSubjects();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
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
    { header: 'Units', accessor: 'total_units', align: 'center' },
    { header: 'Hrs/Wk', accessor: 'hrs_per_week', align: 'center' },
    { 
        header: 'Complexity', 
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
    <div className={styles.tabContent}>
      {/* Header Actions */}
      <div className={styles.contentHeader}>
        <div className={styles.searchBox}>
          <Input 
            placeholder="Filter by subject code or title..." 
            icon={<Search size={18} />} 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingSubject(null); setModalOpen(true); }} disabled={!selectedCurriculumId}>
          Add Subject
        </Button>
      </div>

      {/* Premium Filtering Section */}
      <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 mb-8">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Program Selection</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={selectedProgramId}
            onChange={(e) => { setSelectedProgramId(e.target.value); setPage(1); }}
          >
            {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Academic Curriculum</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none disabled:opacity-50"
            value={selectedCurriculumId}
            onChange={(e) => { setSelectedCurriculumId(e.target.value); setPage(1); }}
            disabled={!selectedProgramId}
          >
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.version_name} {c.is_active ? '• Active' : ''}</option>)}
          </select>
        </div>

        <div className="w-44">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Year Level</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={selectedYearLevel}
            onChange={(e) => { setSelectedYearLevel(e.target.value); setPage(1); }}
          >
            {YEAR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="w-44">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Semester</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={selectedSemester}
            onChange={(e) => { setSelectedSemester(e.target.value); setPage(1); }}
          >
            {SEMESTER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="flex items-end pb-1">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<RotateCcw size={14} />}
            onClick={() => {
              setSelectedYearLevel('');
              setSelectedSemester('');
              setSearchQuery('');
              setPage(1);
            }}
            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.tableContainer}>
        <Table 
          columns={columns} 
          data={subjects} 
          loading={loading} 
          emptyMessage={selectedCurriculumId ? "No subjects match your filters in this curriculum." : "Please select a curriculum to view subjects."}
        />
        
        {totalPages > 1 && (
          <div className={styles.paginationWrapper}>
            <Pagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* CRUD Modal */}
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
