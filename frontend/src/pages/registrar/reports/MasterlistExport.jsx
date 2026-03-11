import React, { useState } from 'react';
import { Download, Table as TableIcon, Filter } from 'lucide-react';
import { reportsApi } from '../../../api/reports';
import { termsApi } from '../../../api/terms';
import { academicsApi } from '../../../api/academics';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import './Reports.css';

const MasterlistExport = () => {
  const [terms, setTerms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filters, setFilters] = useState({
    term_id: '',
    program_id: '',
    year_level: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        termsApi.getTerms(),
        academicsApi.getPrograms()
      ]);
      setTerms(tRes.data.results || tRes.data);
      setPrograms(pRes.data.results || pRes.data);
      
      const active = tRes.data.find(t => t.is_active);
      if (active) setFilters(f => ({ ...f, term_id: active.id }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    if (!filters.term_id) return;
    setLoading(true);
    try {
      const res = await reportsApi.getMasterlist(filters);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_masterlist.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div className="header-icon-box bg-emerald-50 text-emerald-600">
           <TableIcon />
        </div>
        <div>
          <h1>Masterlist Export</h1>
          <p>Download comprehensive Excel files of enrolled students.</p>
        </div>
      </div>

      <Card className="filter-card p-8">
        <div className="filter-grid-layout">
          <div className="filter-item">
            <label>School Term</label>
            <select 
                value={filters.term_id}
                onChange={(e) => setFilters({...filters, term_id: e.target.value})}
            >
                <option value="">Select Term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
            </select>
          </div>

          <div className="filter-item">
            <label>Academic Program (Optional)</label>
            <select 
                value={filters.program_id}
                onChange={(e) => setFilters({...filters, program_id: e.target.value})}
            >
                <option value="">All Programs</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>

          <div className="filter-item">
            <label>Year Level (Optional)</label>
            <select 
                value={filters.year_level}
                onChange={(e) => setFilters({...filters, year_level: e.target.value})}
            >
                <option value="">All Years</option>
                {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
        </div>

        <div className="export-actions">
           <Button 
            className="export-btn" 
            onClick={handleExport}
            loading={loading}
            icon={<Download size={20} />}
           >
             Download Excel Masterlist
           </Button>
           <p className="hint-text">
             The export includes student ID, name, program, year level, gender, and current status.
           </p>
        </div>
      </Card>
    </div>
  );
};

export default MasterlistExport;
