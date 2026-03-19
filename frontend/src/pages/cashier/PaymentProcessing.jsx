import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, CheckCircle2, DollarSign, ArrowLeft, MoreHorizontal, User, CreditCard } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import PageHeader from '../../components/shared/PageHeader';
import Modal from '../../components/ui/Modal';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { financeApi } from '../../api/finance';
import { studentsApi } from '../../api/students';
import './Cashier.css';

const PaymentProcessing = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [permitStatus, setPermitStatus] = useState(null);
  const [nextPaymentInfo, setNextPaymentInfo] = useState(null);
  
  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    is_promissory: false,
    notes: ''
  });

  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('terms/?is_active=true');
        const term = res.data.results?.[0] || res.data?.[0];
        if (term) setActiveTerm(term);
      } catch (err) {
        console.error("Failed to load active term");
      }
    };
    init();
  }, []);

  const closePaymentModal = React.useCallback(() => setIsPaymentModalOpen(false), []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ search: searchTerm });
      const students = res.data.results || res.data;
      if (students.length > 0) {
        setSelectedStudent(students[0]);
        fetchStudentLedger(students[0].id);
      } else {
        addToast('warning', 'No student found with that ID or Name.');
      }
    } catch (error) {
      addToast('error', 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentLedger = async (studentId) => {
    try {
        setLoading(true);
        const historyRes = await financeApi.getPayments({ 
          student: studentId,
          term: activeTerm?.id 
        });
        setHistory(historyRes.data.results || historyRes.data || []);
        
        if (activeTerm) {
          const [permitRes, nextRes] = await Promise.all([
            financeApi.getPermitStatus(studentId, activeTerm.id),
            api.get(`finance/payments/next-payment/?student_id=${studentId}&term_id=${activeTerm.id}`)
          ]);
          setPermitStatus(permitRes.data);
          setNextPaymentInfo(nextRes.data);
        }
    } catch (error) {
        addToast('error', 'Failed to fetch ledger.');
    } finally {
        setLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!formData.amount && !formData.is_promissory) {
        addToast('warning', 'Amount is required for payments.');
        return;
    }
    try {
      setLoading(true);
      await financeApi.recordPayment({
        student: selectedStudent.id,
        term: activeTerm?.id || 1,
        month: null, // System auto-detects
        amount: formData.amount || 0,
        is_promissory: formData.is_promissory,
        notes: formData.notes
      });
      addToast('success', 'Payment recorded successfully.');
      setIsPaymentModalOpen(false);
      setFormData({ amount: '', is_promissory: false, notes: '' });
      fetchStudentLedger(selectedStudent.id);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to record payment.';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };


  const columns = [
    {
      header: 'Student',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">{row.student_name}</span>
          <span className="text-[10px] text-slate-400 font-mono italic">{row.student_idn}</span>
        </div>
      )
    },
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
      header: 'Description',
      render: (row) => (
        <div>
           <div className="font-bold text-slate-800">{row.entry_type_display}</div>
           <div className="text-xs text-slate-500 italic max-w-xs">{row.notes || 'No notes recorded'}</div>
        </div>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <div className="flex flex-col">
          <span className={parseFloat(row.amount) < 0 ? 'text-danger font-bold' : 'text-emerald-600 font-bold'}>
            ₱{Math.abs(row.amount).toLocaleString()}
            {row.is_promissory && <span className="ml-2 text-[10px] text-amber-500 uppercase tracking-tighter">(Promissory)</span>}
          </span>
          {row.reference_number && <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.reference_number}</span>}
        </div>
      )
    },
    {
        header: 'Processed By',
        render: (row) => <div className="text-xs text-slate-500 font-medium">{row.processed_by_name}</div>
    }
  ];

  return (
    <div className="cashier-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Payment Processing"
        description="Search student to view ledger and record transactions."
        backAction={() => window.history.back()}
      />

      <div className="max-w-2xl mx-auto mb-8">
          <Card className="p-4 shadow-sm border-slate-200">
             <div className="flex gap-3">
                <Input 
                  placeholder="Enter Student IDN or Name..." 
                  icon={<User size={18} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  fullWidth
                />
                <Button 
                  variant="primary" 
                  onClick={handleSearch} 
                  loading={loading}
                  icon={<Search size={18} />}
                >
                  Search
                </Button>
             </div>
          </Card>
      </div>

      {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-5">
              <div className="lg:col-span-1 space-y-4">
                  <Card className="p-6 text-center shadow-sm">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                         <span className="text-2xl font-bold text-slate-400 uppercase">{selectedStudent.idn?.substring(0, 2)}</span>
                      </div>
                       <h3 className="text-lg font-black text-slate-800 tracking-tight">{selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</h3>
                       <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full mt-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedStudent.idn}</span>
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-4">Program & Year</p>
                       <p className="text-xs font-bold text-slate-600">BS Information Technology - 3rd Year</p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                         <Button 
                           variant="primary" 
                           fullWidth 
                           icon={<Plus size={18} />} 
                           onClick={() => setIsPaymentModalOpen(true)}
                         >
                           Record Payment
                         </Button>
                      </div>
                  </Card>

                  <Card className="overflow-hidden shadow-sm">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                         <CreditCard size={14} /> 
                         <span>Permit Readiness</span>
                      </div>
                      <div className="p-4 space-y-3">
                         {permitStatus && Object.entries(permitStatus).map(([key, data]) => (
                            <div key={key} className="flex items-center justify-between">
                               <span className="text-xs font-semibold text-slate-600 uppercase">{key}</span>
                               <Badge variant={data.status === 'PAID' ? 'success' : (data.status === 'PROMISSORY' ? 'warning' : 'danger')}>
                                  {data.status}
                                </Badge>
                            </div>
                         ))}
                         {!permitStatus && <div className="text-center text-xs text-slate-400 py-4 italic">No status records</div>}
                      </div>
                  </Card>
              </div>

              <div className="lg:col-span-3">
                  <Card className="shadow-sm">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Transaction Ledger</span>
                          <span className="text-xs text-slate-400 italic">No Edits Allowed</span>
                      </div>
                      <Table 
                        columns={columns}
                        data={history}
                        loading={loading}
                        emptyMessage="No financial history found for this student."
                      />
                  </Card>
              </div>
          </div>
      )}

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={closePaymentModal}
        title="Record New Payment"
      >
        <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Transaction Details
            </h3>

            {nextPaymentInfo && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Target Permit</span>
                          <span className="text-lg font-black text-primary">Month {nextPaymentInfo.next_month}</span>
                      </div>
                      <div className="flex flex-col text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Remaining to Unlock</span>
                          <span className={`text-lg font-black ${nextPaymentInfo.amount_due_for_next > 0 ? 'text-danger' : 'text-emerald-500'}`}>
                             ₱{nextPaymentInfo.amount_due_for_next?.toLocaleString()}
                          </span>
                      </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-400 uppercase">Monthly Commitment</span>
                        <span className="font-bold text-slate-600">₱{nextPaymentInfo.monthly_commitment?.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-bold text-slate-400 uppercase">Total Paid All-Time</span>
                        <span className="font-bold text-slate-600">₱{nextPaymentInfo.total_paid_all_time?.toLocaleString()}</span>
                      </div>
                  </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4">
                <Input 
                  label="Payment Amount (₱)"
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  fullWidth
                  className="text-lg font-bold"
                />
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center h-5">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer"
                      checked={formData.is_promissory}
                      onChange={(e) => setFormData({...formData, is_promissory: e.target.checked})}
                    />
                  </div>
                  <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-sm group-hover:text-primary transition-colors">Apply as Promissory Note</span>
                      <span className="text-[10px] text-slate-400 uppercase leading-tight font-bold mt-1">
                        Allowed for Month 1 or if the previous month is settled
                      </span>
                  </div>
                </label>
            </div>

            <Input 
              label="Notes"
              multiline
              placeholder="e.g., OR#123456, Cash Payment..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              fullWidth
            />

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={submitPayment} loading={loading} icon={<CheckCircle2 size={18} />}>
                  Save Payment
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentProcessing;
