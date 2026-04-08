/**
 * GradeReviewPage/index.jsx
 * 
 * Main entry point for the Grade Review feature.
 * Provides the interface for the registrar to lock section grades.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Layers } from 'lucide-react';
import PageHeader from '../../../components/shared/PageHeader';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Local Components & Hooks
import RosterTable from './components/RosterTable';
import SummaryPanel from './components/SummaryPanel';
import { useGradeRoster } from './hooks/useGradeRoster';

/**
 * GradeReviewPage Controller
 */
const GradeReviewPage = () => {
  const { termId, sectionId, subjectId } = useParams();
  const navigate = useNavigate();
  
  const {
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
    handleFinalize
  } = useGradeRoster(termId, sectionId, subjectId);

  if (loading && roster.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          icon={<ChevronLeft size={18} />} 
          onClick={() => navigate('/registrar/grades')}
        >
          Back to Dashboard
        </Button>
      </div>

      <PageHeader
        title={`${meta.subjectCode}: ${meta.subjectName}`}
        description={
          <div className="flex flex-col gap-1 text-sm">
            <div className="text-slate-500">
              Final review of student grades for <span className="font-bold text-slate-700">{meta.sectionName}</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-medium">
               <span>Professor: {meta.professorName}</span>
            </div>
          </div>
        }
        badge={<div className="p-3 bg-primary/10 text-primary rounded-xl"><FileText size={24} /></div>}
        actions={
          <Button 
            variant="primary" 
            size="lg" 
            icon={<Layers size={20} />} 
            loading={isFinalizing}
            onClick={handleFinalize}
            className="shadow-lg shadow-primary/20"
          >
            Finalize All Grades
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RosterTable 
            roster={roster}
            loading={loading}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setPage={setPage}
          />
        </div>

        <div className="md:col-span-1">
          <SummaryPanel meta={meta} totalCount={totalCount} />
        </div>
      </div>
    </div>
  );
};

export default GradeReviewPage;
