/**
 * MasterlistExportPanel Component
 * 
 * This component provides an interface for exporting a student masterlist to Excel.
 * It is designed to be embedded as a specialized panel within the Grade Finalization page.
 */

import React, { useState, useEffect } from 'react';
import { Download, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { reportsApi } from '../../../api/reports';
import { termsApi } from '../../../api/terms';
import { academicsApi } from '../../../api/academics';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import '../reports/Reports.css';

const MasterlistExportPanel = ({ activeTermId = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [terms, setTerms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filters, setFilters] = useState({
    term_id: activeTermId,
    program_id: '',
    year_level: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTermId && !filters.term_id) {
        setFilters(f => ({ ...f, term_id: activeTermId }));
    }
  }, [activeTermId]);

  const fetchInitialData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        termsApi.getTerms(),
        academicsApi.getPrograms()
      ]);
      setTerms(tRes.data.results || tRes.data);
      setPrograms(pRes.data.results || pRes.data);
    } catch (e) {
      console.error('Failed to fetch initial data for masterlist export:', e);
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
      console.error('Masterlist export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="masterlist-export-panel mt-8">
      <div 
        className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-t-xl cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <TableIcon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Reports & Masterlist Export</h3>
            <p className="text-xs text-slate-500">Download comprehensive Excel reports for the current term</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isOpen && (
        <Card className="rounded-t-none border-t-0 p-6 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Select 
              label="School Term"
              value={filters.term_id}
              onChange={(e) => setFilters({...filters, term_id: e.target.value})}
              options={[
                { value: '', label: 'Select Term' },
                ...terms.map(t => ({ value: t.id, label: t.code }))
              ]}
            />
            <Select 
              label="Academic Program"
              value={filters.program_id}
              onChange={(e) => setFilters({...filters, program_id: e.target.value})}
              options={[
                { value: '', label: 'All Programs' },
                ...programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))
              ]}
            />
            <Select 
              label="Year Level"
              value={filters.year_level}
              onChange={(e) => setFilters({...filters, year_level: e.target.value})}
              options={[
                { value: '', label: 'All Years' },
                ...[1,2,3,4].map(y => ({ value: y, label: `Year ${y}` }))
              ]}
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 max-w-md">
              The export includes student ID, names, programs, year levels, gender, and current enrollment status for the selected term.
            </p>
            <Button 
                onClick={handleExport}
                loading={loading}
                icon={<Download size={18} />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[220px]"
            >
              Download Excel Masterlist
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MasterlistExportPanel;
