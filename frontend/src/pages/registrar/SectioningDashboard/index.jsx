/**
 * SectioningDashboard/index.jsx
 * 
 * Main entry point for the Sectioning Dashboard feature.
 * Orchestrates the enrollment matrix and section management views.
 */

import React, { useState } from 'react';
import { LayoutGrid, Users, RefreshCw } from 'lucide-react';
import PageHeader from '../../../components/shared/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Tabs from '../../../components/ui/Tabs';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useToast } from '../../../components/ui/Toast';
import { sectionsApi } from '../../../api/sections';
import { schedulingApi } from '../../../api/scheduling';

// Local Components & Hooks
import EnrollmentMatrix from './components/EnrollmentMatrix';
import SectionsGrid from './components/SectionsGrid';
import RosterModal from './components/RosterModal';
import TransferModal from './components/TransferModal';
import SectionPreviewModal from '../components/SectionPreviewModal';
import { useSectioningData } from './hooks/useSectioningData';

import styles from './SectioningDashboard.module.css';

/**
 * SectioningDashboard Entry Component
 */
const SectioningDashboard = () => {
  const {
    activeTerm,
    stats,
    programs,
    sections,
    loading,
    sectionsLoading,
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    totalPages,
    totalCount,
    fetchData,
    fetchSections
  } = useSectioningData();

  const [mainTab, setMainTab] = useState('matrix');
  const { showToast } = useToast();

  // Modals Local State
  const [selectedSection, setSelectedSection] = useState(null);
  const [roster, setRoster] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generationParams, setGenerationParams] = useState(null);

  /**
   * Section Generation Flow
   */
  const handleGenerate = (programId, yearLevel) => {
    setGenerationParams({ program_id: programId, year_level: yearLevel, term_id: activeTerm.id });
    setIsPreviewOpen(true);
  };

  const handleConfirmGeneration = async (numSections) => {
    try {
      await sectionsApi.generate({
        ...generationParams,
        num_sections: numSections
      });
      showToast('success', 'Sections generated successfully');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to generate sections');
      throw err;
    }
  };

  /**
   * Roster & Details Flow
   */
  const handleOpenRoster = async (section) => {
    setSelectedSection(section);
    setRoster([]);
    setSchedules([]);
    setIsRosterOpen(true);
    
    try {
      setRosterLoading(true);
      const [rosterRes, scheduleRes] = await Promise.all([
        sectionsApi.getSectionRoster(section.id),
        schedulingApi.getSchedules({ section_id: section.id, term_id: activeTerm.id })
      ]);
      setRoster(rosterRes.data);
      setSchedules(scheduleRes.data.results || scheduleRes.data);
    } catch (err) {
      showToast('error', 'Failed to load class details');
    } finally {
      setRosterLoading(false);
    }
  };

  /**
   * Student Transfer Flow
   */
  const handleOpenTransfer = (student) => {
    setStudentToTransfer(student);
    setIsTransferOpen(true);
  };

  const handleConfirmTransfer = async (targetSectionId) => {
    if (!targetSectionId) return showToast('error', 'Select a target section');
    
    try {
      setIsTransferring(true);
      await sectionsApi.transferStudent(targetSectionId, {
        student_id: studentToTransfer.student_id,
        term_id: activeTerm.id
      });
      showToast('success', 'Student transferred successfully');
      setIsTransferOpen(false);
      handleOpenRoster(selectedSection);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading && !activeTerm) {
    return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  // Pre-calculate Matrix Data
  const matrix = {};
  programs.forEach(p => { matrix[p.id] = { 1: 0, 2: 0, 3: 0, 4: 0 }; });
  stats.forEach(s => {
    if (matrix[s.student__program__id]) {
      matrix[s.student__program__id][s.year_level] = s.count;
    }
  });

  return (
    <div className={styles.container}>
      <PageHeader 
        title="Sectioning Dashboard"
        description="Enrollment Matrix & Automated Section Generation"
        badge={<Badge variant="primary" className="ml-2">{activeTerm?.code}</Badge>}
        actions={
          <Button variant="ghost" className="bg-white border border-slate-200" icon={<RefreshCw size={18} />} onClick={fetchData}>
            Sync Matrix
          </Button>
        }
      />

      <Tabs 
        activeTab={mainTab}
        onTabChange={setMainTab}
        tabs={[
          { id: 'matrix', label: 'Enrollment Matrix', icon: LayoutGrid },
          { id: 'sections', label: 'Generated Sections', icon: Users }
        ]}
        className="mb-6"
      />

      <div className="tab-content animate-in fade-in duration-300">
        {mainTab === 'matrix' ? (
          <EnrollmentMatrix 
            programs={programs}
            matrix={matrix}
            sections={sections}
            onGenerate={handleGenerate}
          />
        ) : (
          <SectionsGrid 
            sections={sections}
            loading={sectionsLoading}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            setSearchTerm={setSearchTerm}
            setPage={setPage}
            onOpenRoster={handleOpenRoster}
          />
        )}
      </div>

      <RosterModal 
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        section={selectedSection}
        roster={roster}
        schedules={schedules}
        loading={rosterLoading}
        onTransfer={handleOpenTransfer}
      />

      <TransferModal 
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        student={studentToTransfer}
        sections={sections}
        currentSection={selectedSection}
        loading={isTransferring}
        onConfirm={handleConfirmTransfer}
      />

      <SectionPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        params={generationParams}
        onConfirm={handleConfirmGeneration}
      />
    </div>
  );
};

export default SectioningDashboard;
