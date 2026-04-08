/**
 * @file AcademicManagement.jsx
 * @description Main entry point for the Academic Management module.
 * It orchestrates navigation between programs, subjects, and bulk import functionality
 * using a tabbed interface.
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  Upload
} from 'lucide-react';
import PageHeader from '../../../components/shared/PageHeader';
import ProgramTab from './components/ProgramTab';
import SubjectTab from './components/SubjectTab';
import ImportTab from './components/ImportTab';
import styles from './AcademicManagement.module.css';

/**
 * AcademicManagement Component
 * 
 * Orchestrates the display of different academic management tabs including
 * Programs, Subjects, and Bulk Import.
 * 
 * @returns {JSX.Element} The main academic management page.
 */
const AcademicManagement = () => {
  const [activeTab, setActiveTab] = useState('programs');

  /**
   * Configuration for the tabs in the academic management page.
   */
  const tabs = [
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'subjects', label: 'Subjects', icon: Layers },
    { id: 'import', label: 'Bulk Import', icon: Upload },
  ];

  return (
    <div className={`${styles.pageContainer} ${styles.academicManagement}`}>
      <PageHeader
        title="Academic Management"
        description="Manage programs, subjects, and curriculum data."
      />

      <div className={styles.tabsContainer}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.activeTabContainer}>
        <div className={styles.tabContent}>
          {activeTab === 'programs' && <ProgramTab styles={styles} />}
          {activeTab === 'subjects' && <SubjectTab styles={styles} />}
          {activeTab === 'import' && <ImportTab styles={styles} />}
        </div>
      </div>
    </div>
  );
};

export default AcademicManagement;
