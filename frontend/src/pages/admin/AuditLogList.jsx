import React, { useState, useEffect } from 'react';
import { auditingApi } from '../../api/auditing';
import { Search, ChevronDown, ChevronUp, Clock, Activity, FileJson, Download, Globe } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import './AuditLogList.css';

// Converts raw action to a human-readable past-tense verb
const getActionVerb = (action) => {
  switch (action) {
    case 'CREATE': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    default: return action?.toLowerCase() || 'modified';
  }
};

// Returns the CSS class for the action verb color
const getVerbClass = (action) => {
  switch (action) {
    case 'CREATE': return 'verb-create';
    case 'UPDATE': return 'verb-update';
    case 'DELETE': return 'verb-delete';
    default: return 'verb-update';
  }
};

// Gets user initials for the avatar
const getInitials = (username) => {
  if (!username) return 'SY';
  return username.substring(0, 2).toUpperCase();
};

// Humanize a model name: "StudentSubject" → "Student Subject"
const humanizeModel = (name) => {
  if (!name) return 'Record';
  return name.replace(/([A-Z])/g, ' $1').trim();
};

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    user: '',
    model_name: '',
    action: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditingApi.getLogs(filters);
      setLogs(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await auditingApi.exportCsv(filters);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed');
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Get a short summary of changed fields for the collapsed view
  const getChangedFields = (changes) => {
    if (!changes || typeof changes !== 'object') return [];
    return Object.keys(changes).slice(0, 4);
  };

  return (
    <div className="audit-page">
      <PageHeader 
        title="System Audit Trail"
        description="Track all data mutations and security events across the platform."
        actions={
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="Filter by Model..."
              icon={<Search size={18} />}
              value={filters.model_name}
              onChange={(e) => setFilters({...filters, model_name: e.target.value})}
              className="w-full sm:w-64"
            />
            
            <Select 
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
              ]}
              className="w-full sm:w-40"
            />

            <Button variant="primary" onClick={handleExport} icon={<Download size={18} />}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="audit-feed-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No audit entries found matching your filters.</div>
        ) : (
          <div className="audit-feed">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const changedFields = getChangedFields(log.changes);
              const hasChanges = changedFields.length > 0;

              return (
                <React.Fragment key={log.id}>
                  <div 
                    className={`audit-entry ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    {/* Avatar */}
                    <div className="audit-avatar">
                      {getInitials(log.user_username)}
                    </div>

                    {/* Body */}
                    <div className="audit-body">
                      {/* Sentence */}
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

                      {/* Meta: timestamp + IP */}
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

                      {/* Changed fields pills (only for UPDATE + collapsed) */}
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

                    {/* Expand toggle */}
                    <button className="audit-expand" onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
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
                          {Object.keys(log.changes).length > 0 ? (
                            Object.entries(log.changes).map(([field, delta]) => (
                              <div key={field} className="diff-row">
                                <div className="field">{field}</div>
                                <div className="old">{delta.old != null ? String(delta.old) : <span className="null-val">None</span>}</div>
                                <div className="new">{delta.new != null ? String(delta.new) : <span className="null-val">None</span>}</div>
                              </div>
                            ))
                          ) : (
                            <div className="no-changes">No field-level changes recorded for this action.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;
