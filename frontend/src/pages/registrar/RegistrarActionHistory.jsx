/**
 * @file RegistrarActionHistory.jsx
 * @description Provides a focused view of administrative actions performed within 
 * the registrar department. This ensures accountability and allows staff to track 
 * their recent data modifications.
 */

import React, { useState, useEffect } from 'react';
import { auditingApi } from '../../api/auditing';
import { Search, Download } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import AuditFeedItem from '../../components/shared/AuditFeedItem';
import '../admin/AuditLogList.css'; // Reuse existing styles

/**
 * RegistrarActionHistory Component
 * 
 * Filtered history view specifically for registrar-related actions.
 * 
 * @returns {JSX.Element}
 */
const RegistrarActionHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    model_name: '',
    action: '',
    start_date: '',
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

  /**
   * Fetches the history logs using the registrar-specific endpoint.
   */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
        page: page
      };
      const res = await auditingApi.getRegistrarHistory(params);
      
      if (res.data.results) {
        setLogs(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setLogs(res.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch action history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers a CSV export of the registrar's history.
   */
  const handleExport = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await auditingApi.exportRegistrarCsv(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registrar_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed');
    }
  };

  /**
   * Toggles the detail view for a specific log entry.
   * @param {string|number} id - Log entry ID
   */
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="audit-page">
      <PageHeader 
        title="Action History"
        description="View recent administrative actions performed by the registrar department."
        actions={
          <Button variant="primary" onClick={handleExport} icon={<Download size={18} />}>
            Export CSV
          </Button>
        }
      />

      <div className="audit-controls">
        <div className="search-box">
          <Input 
            placeholder="Search by ID or record..."
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
                value={filters.start_date || ''}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                className="date-input"
              />
              <span>to</span>
              <input 
                type="date" 
                value={filters.end_date || ''}
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
                { value: 'model_name', label: 'Model (A-Z)' },
                { value: 'action', label: 'Action Type' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="audit-feed-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No action history found matching your filters.</div>
        ) : (
          <div className="audit-feed">
            {logs.map((log) => (
              <AuditFeedItem 
                key={log.id} 
                log={log} 
                isExpanded={expandedId === log.id}
                onToggle={() => toggleExpand(log.id)}
              />
            ))}
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

export default RegistrarActionHistory;
