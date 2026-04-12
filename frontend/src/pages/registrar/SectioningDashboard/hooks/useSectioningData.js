/**
 * useSectioningData.js
 * 
 * Custom hook for managing the state and data fetching logic of the Sectioning Dashboard.
 * Encapsulates term management, enrollment statistics, and section list state.
 */

import { useState, useEffect, useCallback } from 'react';
import { sectionsApi } from '../../../../api/sections';
import { termsApi } from '../../../../api/terms';
import { schedulingApi } from '../../../../api/scheduling';
import academicsApi from '../../../../api/academics';
import { useToast } from '../../../../components/ui/Toast';

export const useSectioningData = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [stats, setStats] = useState([]);
  const [sectioningReport, setSectioningReport] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { showToast } = useToast();

  /**
   * Fetches high-level metrics for the dashboard.
   */
  const fetchSectioningReport = useCallback(async (termId) => {
    try {
      const res = await schedulingApi.getSectioningReport(termId);
      setSectioningReport(res.data);
    } catch (err) {
      console.error('Failed to fetch sectioning report', err);
    }
  }, []);

  /**
   * Fetches static data (terms, stats, programs) once on mount.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      const termsRes = await termsApi.getTerms({ is_active: true });
      const term = termsRes.data.results?.[0] || termsRes.data[0];
      setActiveTerm(term);

      if (term) {
        const [statsRes, programsRes] = await Promise.all([
          sectionsApi.getStats(term.id),
          academicsApi.getPrograms(),
          fetchSectioningReport(term.id)
        ]);
        setStats(statsRes.data);
        setPrograms(programsRes.data.results || programsRes.data);
      }
    } catch (err) {
      showToast('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers the manual distribution of unassigned students.
   */
  const distributeStudents = async () => {
    if (!activeTerm) return;
    try {
      setActionLoading(true);
      const res = await schedulingApi.distributeStudents({ term_id: activeTerm.id });
      showToast('success', res.data.message);
      
      // Refresh data after distribution
      await Promise.all([
        fetchSectioningReport(activeTerm.id),
        fetchSections(),
        sectionsApi.getStats(activeTerm.id).then(res => setStats(res.data))
      ]);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to distribute students');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Updates a section's capacity (target_students).
   */
  const updateSectionCapacity = async (sectionId, capacity) => {
    try {
      setActionLoading(true);
      await sectionsApi.updateSection(sectionId, { target_students: capacity });
      showToast('success', 'Section capacity updated');
      
      // Refresh metrics and section list
      await Promise.all([
        fetchSectioningReport(activeTerm.id),
        fetchSections(),
        sectionsApi.getStats(activeTerm.id).then(res => setStats(res.data))
      ]);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to update capacity');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Fetches the sections list with search and pagination.
   */
  const fetchSections = useCallback(async () => {
    if (!activeTerm) return;
    try {
      setSectionsLoading(true);
      const res = await sectionsApi.getSections({ 
        term_id: activeTerm.id,
        search: searchTerm,
        page: page,
        page_size: 20
      });
      setSections(res.data.results || res.data || []);
      setTotalPages(res.data.count ? Math.ceil(res.data.count / 20) : 1);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      showToast('error', 'Failed to load sections');
    } finally {
      setSectionsLoading(false);
    }
  }, [activeTerm, searchTerm, page, showToast]);

  useEffect(() => {
    fetchData();
  }, []);

  // Automatic Dashboard Update: Poll for updated metrics every 60 seconds
  useEffect(() => {
    if (!activeTerm) return;

    const interval = setInterval(() => {
      fetchSectioningReport(activeTerm.id);
      sectionsApi.getStats(activeTerm.id)
        .then(res => setStats(res.data))
        .catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [activeTerm, fetchSectioningReport]);

  useEffect(() => {
    if (activeTerm) fetchSections();
  }, [activeTerm, fetchSections]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return {
    activeTerm,
    stats,
    sectioningReport,
    programs,
    sections,
    loading,
    sectionsLoading,
    actionLoading,
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    totalCount,
    fetchData,
    fetchSections,
    distributeStudents,
    updateSectionCapacity, // Exported new handler
    refreshReport: () => fetchSectioningReport(activeTerm?.id)
  };
};
