import React, { useState, useEffect } from 'react';
import { auditingApi } from '../../api/auditing';
import { Search, Filter, ChevronDown, ChevronUp, User, Database, Clock, Activity, FileJson, Download } from 'lucide-react';
import './AuditLogList.css';

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

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREATE': return 'badge-create';
      case 'UPDATE': return 'badge-update';
      case 'DELETE': return 'badge-delete';
      default: return 'badge-general';
    }
  };

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div className="header-content">
          <Activity className="header-icon" />
          <div>
            <h1>System Audit Trail</h1>
            <p>Track all data mutations and security events across the platform.</p>
          </div>
        </div>
        
        <div className="filter-bar">
          <div className="search-input">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Filter by Model (e.g. Student)..."
              value={filters.model_name}
              onChange={(e) => setFilters({...filters, model_name: e.target.value})}
            />
          </div>
          
          <select 
            value={filters.action}
            onChange={(e) => setFilters({...filters, action: e.target.value})}
            className="filter-select"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          <button className="export-btn-primary" onClick={handleExport}>
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="audit-container card-glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Scanning system logs...</p>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target Model</th>
                  <th>Object</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`audit-row ${expandedId === log.id ? 'active' : ''}`}
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td className="time-cell">
                        <Clock size={14} />
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="user-cell">
                        <div className="user-tag">
                          <User size={14} />
                          <span>{log.user_username || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="model-cell">
                        <Database size={14} />
                        {log.model_name}
                      </td>
                      <td className="repr-cell">{log.object_repr}</td>
                      <td>
                         <button className="expand-btn">
                            {expandedId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                         </button>
                      </td>
                    </tr>
                    
                    {expandedId === log.id && (
                      <tr className="detail-row">
                        <td colSpan="6">
                          <div className="audit-details animate-in slide-in-from-top-2 duration-200">
                             <div className="detail-header">
                                <FileJson size={16} />
                                <span>Field-Level Changes ({log.ip_address || 'Internal'})</span>
                             </div>
                             <div className="diff-grid">
                                <div className="diff-header">
                                   <div className="field">Field</div>
                                   <div className="old">Old Value</div>
                                   <div className="new">New Value</div>
                                </div>
                                {Object.keys(log.changes).length > 0 ? (
                                  Object.entries(log.changes).map(([field, delta]) => (
                                    <div key={field} className="diff-row">
                                      <div className="field">{field}</div>
                                      <div className="old">{delta.old || <span className="null-val">None</span>}</div>
                                      <div className="new">{delta.new || <span className="null-val">None</span>}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="no-changes">No field-level changes recorded for this action.</div>
                                )}
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;
