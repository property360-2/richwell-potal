import React, { useState, useEffect } from 'react';
import { auditingApi } from '../../api/auditing';
import { Search, ChevronDown, ChevronUp, Clock, Activity, FileJson, Download, Globe } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
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
    search: '',
    user: '',
    model_name: '',
    action: '',
    end_date: '',
    ordering: '-created_at',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 400);
    return () => clearTimeout(timer);
  }, [filters, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
        page: page
      };
      
      const res = await auditingApi.getLogs(params);
      
      if (res.data.results) {
        setLogs(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setLogs(res.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await auditingApi.exportCsv(params);
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
          <Button variant="primary" onClick={handleExport} icon={<Download size={18} />}>
            Export CSV
          </Button>
        }
      />

      {/* Advanced Filter Bar */}
      <div className="audit-controls">
        <div className="search-box">
          <Input 
            placeholder="Search by ID, user, or record..."
            icon={<Search size={18} />}
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full"
          />
        </div>
        
        <div className="filter-grid">
          <div className="filter-group">
            <label>Model</label>
            <Input 
              placeholder="e.g. Student"
              value={filters.model_name}
              onChange={(e) => setFilters({...filters, model_name: e.target.value})}
            />
          </div>

          <div className="filter-group">
            <label>Action</label>
            <Select 
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
              ]}
            />
          </div>

          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-inputs">
              <input 
                type="date" 
                value={filters.start_date}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                className="date-input"
              />
              <span>to</span>
              <input 
                type="date" 
                value={filters.end_date}
                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                className="date-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <Select 
              value={filters.ordering}
              onChange={(e) => setFilters({...filters, ordering: e.target.value})}
              options={[
                { value: '-created_at', label: 'Newest First' },
                { value: 'created_at', label: 'Oldest First' },
                { value: 'user__username', label: 'User (A-Z)' },
                { value: '-user__username', label: 'User (Z-A)' },
                { value: 'model_name', label: 'Model (A-Z)' },
              ]}
            />
          </div>
        </div>
      </div>


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
        
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <Pagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;
