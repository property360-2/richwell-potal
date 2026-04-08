/**
 * useSectioningData.js
 * 
 * Custom hook for managing the state and data fetching logic of the Sectioning Dashboard.
 * Encapsulates term management, enrollment statistics, and section list state.
 */

import { useState, useEffect, useCallback } from 'react';
import { sectionsApi } from '../../../../api/sections';
import { termsApi } from '../../../../api/terms';
import academicsApi from '../../../../api/academics';
import { useToast } from '../../../../components/ui/Toast';

export const useSectioningData = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [stats, setStats] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  
  // Pagination & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { showToast } = useToast();

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
          academicsApi.getPrograms()
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

  useEffect(() => {
    if (activeTerm) fetchSections();
  }, [activeTerm, fetchSections]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return {
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
  };
};
