/**
 * RosterTable.jsx
 * 
 * Detailed table view of student grades for the registrar's review process.
 */

import React from 'react';
import { User, Hash } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Table from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import SearchBar from '../../../../components/shared/SearchBar';
import Pagination from '../../../../components/ui/Pagination';

/**
 * RosterTable Component
 * 
 * @param {Object} props
 * @param {Array} props.roster - List of students and their grades
 * @param {Boolean} props.loading - Data fetching state
 * @param {Number} props.totalCount - Total count of students
 * @param {Number} props.page - Current page
 * @param {Number} props.totalPages - Total pages for pagination
 * @param {String} props.searchTerm - Current search term
 * @param {Function} props.setSearchTerm - Callback to update search
 * @param {Function} props.setPage - Callback to change page
 */
const RosterTable = ({ 
  roster, 
  loading, 
  totalCount, 
  page, 
  totalPages, 
  searchTerm, 
  setSearchTerm, 
  setPage 
}) => {
  const columns = [
    { 
      header: 'ID Number', 
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <User size={18} />
          </div>
          <span className="font-mono text-sm text-slate-600 uppercase tracking-tight">{r.student_idn}</span>
        </div>
      )
    },
    { 
      header: 'Name', 
      render: (r) => (
        <span className="font-bold text-slate-900 text-sm">{r.student_name}</span>
      )
    },
    { 
      header: 'Midterm', 
      align: 'center',
      render: (r) => (
        <span className={`font-mono font-bold ${r.midterm_grade ? 'text-slate-900' : 'text-slate-300'}`}>
          {r.midterm_grade || '--'}
        </span>
      )
    },
    { 
      header: 'Final', 
      align: 'center',
      render: (r) => (
        <span className={`font-mono font-bold ${r.final_grade ? 'text-primary' : 'text-slate-300'}`}>
          {r.final_grade || '--'}
        </span>
      )
    },
    { 
      header: 'Status', 
      render: (r) => {
        const status = r.grade_status;
        const variant = status === 'PASSED' ? 'success' : 
                        status === 'FAILED' ? 'danger' : 
                        status === 'INC' ? 'warning' : 'neutral';
        return <Badge variant={variant}>{r.grade_status_display}</Badge>;
      }
    }
  ];

  return (
    <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
      <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Hash size={14} className="text-slate-400" />
            Student Grade Roster
          </h3>
          <div className="text-[10px] text-slate-400 font-bold uppercase">
            {totalCount} Total Students
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar 
            placeholder="Search by name or IDN..."
            onSearch={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
          />
        </div>
      </div>
      <Table 
        columns={columns}
        data={roster}
        loading={loading}
        emptyMessage={searchTerm ? "No students match your search criteria." : "This roster is currently empty."}
      />
      
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Page {page} of {totalPages}
          </div>
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </Card>
  );
};

export default RosterTable;
