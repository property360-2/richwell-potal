import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';
import Button from './Button';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="pagination">
      <span className="pagination-text">
        Page {currentPage} of {totalPages}
      </span>
      <div className="pagination-controls">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handlePrevious} 
          disabled={currentPage === 1}
          icon={ChevronLeft}
        >
          Previous
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleNext} 
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
