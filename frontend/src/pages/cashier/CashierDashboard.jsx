import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, UserSearch, History, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/shared/StatCard';
import { financeApi } from '../../api/finance';
import '../shared/Dashboard.css';
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <DollarSign className="text-emerald-500" size={24} />
            Cashier Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Overview of collections and recent transactions.</p>
        </div>
        <Button 
          variant="primary" 
          size="md"
          icon={<UserSearch size={18} />}
          onClick={() => navigate('/cashier/processing')}
        >
          Process New Payment
        </Button>
      </div>

      <div className="stats-grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title="Daily Collection"
          value={`₱${stats.daily.toLocaleString()}`}
          icon={<TrendingUp size={24} />}
          colorTheme="emerald"
          loading={loading}
        />

        <StatCard 
          title="Monthly Total"
          value={`₱${stats.monthly.toLocaleString()}`}
          icon={<Calendar size={24} />}
          colorTheme="blue"
          loading={loading}
        />

        <StatCard 
          title="Transaction Count"
          value={stats.count || 0}
          icon={<History size={24} />}
          colorTheme="purple"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
             <div className="flex items-center gap-2">
                <History className="text-slate-400" size={16} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Collections</span>
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
