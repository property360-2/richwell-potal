/**
 * Richwell Portal — Student Table Component
 * 
 * Displays student records in a structured table with actions for COR 
 * generation and grade summaries.
 */

import React from 'react';
import { FileText, GraduationCap, ChevronDown } from 'lucide-react';
import Table from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import styles from '../StudentManagement.module.css';

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
  handleDownloadCOR,
  enrollmentHistory,
  fetchEnrollmentHistory,
  loadingHistory
}) => {
  const navigate = useNavigate();
  const [showTermSelection, setShowTermSelection] = React.useState(null); // studentId

  // Toggle term selection and fetch if needed
  const handleToggleTerms = (studentId) => {
    if (showTermSelection === studentId) {
      setShowTermSelection(null);
    } else {
      setShowTermSelection(studentId);
      fetchEnrollmentHistory(studentId);
    }
  };

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
          {['ADMITTED', 'ENROLLED'].includes(s.status) && (
            <div className={styles.releaseDocContainer} ref={dropdownStudentId === s.id ? dropdownRef : null}>
              <Button 
                variant="outline" size="sm" 
                onClick={() => setDropdownStudentId(dropdownStudentId === s.id ? null : s.id)}
                icon={<FileText size={16} />}
                className="text-primary hover:bg-primary/5"
              >
                Release Document <ChevronDown size={14} className="ml-1" />
              </Button>
              
              {dropdownStudentId === s.id && (
                <div className="absolute right-0 top-full mt-1.5 w-[calc(100%)] min-w-[180px] bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="border-b border-slate-100 pb-1 mb-1">
                    <button 
                      className={`group flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded transition-all duration-200 ${
                        showTermSelection === s.id 
                        ? 'bg-primary/5 text-primary font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                      }`}
                      onClick={() => handleToggleTerms(s.id)}
                    >
                      <FileText size={16} className={showTermSelection === s.id ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="truncate">COR (Registration)</span>
                        <ChevronDown 
                          size={12} 
                          className={`transform transition-transform duration-300 ${showTermSelection === s.id ? 'rotate-180' : ''}`} 
                        />
                      </div>
                    </button>

                    {showTermSelection === s.id && (
                      <div className="mt-1 mx-1 p-1 bg-slate-50/50 rounded border border-slate-100/50 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                        {loadingHistory && (
                          <div className="px-3 py-2 text-[10px] text-slate-400 italic flex items-center gap-2">
                             <div className="w-2.5 h-2.5 border border-primary/30 border-t-primary rounded-full animate-spin"></div>
                             Loading...
                          </div>
                        )}
                        
                        {!loadingHistory && (!enrollmentHistory[s.id] || enrollmentHistory[s.id].length === 0) && (
                          <div className="px-3 py-2 text-[10px] text-slate-400 italic">No terms found.</div>
                        )}
                        
                        {!loadingHistory && enrollmentHistory[s.id]?.map((enr) => (
                          <button
                            key={enr.id}
                            className="group flex items-center justify-between w-full px-3 py-1.5 text-[11px] text-slate-600 hover:bg-white hover:text-primary hover:shadow-sm rounded transition-all"
                            onClick={() => handleDownloadCOR(s, enr.term)}
                          >
                            <span>{enr.term_details?.code || enr.term_code}</span>
                            <span className="text-[9px] bg-primary/10 text-primary px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">PDF</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    className="group flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-primary rounded transition-all duration-200"
                    onClick={() => navigate(`/registrar/students/${s.id}/summary`)}
                  >
                    <GraduationCap size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
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
