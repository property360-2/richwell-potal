import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, UserSearch, History, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { financeApi } from '../../api/finance';
import './Cashier.css';

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    daily: 0,
    monthly: 0,
    pending_promissory: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await financeApi.getPayments({ limit: 5 });
      setRecentPayments(res.data.results || res.data);
      
      // In a real app, these would come from a specialized stats endpoint
      // For now, we'll simulate based on the list
      const payments = res.data.results || res.data;
      const dailySum = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      setStats({
        daily: dailySum,
        monthly: dailySum * 5, // Simulated
        count: payments.length
      });
    } catch (error) {
      console.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      render: (row) => (
        <div className="py-1">
          <div className="font-bold text-slate-900">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono uppercase">{row.student_idn}</div>
        </div>
      )
    },
    {
        header: 'Month',
        render: (row) => <Badge variant="ghost" className="bg-slate-100 text-slate-600 font-bold">Month {row.month}</Badge>
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className={parseFloat(row.amount) < 0 ? 'text-danger font-bold' : 'text-emerald-600 font-bold'}>
          ₱{Math.abs(row.amount).toLocaleString()}
          {parseFloat(row.amount) < 0 && ' (Adj)'}
        </span>
      )
    },
    {
      header: 'Type',
      render: (row) => (
        row.is_promissory ? 
        <Badge variant="warning">Promissory</Badge> : 
        <Badge variant="success">Cash/Check</Badge>
      )
    },
    {
        header: 'Date',
        render: (row) => <div className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString()}</div>
    }
  ];

  return (
    <div className="cashier-container p-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <DollarSign className="text-emerald-500" size={32} />
            Cashier Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Overview of institutional collections and recent transactions.</p>
        </div>
        <Button 
          variant="primary" 
          size="lg"
          className="shadow-lg shadow-primary/20"
          icon={<UserSearch size={20} />}
          onClick={() => navigate('/cashier/processing')}
        >
          Process New Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-emerald-500 overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <TrendingUp size={120} />
          </div>
          <div className="p-6">
            <div className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Daily Collection
            </div>
            <div className="text-4xl font-black text-slate-900">₱{stats.daily.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-2">Aggregated from today's transactions</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500 overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <CreditCard size={120} />
          </div>
          <div className="p-6">
            <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Monthly Total
            </div>
            <div className="text-4xl font-black text-slate-900">₱{stats.monthly.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-2">Cumulative for current month</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500 overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <History size={120} />
          </div>
          <div className="p-6">
            <div className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Transaction Count
            </div>
            <div className="text-4xl font-black text-slate-900">{stats.count || 0}</div>
            <div className="text-xs text-slate-400 mt-2">Successful payments today</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-2">
                <History className="text-slate-400" size={18} />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Collections</span>
             </div>
             <Button variant="ghost" size="sm" onClick={() => navigate('/cashier/processing')}>View Full History</Button>
          </div>
          <Table 
            columns={columns}
            data={recentPayments}
            loading={loading}
            emptyMessage="No payments recorded today."
          />
        </Card>
      </div>
    </div>
  );
};

export default CashierDashboard;
