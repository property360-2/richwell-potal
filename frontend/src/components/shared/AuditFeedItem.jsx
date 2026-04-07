/**
 * @file AuditFeedItem.jsx
 * @description Renders a single audit log entry with interactive expansion.
 * Shared between Admin Audit Logs and Registrar Action History.
 */

import React from 'react';
import { Clock, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import AuditDetailPanel from './AuditDetailPanel';

/**
 * Converts raw action type to a human-readable past-tense verb.
 * @param {string} action - Action string
 * @returns {string}
 */
const getActionVerb = (action) => {
  switch (action) {
    case 'CREATE': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    default: return action?.toLowerCase() || 'modified';
  }
};

/**
 * Returns the CSS class for the action verb color coding.
 * @param {string} action - Action string
 * @returns {string}
 */
const getVerbClass = (action) => {
  switch (action) {
    case 'CREATE': return 'verb-create';
    case 'UPDATE': return 'verb-update';
    case 'DELETE': return 'verb-delete';
    default: return 'verb-update';
  }
};

/**
 * Extracts initials from username for the avatar.
 * @param {string} username - Username string
 * @returns {string}
 */
const getInitials = (username) => {
  if (!username) return 'SY';
  return username.substring(0, 2).toUpperCase();
};

/**
 * Formats model names into readable text (e.g. "StudentSubject" -> "Student Subject").
 * @param {string} name - Model name
 * @returns {string}
 */
const humanizeModel = (name) => {
  if (!name) return 'Record';
  return name.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * AuditFeedItem Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.log - The log entity object from API
 * @param {boolean} props.isExpanded - Whether this item is currently expanded
 * @param {Function} props.onToggle - Callback to toggle expansion state
 * @returns {JSX.Element}
 */
const AuditFeedItem = ({ log, isExpanded, onToggle }) => {
  const changedFields = log.changes ? Object.keys(log.changes).slice(0, 4) : [];
  const hasChanges = changedFields.length > 0;

  return (
    <React.Fragment>
      <div 
        className={`audit-entry ${isExpanded ? 'active' : ''}`}
        onClick={onToggle}
      >
        <div className="audit-avatar">
          {getInitials(log.user_username)}
        </div>

        <div className="audit-body">
          <div className="audit-sentence">
            <span className="audit-user">{log.user_username || 'System'}</span>
            {' '}
            <span className={`action-verb ${getVerbClass(log.action)}`}>
              {getActionVerb(log.action)}
            </span>
            {' '}
            <span className="audit-model">{humanizeModel(log.model_name)}</span>
            {' '}
            {log.object_repr && (
              <span className="audit-object">"{log.object_repr}"</span>
            )}
          </div>

          <div className="audit-meta">
            <span>
              <Clock size={12} />
              {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {log.ip_address && (
              <span>
                <Globe size={12} />
                {log.ip_address}
              </span>
            )}
          </div>

          {!isExpanded && hasChanges && (
            <div className="changes-summary">
              {changedFields.map(field => (
                <span key={field} className="change-pill">{field}</span>
              ))}
              {Object.keys(log.changes).length > 4 && (
                <span className="change-pill">+{Object.keys(log.changes).length - 4} more</span>
              )}
            </div>
          )}
        </div>

        <button className="audit-expand" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && <AuditDetailPanel changes={log.changes} />}
    </React.Fragment>
  );
};

export default AuditFeedItem;
