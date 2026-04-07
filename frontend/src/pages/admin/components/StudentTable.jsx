/**
 * Richwell Portal — Student Table Component
 * 
 * Displays student records in a structured table with actions for COR 
 * generation and grade summaries.
 */

import React from 'react';
import { FileText, GraduationCap, ChevronDown } from 'lucide-react';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

/**
 * StudentTable Component
 * 
 * @param {Array} students - List of student objects.
 * @param {boolean} loading - Loading state for table.
 * @param {number} dropdownStudentId - ID of student with open document menu.
 * @param {Function} setDropdownStudentId - Dropdown state setter.
 * @param {Object} dropdownRef - Reference for click-outside logic.
 * @param {Function} handleDownloadCOR - COR generation callback.
 */
const StudentTable = ({
  students,
  loading,
  dropdownStudentId,
  setDropdownStudentId,
  dropdownRef,
  handleDownloadCOR
}) => {
  const navigate = useNavigate();

  const columns = [
    {
      header: 'Student Name',
      render: (s) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">
            {s.user.first_name} {s.user.last_name}
          </div>
          <div className="text-xs text-slate-500">{s.user.email}</div>
        </div>
      )
    },
    { 
      header: 'Student ID (IDN)', 
      accessor: 'idn',
      render: (s) => <div className="font-mono font-medium text-primary">{s.idn}</div>
    },
    { 
      header: 'Type', 
      accessor: 'student_type',
      render: (s) => <div className="capitalize">{s.student_type.toLowerCase()}</div>
    },
    {
      header: 'Year Level',
      render: (s) => <Badge variant="info">{s.latest_enrollment?.year_level || 'N/A'} Year</Badge>
    },
    {
      header: 'Study Mode',
      render: (s) => (
        <Badge variant={s.latest_enrollment?.is_regular ? 'success' : 'warning'}>
          {s.latest_enrollment?.is_regular ? 'Regular' : 'Irregular'}
        </Badge>
      )
    },
    {
      header: 'Status',
      render: (s) => {
        const variants = { 'ADMITTED': 'info', 'ENROLLED': 'success', 'INACTIVE': 'neutral', 'GRADUATED': 'warning' };
        return <Badge variant={variants[s.status] || 'neutral'}>{s.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          {s.status === 'ENROLLED' && (
            <div className="release-doc-container" ref={dropdownStudentId === s.id ? dropdownRef : null}>
              <Button 
                variant="outline" size="sm" 
                onClick={() => setDropdownStudentId(dropdownStudentId === s.id ? null : s.id)}
                icon={<FileText size={16} />}
                className="text-primary hover:bg-primary/5"
              >
                Release Document <ChevronDown size={14} className="ml-1" />
              </Button>
              
              {dropdownStudentId === s.id && (
                <div className="release-doc-dropdown animate-in fade-in zoom-in-95">
                  <button className="release-doc-item" onClick={() => handleDownloadCOR(s)}>
                    <FileText size={16} />
                    <span>Certificate of Registration (COR)</span>
                  </button>
                  <button className="release-doc-item" onClick={() => navigate(`/registrar/students/${s.id}/summary`)}>
                    <GraduationCap size={16} />
                    <span>Summary of Grades</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <Table 
      columns={columns} 
      data={students} 
      loading={loading} 
      emptyMessage="No students found matching your search."
    />
  );
};

export default StudentTable;
