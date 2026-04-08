/**
 * Richwell Portal — Student Filters Component
 * 
 * Provides search and dropdown filters for the Student Management dashboard.
 */

import React from 'react';
import { Search } from 'lucide-react';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import styles from '../StudentManagement.module.css';

/**
 * StudentFilters Component
 * 
 * @param {string} searchTerm - Current search string.
 * @param {Function} setSearchTerm - Search string setter.
 * @param {string} programFilter - Selected program ID.
 * @param {Function} setProgramFilter - Program filter setter.
 * @param {Array} programs - List of available programs for the dropdown.
 * @param {string} yearLevelFilter - Selected year level.
 * @param {Function} setYearLevelFilter - Year level filter setter.
 * @param {string} statusFilter - Selected status filter.
 * @param {Function} setStatusFilter - Status filter setter.
 * @param {Function} setPage - Pagination resetter.
 */
const StudentFilters = ({
  searchTerm,
  setSearchTerm,
  programFilter,
  setProgramFilter,
  programs,
  yearLevelFilter,
  setYearLevelFilter,
  statusFilter,
  setStatusFilter,
  setPage
}) => {
  
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className={`${styles.filterBar} flex flex-col md:flex-row gap-4 mb-6`}>
      <div className={`${styles.searchWrapper} flex-1`}>
        <Input
          placeholder="Search name, IDN..."
          icon={<Search size={16} />}
          className={`${styles.searchInput} w-full`}
          value={searchTerm}
          onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
        />
      </div>
      
      <div className={`${styles.filterGroup} flex flex-wrap items-center gap-3`}>
        <div className={`${styles.filterItem} ${styles.programSelect} min-w-[180px]`}>
          <Select 
            value={programFilter}
            options={[
              { value: '', label: 'All Programs' },
              ...programs
            ]}
            className={styles.compactSelect}
            onChange={(e) => handleFilterChange(setProgramFilter, e.target.value)}
          />
        </div>
        
        <div className={`${styles.filterItem} ${styles.yearSelect} min-w-[140px]`}>
          <Select 
            value={yearLevelFilter}
            options={[
              { value: '', label: 'Year Level' },
              { value: '1', label: '1st Year' },
              { value: '2', label: '2nd Year' },
              { value: '3', label: '3rd Year' },
              { value: '4', label: '4th Year' }
            ]}
            className={styles.compactSelect}
            onChange={(e) => handleFilterChange(setYearLevelFilter, e.target.value)}
          />
        </div>
        
        <div className={`${styles.filterItem} ${styles.statusSelect} min-w-[160px]`}>
          <Select 
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            options={[
              { value: 'ADMITTED,ENROLLED,INACTIVE,GRADUATED', label: 'All Status' },
              { value: 'ADMITTED', label: 'Admitted' },
              { value: 'ENROLLED', label: 'Enrolled' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'APPLICANT', label: 'Pending' }
            ]}
            className={styles.compactSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentFilters;
