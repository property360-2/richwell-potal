/**
 * EnrollmentMatrix.jsx
 * 
 * Renders a grid representing student enrollment across different programs and year levels.
 * Provides triggers for automated section generation based on enrollment density.
 */

import React from 'react';
import { FilePlus } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import styles from '../SectioningDashboard.module.css';

/**
 * EnrollmentMatrix Component
 * 
 * @param {Object} props
 * @param {Array} props.programs - List of academic programs
 * @param {Object} props.matrix - Map of counts [programId][yearLevel]
 * @param {Array} props.sections - List of currently generated sections
 * @param {Function} props.onGenerate - Callback to trigger section generation preview
 */
const EnrollmentMatrix = ({ programs, matrix, sections, onGenerate }) => {
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
            {programs.map(program => (
              <tr key={program.id}>
                <td>
                  <div className={styles.programInfo}>
                    <span className={styles.programCode}>{program.code}</span>
                    <span className={styles.programName} title={program.name}>{program.name}</span>
                  </div>
                </td>
                {[1, 2, 3, 4].map(year => {
                  const count = matrix[program.id]?.[year] || 0;
                  const existingSections = sections.filter(
                    s => s.program === program.id && s.year_level === year
                  );
                  const isFull = existingSections.some(s => s.student_count >= s.max_students);
                  
                  // Calculate required sections based on 40 cap
                  const requiredSections = Math.ceil(count / 40.0);
                  const needsMore = count > 0 && existingSections.length < requiredSections;
                  
                  return (
                    <td key={year}>
                      <div className={styles.studentCountCell}>
                        <span className={`${styles.countNumber} ${count === 0 ? styles.zero : ''}`}>
                          {count}
                        </span>
                        
                        {count > 0 && (
                          <div className="flex flex-col gap-2 items-center">
                            {existingSections.length > 0 && (
                              <Badge 
                                variant={isFull ? "error" : "success"} 
                                style={{ borderRadius: '20px', fontWeight: 'bold' }}
                              >
                                {existingSections.length} {existingSections.length === requiredSections ? (existingSections.length === 1 ? 'BLOCK' : 'BLOCKS') : `/ ${requiredSections} BLOCKS`}
                              </Badge>
                            )}
                            
                            {(existingSections.length === 0 || needsMore) && (
                              <Button 
                                variant={existingSections.length === 0 ? "primary" : "secondary"}
                                size="xs" 
                                style={{ borderRadius: '12px', padding: '2px 8px', fontSize: '9px', fontWeight: 'black' }}
                                icon={<FilePlus size={10} />}
                                onClick={() => onGenerate(program.id, year)}
                              >
                                {existingSections.length === 0 ? 'GENERATE' : 'RE-GENERATE'}
                              </Button>
                            )}
                          </div>
                        )}
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
