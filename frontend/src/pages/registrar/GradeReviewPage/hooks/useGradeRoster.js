/**
 * useGradeRoster.js
 * 
 * Custom hook for managing the grade review process for a specific section and subject.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradesApi } from '../../../../api/grades';
import { useToast } from '../../../../components/ui/Toast';

export const useGradeRoster = (termId, sectionId, subjectId) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [roster, setRoster] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [meta, setMeta] = useState({
    sectionName: 'Loading...',
    subjectName: 'Loading...',
    subjectCode: '...',
    professorName: '...'
  });

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getSectionStudents(sectionId, subjectId, {
        page,
        search: searchTerm
      });
      
      const data = res.data;
      const students = data.results || data || [];
      setRoster(students);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || students.length);

      if (students.length > 0) {
        const first = students[0];
        setMeta({
          sectionName: first.section_details?.name || `Section ${sectionId}`,
          subjectName: first.subject_details?.name || 'Subject',
          subjectCode: first.subject_details?.code || '',
          professorName: first.professor_name || 'TBA'
        });
      }
    } catch (error) {
      console.error('Failed to load grade roster.', error);
      showToast('error', 'Failed to load grade roster');
    } finally {
      setLoading(false);
    }
  }, [sectionId, subjectId, page, searchTerm, showToast]);

  useEffect(() => {
    if (sectionId && subjectId) fetchRoster();
  }, [fetchRoster, sectionId, subjectId]);

  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize these grades? This action is permanent and will lock the grades for this section.')) {
        return;
    }
    
    try {
      setIsFinalizing(true);
      await gradesApi.finalizeSection({
        term: termId,
        subject: subjectId,
        section: sectionId
      });
      showToast('success', 'Grades finalized successfully!');
      navigate('/registrar/grades');
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Finalization failed.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return {
    loading,
    isFinalizing,
    roster,
    page,
    setPage,
    totalPages,
    totalCount,
    searchTerm,
    setSearchTerm,
    meta,
    fetchRoster,
    handleFinalize
  };
};
