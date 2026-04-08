/**
 * @file EnrollmentMonitoring.jsx
 * @description Admission report page for tracking daily, weekly, and monthly enrollment progress.
 * Categorizes programs by department (SHS, CHED, TECHVOC) and provides real-time comparisons.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/shared/PageHeader';
import { reportsApi } from '../../api/reports';
import { termsApi } from '../../api/terms';

/**
 * EnrollmentMonitoring Component
 * 
 * Provides a comprehensive dashboard for admission staff to monitor enrollment trends.
 * Supports daily comparisons, weekly breakdowns, and per-program analysis.
 * 
 * @returns {JSX.Element}
 */
const EnrollmentMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedDepts, setExpandedDepts] = useState({ CHED: true, SHS: false, TECHVOC: false });
  const { showToast } = useToast();

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const fetchInitialData = async () => {
    try {
      const termsRes = await termsApi.getTerms();
      const termsList = termsRes.data.results || termsRes.data;
      setTerms(termsList);
      
      const activeTerm = termsList.find(t => t.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsList.length > 0) {
        setSelectedTerm(termsList[0].id);
      }
    } catch (err) {
      showToast('error', 'Failed to fetch setup data');
    }
  };

  const fetchReport = async () => {
    if (!selectedTerm) return;
    try {
      setLoading(true);
      const res = await reportsApi.getAdmissionReport({
        term_id: selectedTerm,
        month: selectedMonth,
        year: selectedYear
      });
      setData(res.data);
    } catch (err) {
      showToast('error', 'Failed to fetch enrollment report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedTerm, selectedMonth, selectedYear]);

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const renderComparativeSummary = () => {
    if (!data) return null;
    const summary = data.summary || [];
    return (
      <Card title="Daily Enrollment Comparison" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left border font-bold text-slate-600">DEPARTMENT</th>
                <th className="p-3 text-center border font-bold text-slate-600">PREVIOUS (TOTAL)</th>
                <th className="p-3 text-center border font-bold text-slate-600">TO DATE (TOTAL)</th>
                <th className="p-3 text-center border font-bold text-slate-600 bg-blue-50">DIFF</th>
              </tr>
            </thead>
            <tbody>
              {['SHS', 'CHED', 'TECHVOC'].map(dept => {
                const s = summary.find(item => item.department === dept);
                const prev = s?.previous || 0;
                const current = s?.total || 0;
                const diff = s?.diff || 0;
                return (
                  <tr key={dept} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border font-semibold">{dept}</td>
                    <td className="p-3 border text-center font-medium bg-slate-50/50">{prev}</td>
                    <td className="p-3 border text-center font-medium">{current}</td>
                    <td className={`p-3 border text-center font-bold bg-blue-50/50 ${diff > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderWeeklyBreakdown = () => {
    if (!data) return null;
    const daily_breakdown = data.daily_breakdown || {};
    
    // Sort dates
    const dates = Object.keys(daily_breakdown).sort();
    
    return (
      <Card title="Current Week Monitoring" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left border font-bold text-slate-600">DEPARTMENT</th>
                {dates.map(d => (
                  <th key={d} className="p-3 text-center border font-bold text-slate-600">
                    {new Date(d).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                  </th>
                ))}
                <th className="p-3 text-center border font-bold text-slate-600 bg-blue-50">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {['SHS', 'CHED', 'TECHVOC'].map(dept => {
                let rowTotal = 0;
                return (
                  <tr key={dept} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border font-semibold">{dept}</td>
                    {dates.map(d => {
                      const count = daily_breakdown[d]?.[dept] || 0;
                      rowTotal += count;
                      return (
                        <td key={d} className={`p-3 border text-center font-medium ${count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {count || '-'}
                        </td>
                      );
                    })}
                    <td className="p-3 border text-center font-bold bg-blue-50/50">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderProgramBreakdown = () => {
    if (!data || !data.programs) return null;
    const { programs } = data;

    return (
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          Per Program Breakdown
        </h3>
        
        {['CHED', 'SHS', 'TECHVOC'].map(dept => {
          const deptPrograms = programs.filter(p => p.department === dept);
          if (deptPrograms.length === 0) return null;

          return (
            <Card key={dept} noPadding className="overflow-hidden border-slate-200">
              <div 
                className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleDept(dept)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-md ${expandedDepts[dept] ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                    {expandedDepts[dept] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <h4 className="font-bold text-slate-700">{dept} Programs</h4>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">Total Count: <span className="font-bold text-slate-800">{deptPrograms.reduce((acc, p) => acc + p.total, 0)}</span></span>
                </div>
              </div>
              
              {expandedDepts[dept] && (
                <div className="p-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Table
                    columns={[
                      { header: 'PROGRAM CODE', accessor: 'code', sticky: true },
                      { header: 'NAME', accessor: 'name' },
                      { 
                        header: 'PREVIOUS', 
                        headerClassName: 'text-center',
                        className: 'text-center text-slate-500 font-medium',
                        accessor: 'previous' 
                      },
                      { 
                        header: 'NEW', 
                        headerClassName: 'text-center',
                        className: 'text-center text-emerald-600 font-bold',
                        accessor: 'diff' 
                      },
                      { 
                        header: 'TO DATE', 
                        headerClassName: 'text-center text-blue-600',
                        className: 'text-center font-bold text-blue-700 bg-blue-50',
                        accessor: 'total' 
                      }
                    ]}
                    data={deptPrograms}
                    loading={loading}
                    variant="compact"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthlyDetails = () => {
    if (!data) return null;
    const monthly_breakdown = data.monthly_breakdown || [];
    const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label;

    return (
      <Card title={`Monthly Log: ${currentMonthLabel} ${selectedYear}`}>
         <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th rowSpan="2" className="p-3 text-center border font-bold text-slate-600">DATE</th>
                <th colSpan="3" className="p-3 text-center border font-bold bg-blue-50 text-blue-700">SHS</th>
                <th colSpan="3" className="p-3 text-center border font-bold bg-purple-50 text-purple-700">CHED</th>
                <th colSpan="3" className="p-3 text-center border font-bold bg-orange-50 text-orange-700">DIPLOMA / TECHVOC</th>
              </tr>
              <tr>
                {/* SHS */}
                <th className="p-2 text-center border bg-blue-50/30 font-semibold text-slate-500 border-t-0">Prev</th>
                <th className="p-2 text-center border bg-blue-50/30 font-semibold text-slate-500 border-t-0">New</th>
                <th className="p-2 text-center border bg-blue-50/30 font-bold text-slate-700 border-t-0">Total</th>
                {/* CHED */}
                <th className="p-2 text-center border bg-purple-50/30 font-semibold text-slate-500 border-t-0">Prev</th>
                <th className="p-2 text-center border bg-purple-50/30 font-semibold text-slate-500 border-t-0">New</th>
                <th className="p-2 text-center border bg-purple-50/30 font-bold text-slate-700 border-t-0">Total</th>
                {/* TECHVOC */}
                <th className="p-2 text-center border bg-orange-50/30 font-semibold text-slate-500 border-t-0">Prev</th>
                <th className="p-2 text-center border bg-orange-50/30 font-semibold text-slate-500 border-t-0">New</th>
                <th className="p-2 text-center border bg-orange-50/30 font-bold text-slate-700 border-t-0">Total</th>
              </tr>
            </thead>
            <tbody>
              {monthly_breakdown.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                  <td className="p-2 border text-center font-bold text-slate-600">{row.day}</td>
                  {/* SHS */}
                  <td className="p-2 border text-center text-slate-400">{row.SHS.previous || '-'}</td>
                  <td className="p-2 border text-center text-emerald-600 font-medium">{row.SHS.new || ''}</td>
                  <td className="p-2 border text-center font-bold bg-blue-50/20">{row.SHS.total || '-'}</td>
                  {/* CHED */}
                  <td className="p-2 border text-center text-slate-400">{row.CHED.previous || '-'}</td>
                  <td className="p-2 border text-center text-emerald-600 font-medium">{row.CHED.new || ''}</td>
                  <td className="p-2 border text-center font-bold bg-purple-50/20">{row.CHED.total || '-'}</td>
                  {/* TECHVOC */}
                  <td className="p-2 border text-center text-slate-400">{row.TECHVOC.previous || '-'}</td>
                  <td className="p-2 border text-center text-emerald-600 font-medium">{row.TECHVOC.new || ''}</td>
                  <td className="p-2 border text-center font-bold bg-orange-50/20">{row.TECHVOC.total || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="dashboard-container p-6 bg-slate-50 min-h-screen">
      <PageHeader 
        title="Enrollment Monitoring" 
        icon={<ClipboardList className="text-blue-500" />}
        description="Daily recruitment and admission progress tracking for S.Y. 2026-2027"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} icon={<Download size={16} />}>
            Export PDF
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Report Scope:</span>
          </div>

          <div className="flex gap-4 flex-1">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Academic Term</label>
              <select 
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                <option value="">Select Term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.is_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[100px]">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm animate-pulse">Aggregating enrollment data...</p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderComparativeSummary()}
            {renderWeeklyBreakdown()}
          </div>
          
          {renderProgramBreakdown()}
          
          {renderMonthlyDetails()}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, button, select, label, .Filter { display: none !important; }
          .dashboard-container { padding: 0 !important; background: white !important; }
          .Card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; border-radius: 0 !important; margin-bottom: 20px !important; }
          .Table, table { font-size: 10pt !important; width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 4px 8px !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          h1, h2, h3, h4 { color: black !important; margin-bottom: 10px !important; }
        }
      `}} />
    </div>
  );
};

export default EnrollmentMonitoring;
