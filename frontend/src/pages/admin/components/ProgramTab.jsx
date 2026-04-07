/**
 * @file ProgramTab.jsx
 * @description Manages the programs display and actions within the Academic Management module.
 * It provides search, pagination, and editing capabilities for academic programs.
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import { academicsApi } from '../../../api/academics';
import { useToast } from '../../../components/ui/Toast';
import ProgramModal from './ProgramModal';

/**
 * ProgramTab Component
 * 
 * @returns {JSX.Element} Renders the programs management tab content.
 */
const ProgramTab = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  /**
   * Fetches the list of programs from the API based on current page and search query.
   */
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await academicsApi.getPrograms({
        page: page,
        search: searchQuery
      });
      if (res.data.results) {
        setPrograms(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setPrograms(res.data);
        setTotalPages(1);
      }
    } catch (err) {
      showToast('error', 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPrograms();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchQuery]);

  /**
   * Handles opening the modal for editing an existing program.
   * @param {Object} program - The program object to edit.
   */
  const handleEdit = (program) => {
    setEditingProgram(program);
    setModalOpen(true);
  };

  /**
   * Handles opening the modal for adding a new program.
   */
  const handleAdd = () => {
    setEditingProgram(null);
    setModalOpen(true);
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Program Name', accessor: 'name' },
    { header: 'Program Head', accessor: 'program_head_name', emptyValue: 'Not Assigned' },
    { 
      header: 'Status',
      render: (row) => row.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="error">Inactive</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<Edit2 size={16} />} onClick={() => handleEdit(row)} />
        </div>
      )
    }
  ];

  return (
    <div className="tab-content">
      <div className="content-header">
        <div className="search-box">
          <Input 
            placeholder="Search programs..." 
            icon={<Search size={18} />} 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={handleAdd}>
          Add Program
        </Button>
      </div>

      <Card padding="0">
        <Table columns={columns} data={programs} loading={loading} />
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

      <ProgramModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchPrograms} 
        program={editingProgram} 
      />
    </div>
  );
};

export default ProgramTab;
