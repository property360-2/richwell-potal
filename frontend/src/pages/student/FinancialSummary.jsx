import React, { useState, useEffect } from 'react';
import { CreditCard, History, CheckCircle2, AlertCircle, Clock, ShieldCheck, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { financeApi } from '../../api/finance';
import { useAuth } from '../../hooks/useAuth';
import './FinancialSummary.css';

const FinancialSummary = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [permits, setPermits] = useState(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      // Assuming term 1 for now
      const [historyRes, permitRes] = await Promise.all([
        financeApi.getPayments({ student_user: user.id }),
        financeApi.getMyPermits(1)
      ]);
      setHistory(historyRes.data.results || historyRes.data);
      setPermits(permitRes.data);
    } catch (error) {
      console.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Date',
      render: (row) => <div className="text-sm text-slate-500">{new Date(row.created_at).toLocaleDateString()}</div>
    },
    {
      header: 'Month',
      render: (row) => <Badge variant="ghost">Month {row.month}</Badge>
    },
    {
        header: 'Type',
        render: (row) => (
          <div className="flex flex-col">
             <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">{row.entry_type_display}</span>
             {row.is_promissory && <span className="text-[10px] text-amber-500 font-black italic">PROMISSORY</span>}
          </div>
        )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className={parseFloat(row.amount) < 0 ? 'text-danger font-bold' : 'text-emerald-600 font-bold'}>
          ₱{Math.abs(row.amount).toLocaleString()}
        </span>
      )
    },
    {
        header: 'Remarks',
        render: (row) => <span className="text-xs text-slate-400 italic">{row.remarks || '---'}</span>
    }
  ];

  if (loading && !history.length) {
    return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="financial-summary-container p-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="text-primary" size={32} />
            Financial Summary
          </h1>
          <p className="text-slate-500 mt-1">Review your payment history and check your exam permit status.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
           <ShieldCheck size={16} className="text-emerald-500" />
           Append-Only Ledger Protected
        </div>
      </div>

      {/* Permit Cards */}
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
         <Clock size={14} /> Exam Permit Status
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         {permits && Object.entries(permits).map(([key, data]) => (
            <Card key={key} className={`overflow-hidden border-t-4 ${
                data.status === 'PAID' ? 'border-t-emerald-500' : (data.status === 'PROMISSORY' ? 'border-t-amber-500' : 'border-t-slate-200')
            }`}>
               <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-lg font-black text-slate-800 uppercase tracking-tight">{key} Permit</span>
                     {data.status === 'PAID' ? <CheckCircle2 className="text-emerald-500" /> : (data.status === 'PROMISSORY' ? <AlertCircle className="text-amber-500" /> : <Clock className="text-slate-300" />)}
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <span className="text-xs font-bold text-slate-500 uppercase">Eligibility</span>
                          <Badge variant={data.status === 'PAID' ? 'success' : (data.status === 'PROMISSORY' ? 'warning' : 'danger')}>
                             {data.status}
                          </Badge>
                      </div>
                      
                      {data.is_allowed ? (
                          <Button variant="ghost" fullWidth size="sm" className="text-primary font-bold border-primary/10 hover:bg-primary/5" icon={<Download size={14} />}>
                             Download E-Permit
                          </Button>
                      ) : (
                          <div className="text-[10px] text-center text-slate-400 font-medium px-4">
                             Settle your account balance for Month {key === 'prelim' ? '3' : (key === 'midterm' ? '4' : '6')} to unlock this permit.
                          </div>
                      )}
                  </div>
               </div>
            </Card>
         ))}
      </div>

      {/* Ledger Table */}
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
         <History size={14} /> Transaction History
      </h2>
      <Card>
          <Table 
            columns={columns}
            data={history}
            loading={loading}
            emptyMessage="No financial transactions found."
          />
      </Card>
    </div>
  );
};

export default FinancialSummary;
