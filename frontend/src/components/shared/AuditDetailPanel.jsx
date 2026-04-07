/**
 * @file AuditDetailPanel.jsx
 * @description Component for displaying field-level changes (diffs) in a structured grid.
 * Used within expanded audit log entries.
 */

import React from 'react';
import { FileJson } from 'lucide-react';

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
    <div className="audit-detail-panel">
      <div className="audit-details">
        <div className="detail-header">
          <FileJson size={14} />
          <span>Field-Level Changes</span>
        </div>
        <div className="diff-grid">
          <div className="diff-header">
            <div className="field">Field</div>
            <div className="old">Previous</div>
            <div className="new">New Value</div>
          </div>
          {changeEntries.length > 0 ? (
            changeEntries.map(([field, delta]) => (
              <div key={field} className="diff-row">
                <div className="field">{field}</div>
                <div className="old">
                  {delta.old != null ? String(delta.old) : <span className="null-val">None</span>}
                </div>
                <div className="new">
                  {delta.new != null ? String(delta.new) : <span className="null-val">None</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="no-changes">No field-level changes recorded for this action.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditDetailPanel;
