/**
 * @file AuditDetailPanel.jsx
 * @description Component for displaying field-level changes (diffs) in a structured grid.
 * Used within expanded audit log entries.
 */

import React from 'react';
import { FileJson, ArrowRight } from 'lucide-react';
import styles from './AuditLogs.module.css';

/**
 * AuditDetailPanel Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.changes - Object containing field-level deltas (old/new pairs)
 * @returns {JSX.Element}
 */
const AuditDetailPanel = ({ changes }) => {
  const changeEntries = Object.entries(changes || {});

  return (
    <div className={styles.auditDetailPanel}>
      <div className={styles.auditDetails}>
        <div className={styles.detailHeader}>
          <FileJson size={14} />
          <span>Field-Level Changes</span>
        </div>
        <div className={styles.diffGrid}>
          <div className={styles.diffHeader}>
            <div className={styles.field}>Field Name</div>
            <div className={styles.old}>Original Value</div>
            <div className={styles.new}>Updated Value</div>
          </div>
          {changeEntries.length > 0 ? (
            changeEntries.map(([field, delta]) => (
              <div key={field} className={styles.diffRow}>
                <div className={styles.field}>
                  {field.replace(/_/g, ' ')}
                </div>
                <div className={styles.old}>
                  {delta.old != null ? (
                    typeof delta.old === 'object' ? JSON.stringify(delta.old) : String(delta.old)
                  ) : (
                    <span className={styles.nullVal}>Empty</span>
                  )}
                </div>
                <div className={styles.new}>
                  {delta.new != null ? (
                    typeof delta.new === 'object' ? JSON.stringify(delta.new) : String(delta.new)
                  ) : (
                    <span className={styles.nullVal}>Empty</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noChanges}>No field-level changes recorded for this action.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditDetailPanel;
