import React, { useState, useEffect } from 'react';
import { CreditCard, History, CheckCircle2, AlertCircle, Clock, ShieldCheck, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../api/axios';
import { financeApi } from '../../api/finance';
import { studentsApi } from '../../api/students';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import './FinancialSummary.css';

const FinancialSummary = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('permits');
  const [activeTerm, setActiveTerm] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [permits, setPermits] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        // 1. Get Active Term
        const termRes = await api.get('terms/?is_active=true');
        const term = termRes.data.results?.[0] || termRes.data?.[0];
        
        if (term) {
          setActiveTerm(term);
          
          // 2. Resolve Student ID
          let studentId = user.student_profile?.id;
          if (!studentId) {
             // Fallback lookup by user ID
             const profileRes = await studentsApi.getStudents();
             studentId = profileRes.data.results?.[0]?.id || profileRes.data?.[0]?.id;
          }

          if (studentId) {
            // 3. Fetch Data for Active Term and Student
            const [historyRes, permitRes, studentRes] = await Promise.all([
                financeApi.getPayments({ student: studentId, term: term.id }),
                financeApi.getMyPermits(term.id),
                studentsApi.getStudent(studentId)
            ]);
            setHistory(historyRes.data.results || historyRes.data || []);
            setPermits(permitRes.data);
            setStudentProfile(studentRes.data);
          }
        }
      } catch (error) {
        console.error('Failed to load financial data:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const handleDownload = (permit) => {
    addToast('success', `Preparing ${permit.label} for download...`);
    
    // Simulation: Create a dummy blob to trigger a real file download
    const element = document.createElement("a");
    const totalPaid = history.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const idn = studentProfile?.idn || user.student_profile?.idn || user.idn || '27XXXX';
    const timestamp = new Date().toLocaleString();
    const verificationRef = history[0]?.reference_number || `REF-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const fileContent = `
=========================================
      RICHWELL COLLEGES PORTAL
      OFFICIAL EXAMINATION PERMIT
=========================================

STUDENT INFORMATION:
-------------------
STUDENT ID : ${idn}
NAME       : ${user.first_name} ${user.last_name}
PROGRAM    : ${studentProfile?.program_name || 'BS Information Technology'}

PERMIT DETAILS:
--------------
PERMIT TYPE: ${permit.label.toUpperCase()}
ACAD. TERM : ${activeTerm?.name || 'FIRST SEMESTER 2024-2025'}
MONTH      : ${permit.month}

FINANCIAL STANDING:
------------------
STATUS     : ${permit.status}
CUMULATIVE PAID: PH ₱${totalPaid.toLocaleString()}
THRESHOLD  : ₱${(activeTerm?.monthly_commitment || 6000 * permit.month).toLocaleString()}

This document serves as an official electronic examination permit. 
Forging this document is punishable under the Student Code of Conduct.

VERIFICATION REF: ${verificationRef}
DATE GENERATED  : ${timestamp}
BY: SYSTEM AUTOMATED SERVICE (PORTAL)
=========================================
    `;
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `PERMIT_${permit.label.replace(/\s+/g, '_')}_${idn}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    setTimeout(() => {
        addToast('success', `${permit.label} downloaded successfully.`);
    }, 1000);
  };

  const permitColumns = [
    {
        header: 'Permit Type',
        render: (row) => (
            <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                {row.label}
            </span>
        )
    },
    {
        header: 'Target Balance',
        render: (row) => (
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-600">₱{(activeTerm?.monthly_commitment || 6000 * row.month).toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Month {row.month}</span>
            </div>
        )
    },
    {
        header: 'Status',
        render: (row) => (
            <Badge variant={row.status === 'PAID' ? 'success' : (row.status === 'PROMISSORY' ? 'warning' : 'danger')}>
                {row.status}
            </Badge>
        )
    },
    {
        header: 'Action',
        render: (row) => (
            row.is_allowed ? (
                <Button 
                    variant="primary" 
                    size="sm" 
                    className="rounded-full shadow-sm hover:shadow-md transition-all px-4" 
                    icon={<Download size={14} />}
                    onClick={() => handleDownload(row)}
                >
                    Download
                </Button>
            ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase italic">
                    <AlertCircle size={12} />
                    Settle Account
                </div>
            )
        )
    }
  ];

  const paymentColumns = [
    {
      header: 'Date & Time',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-700">{new Date(row.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-slate-400 font-mono italic">{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
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
        <div className="flex flex-col">
          <span className={parseFloat(row.amount) < 0 ? 'text-danger font-bold' : 'text-emerald-600 font-bold'}>
            ₱{Math.abs(row.amount).toLocaleString()}
          </span>
          {row.reference_number && <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.reference_number}</span>}
        </div>
      )
    },
    {
        header: 'Notes',
        render: (row) => <span className="text-xs text-slate-500 italic max-w-xs">{row.notes || 'No notes'}</span>
    }
  ];

  const permitData = permits ? Object.entries(permits).map(([key, data]) => {
      const labels = { enrollment: 'Subject Enrollment', chapter_test: 'Chapter Test', prelim: 'Prelims', midterm: 'Midterms', pre_final: 'Pre-Finals', final: 'Finals' };
      const months = { enrollment: 1, chapter_test: 2, prelim: 3, midterm: 4, pre_final: 5, final: 6 };
      return { id: key, label: labels[key], month: months[key], ...data };
  }) : [];

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
          <p className="text-slate-500 mt-1">Manage your payments and track exam permit eligibility.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
           <ShieldCheck size={16} className="text-emerald-500" />
           Append-Only Ledger Protected
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit mb-8 border border-slate-200/50 shadow-sm backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('permits')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === 'permits' ? 'bg-white text-primary shadow-md shadow-primary/5 translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}
          >
            <Clock size={16} className={activeTab === 'permits' ? 'text-primary' : 'text-slate-400'} />
            Permit Status
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === 'payments' ? 'bg-white text-primary shadow-md shadow-primary/5 translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}
          >
            <History size={16} className={activeTab === 'payments' ? 'text-primary' : 'text-slate-400'} />
            Transaction History
          </button>
      </div>

      {activeTab === 'permits' ? (
          <Card className="shadow-sm border-slate-200">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Academic Term Permits</span>
             </div>
             <Table 
                columns={permitColumns}
                data={permitData}
                loading={loading}
                emptyMessage="No permit data available for the current term."
             />
          </Card>
      ) : (
          <Card className="shadow-sm border-slate-200">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <History size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Transaction History</span>
             </div>
             <Table 
                columns={paymentColumns}
                data={history}
                loading={loading}
                emptyMessage="No financial transactions found."
             />
          </Card>
      )}
    </div>
  );
};

export default FinancialSummary;
