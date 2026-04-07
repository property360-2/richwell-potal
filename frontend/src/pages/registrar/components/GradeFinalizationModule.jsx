/**
 * Richwell Portal — Grade Finalization Module
 * 
 * Orchestrates the search, filtering, and pagination for different grading 
 * views (Queue, Resolutions, Finalization).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, ShieldAlert, ChevronRight } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import SearchBar from '../../../components/shared/SearchBar';
import Pagination from '../../../components/ui/Pagination';
import { gradesApi } from '../../../api/grades';
import { useToast } from '../../../components/ui/Toast';
import GradeSectionsTable from './GradeSectionsTable';
import GradeResolutionModals from './GradeResolutionModals';

/**
 * GradeFinalizationModule Component
 * 
 * @param {Object} activeTerm - The current active academic term.
 */
const GradeFinalizationModule = ({ activeTerm }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  useEffect(() => {
    if (activeTerm) fetchData();
  }, [activeTerm, activeTab, page, searchTerm]);

  /**
   * Fetches data based on active tab, search term, and page.
   */
  const fetchData = async () => {
    if (!activeTerm) return;
    try {
      setLoading(true);
      let res;
      if (activeTab === 'pending') {
        res = await gradesApi.getGrades({
          term: activeTerm.id,
          finalized_at__isnull: 'true',
          grade_status__in: 'ENROLLED,PASSED,FAILED,INC,NO_GRADE',
          search: searchTerm,
          page_size: 200 // Grouping needs more data
        });
        const grades = res.data?.results || res.data || [];
        const grouped = groupGradesIntoSections(grades);
        setData(grouped);
        setTotalPages(1);
        setTotalCount(grouped.length);
      } else {
        res = await gradesApi.getGrades({
          grade_status: activeTab === 'resolutions' ? 'INC' : undefined,
          resolution_status: activeTab === 'resolutions' ? 'REQUESTED' : 'HEAD_APPROVED',
          search: searchTerm,
          page: page
        });
        setData(res.data?.results || []);
        setTotalPages(res.data.count ? Math.ceil(res.data.count / 20) : 1);
        setTotalCount(res.data.count || 0);
      }
    } catch (error) {
      addToast('error', 'Failed to load grading data.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Groups individual grades into section blocks for the finalization queue.
   */
  const groupGradesIntoSections = (grades) => {
    const grouped = {};
    grades.forEach(g => {
      const key = `${g.section}-${g.subject}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          section_id: g.section,
          section_code: g.section_details?.name || `Section ${g.section}`,
          subject_id: g.subject,
          subject_code: g.subject_details?.code,
          subject_name: g.subject_details?.name,
          instructor_name: g.professor_name || 'TBA',
          grading_progress: 100 // placeholder since real calculation is complex
        };
      }
    });
    return Object.values(grouped);
  };

  const handleSelectSection = (section) => {
    if (activeTab === 'pending') {
      navigate(`/registrar/grades/review/${activeTerm.id}/${section.section_id}/${section.subject_id}`);
    } else {
      setSelectedDetails(section);
      setIsDetailsModalOpen(true);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return addToast('warning', 'Please provide a reason.');
    try {
      setLoading(true);
      await gradesApi.registrarRejectResolution(selectedRes.id, rejectReason);
      addToast('info', 'Resolution request rejected.');
      setIsRejectModalOpen(false);
      fetchData();
    } catch (e) {
      addToast('error', 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs 
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setPage(1); }}
            tabs={[
              { id: 'pending', label: 'Finalization Queue' },
              { id: 'resolutions', label: 'INC Resolutions' },
              { id: 'finalization', label: 'Final Approvals' }
            ]}
          />
          <SearchBar 
            placeholder="Search subjects, sections..." 
            onSearch={(val) => { setSearchTerm(val); setPage(1); }}
          />
        </div>
        
        <div className="p-0">
          <GradeSectionsTable 
            data={data} 
            type={activeTab} 
            onSelect={handleSelectSection} 
          />
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing {data.length} of {totalCount} records
            </span>
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          </div>
        )}
      </Card>

      <GradeResolutionModals 
        isRejectModalOpen={isRejectModalOpen}
        setIsRejectModalOpen={setIsRejectModalOpen}
        selectedRes={selectedRes}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        handleReject={handleReject}
        isDetailsModalOpen={isDetailsModalOpen}
        setIsDetailsModalOpen={setIsDetailsModalOpen}
        selectedDetails={selectedDetails}
        loading={loading}
      />
    </div>
  );
};

export default GradeFinalizationModule;
