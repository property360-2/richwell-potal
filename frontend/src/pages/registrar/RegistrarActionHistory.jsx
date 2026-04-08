/**
 * @file RegistrarActionHistory.jsx
 * @description Provides a focused view of administrative actions performed within 
 * the registrar department. This ensures accountability and allows staff to track 
 * their recent data modifications.
 */

import React, { useState, useEffect } from 'react';
import { auditingApi } from '../../api/auditing';
import { Search, Download, Filter, Calendar, ListFilter } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import AuditFeedItem from '../../components/shared/AuditFeedItem';
import styles from '../../styles/AuditPageLayout.module.css';

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
    <div className={styles.auditPage}>
      <PageHeader 
        title="Action History"
        description="Monitor and audit administrative actions within the registrar department."
        actions={
          <Button variant="primary" onClick={handleExport} icon={<Download size={18} />}>
            Export CSV
          </Button>
        }
      />

      <div className={styles.auditControls}>
        <div className={styles.searchBox}>
          <Input 
            placeholder="Search by object representation, username, or IP..."
            icon={<Search size={18} />}
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full"
          />
        </div>
        
        <div className={styles.filterGrid}>
          <div className={styles.filterGroup}>
            <label><Filter size={12} /> Model Type</label>
            <Input 
              placeholder="e.g. Student"
              value={filters.model_name}
              onChange={(e) => setFilters({...filters, model_name: e.target.value})}
            />
          </div>

          <div className={styles.filterGroup}>
            <label><ListFilter size={12} /> Action</label>
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

          <div className={styles.filterGroup}>
            <label><Calendar size={12} /> Date Range</label>
            <div className={styles.dateInputs}>
              <input 
                type="date" 
                value={filters.start_date || ''}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                className={styles.dateInput}
              />
              <span>to</span>
              <input 
                type="date" 
                value={filters.end_date || ''}
                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort Ordering</label>
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

      <div className={styles.auditFeedContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Gathering action history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No activity logs found for the current filters.</p>
          </div>
        ) : (
          <div className={styles.auditFeed}>
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
          <div className="mt-8 flex justify-center">
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
