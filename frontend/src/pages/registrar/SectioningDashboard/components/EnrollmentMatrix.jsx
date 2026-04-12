/**
 * EnrollmentMatrix.jsx
 * 
 * Renders a grid representing student enrollment across different programs and year levels.
 * Provides triggers for automated section generation based on enrollment density.
 */

import React from 'react';
import { FilePlus, LayoutGrid } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import styles from '../SectioningDashboard.module.css';

const EnrollmentMatrix = ({ programMetrics, onGenerate }) => {
  if (!programMetrics || programMetrics.length === 0) {
    return (
      <div className={styles.matrixCard}>
        <div className={styles.matrixCardHeader}>
          <h3>Approved Students Matrix</h3>
        </div>
        <div className="p-12 text-center text-gray-400">
          No program data available for this term.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.matrixCard}>
      <div className={styles.matrixCardHeader}>
        <h3>Approved Students Matrix</h3>
      </div>
      <div className={styles.matrixTableWrapper}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th>Program / Course</th>
              <th>1st Year</th>
              <th>2nd Year</th>
              <th>3rd Year</th>
              <th>4th Year</th>
            </tr>
          </thead>
          <tbody>
            {programMetrics.map((prog, pIdx) => (
              <tr key={prog.program_id}>
                <td>
                  <div className={styles.programInfo}>
                    <span className={styles.programCode}>{prog.program_code}</span>
                    <span className={styles.programName} title={prog.program_name}>{prog.program_name}</span>
                  </div>
                </td>
                {prog.year_levels.map((yl, yIdx) => {
                  const shortage = Math.max(0, yl.total_students - yl.total_target);
                  const enrollmentProgress = yl.total_target > 0 
                    ? (yl.total_students / yl.total_target) * 100 
                    : 0;
                  
                  return (
                    <td key={yIdx}>
                      <div className={styles.matrixCellDetailed}>
                        <div className={styles.matrixMainCount}>
                          <span className={`${styles.countNumber} ${yl.total_students === 0 ? styles.zero : ''}`}>
                            {yl.total_students}
                          </span>
                        </div>
                        
                        {yl.total_students > 0 && (
                          <div className={styles.matrixSubInfo}>
                            {yl.section_count > 0 && (
                              <div className={`${styles.blockBadge} ${shortage > 0 ? styles.incomplete : ''}`}>
                                {yl.section_count} {yl.section_count === 1 ? 'BLOCK' : 'BLOCKS'}
                              </div>
                            )}
                            
                            {shortage > 0 && (
                              <div className={styles.unassignedWarning}>
                                {shortage} SHORTAGE
                              </div>
                            )}

                            <div className={styles.generateBtnCompact}>
                              <Button 
                                variant={yl.section_count === 0 ? "primary" : "secondary"}
                                size="xs" 
                                style={{ borderRadius: '12px', padding: '1px 8px', fontSize: '8px', fontWeight: '900' }}
                                icon={<FilePlus size={10} />}
                                onClick={() => onGenerate(prog.program_id, yl.year_level)}
                              >
                                {yl.section_count === 0 ? 'GEN' : 'RE-GEN'}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className={styles.matrixCellProgress}>
                          <div 
                            className={styles.matrixCellProgressFill}
                            style={{ 
                              width: `${Math.min(100, enrollmentProgress)}%`,
                              backgroundColor: shortage > 0 ? '#ef4444' : '#3b82f6'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnrollmentMatrix;
