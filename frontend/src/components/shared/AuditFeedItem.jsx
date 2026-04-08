/**
 * @file AuditFeedItem.jsx
 * @description Renders a single audit log entry with interactive expansion.
 * Shared between Admin Audit Logs and Registrar Action History.
 */

import React from 'react';
import { 
  Clock, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText, 
  Settings, 
  Shield, 
  Database,
  UserCheck 
} from 'lucide-react';
import AuditDetailPanel from './AuditDetailPanel';
import styles from './AuditLogs.module.css';

/**
 * Returns a contextual icon based on the model name.
 * @param {string} modelName - The model name
 * @returns {JSX.Element}
 */
const getModelIcon = (modelName) => {
  const name = modelName?.toLowerCase() || '';
  if (name.includes('student')) return <User size={14} />;
  if (name.includes('subject') || name.includes('program')) return <FileText size={14} />;
  if (name.includes('term') || name.includes('academic')) return <Database size={14} />;
  if (name.includes('user') || name.includes('profile')) return <UserCheck size={14} />;
  if (name.includes('permission') || name.includes('role')) return <Shield size={14} />;
  return <Settings size={14} />;
};

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
 * @returns {string} Style class name
 */
const getVerbClass = (action) => {
  switch (action) {
    case 'CREATE': return styles.verbCreate;
    case 'UPDATE': return styles.verbUpdate;
    case 'DELETE': return styles.verbDelete;
    default: return styles.verbUpdate;
  }
};

/**
 * Extracts initials from username for the avatar.
 * @param {string} username - Username string
 * @returns {string}
 */
const getInitials = (username) => {
  if (!username) return 'SY';
  return username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
        className={`${styles.auditEntry} ${isExpanded ? styles.active : ''}`}
        onClick={onToggle}
      >
        <div className={styles.auditAvatar}>
          {getInitials(log.user_username)}
        </div>

        <div className={styles.auditBody}>
          <div className={styles.auditSentence}>
            <span className={styles.auditUser}>{log.user_username || 'System'}</span>
            {' '}
            <span className={`${styles.actionVerb} ${getVerbClass(log.action)}`}>
              {getActionVerb(log.action)}
            </span>
            {' '}
            <span className={styles.auditModel}>
              {getModelIcon(log.model_name)}
              {humanizeModel(log.model_name)}
            </span>
            {' '}
            {log.object_repr && (
              <span className={styles.auditObject}>"{log.object_repr}"</span>
            )}
          </div>

          <div className={styles.auditMeta}>
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
            <div className={styles.changesSummary}>
              {changedFields.map(field => (
                <span key={field} className={styles.changePill}>
                  {field.replace(/_/g, ' ')}
                </span>
              ))}
              {Object.keys(log.changes).length > 4 && (
                <span className={styles.changePill}>+ {Object.keys(log.changes).length - 4} more fields</span>
              )}
            </div>
          )}
        </div>

        <button 
          className={styles.auditExpand} 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && <AuditDetailPanel changes={log.changes} />}
    </React.Fragment>
  );
};

export default AuditFeedItem;
