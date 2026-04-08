/**
 * SectionsGrid.jsx
 * 
 * Displays a searchable, paginated list of active sections.
 * Each section is represented by a card showing enrollment fulfillment and metadata.
 */

import React from 'react';
import { LayoutGrid, Users, ChevronRight } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import SearchBar from '../../../../components/shared/SearchBar';
import Pagination from '../../../../components/ui/Pagination';
import styles from '../SectioningDashboard.module.css';

/**
 * SectionsGrid Component
 * 
 * @param {Object} props
 * @param {Array} props.sections - List of active sections
 * @param {Boolean} props.loading - Loading state
 * @param {Number} props.totalCount - Total number of sections
 * @param {Number} props.page - Current page
 * @param {Number} props.totalPages - Total number of pages
 * @param {Function} props.setSearchTerm - Callback to update search filter
 * @param {Function} props.setPage - Callback to change page
 * @param {Function} props.onOpenRoster - Callback to view section details
 */
const SectionsGrid = ({ 
  sections, 
  loading, 
  totalCount, 
  page, 
  totalPages, 
  setSearchTerm, 
  setPage, 
  onOpenRoster 
}) => {
  return (
    <div className={`${styles.sectionsView} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={styles.sectionsHeader}>
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <LayoutGrid size={20} className="text-primary" />
            Active Section Blocks
          </h2>
          <div className={styles.activeUnitLabel}>
            {totalCount} active units available
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar 
            placeholder="Search by section name, session, or program..."
            onSearch={setSearchTerm}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : sections.length > 0 ? (
        <>
          <div className={styles.sectionsGrid}>
            {sections.map(section => {
              const fulfillment = (section.student_count / section.max_students) * 100;
              const barColorClass = 
                section.student_count >= section.max_students ? styles.progressBarFillLevelDanger :
                section.student_count > section.target_students ? styles.progressBarFillLevelWarning :
                styles.progressBarFillLevelNormal;

              return (
                <div 
                  key={section.id} 
                  className={styles.sectionCard}
                  onClick={() => onOpenRoster(section)}
                >
                  <div className={styles.sectionCardHeader}>
                    <div className={styles.sectionNameBox}>
                      <h3>{section.name}</h3>
                      <div className={styles.sectionBadges}>
                        <Badge 
                          variant={section.session === 'AM' ? 'info' : 'warning'} 
                          style={{ fontSize: '9px', fontWeight: 'black' }}
                        >
                          {section.session}
                        </Badge>
                        <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {section.program_code}
                        </span>
                      </div>
                    </div>
                    <div className={styles.capacityInfo}>
                      <div className={styles.currentCount}>{section.student_count}</div>
                      <div className={styles.maxLabel}>/ {section.target_students}</div>
                    </div>
                  </div>
                  
                  <div className={styles.fulfillmentContainer}>
                    <div className={styles.fulfillmentLabels}>
                      <span>Fulfillment</span>
                      <span>{Math.round(fulfillment)}%</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div 
                        className={`${styles.progressBarFill} ${barColorClass}`}
                        style={{ width: `${fulfillment}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className={styles.viewRosterBtn}>
                    <span>View Class Details</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination-wrapper mt-8 pt-6 border-t border-slate-100 flex justify-between items-center px-2">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Page {page} of {totalPages}
              </div>
              <Pagination 
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyStateCard}>
          <Users size={64} style={{ color: 'var(--color-primary)' }} />
          <h3>No Sections Found</h3>
          <p>No sections match your current filters or have been generated yet.</p>
        </div>
      )}
    </div>
  );
};

export default SectionsGrid;
