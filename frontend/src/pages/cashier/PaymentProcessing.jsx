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
  
  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    month: 1,
    amount: '',
    is_promissory: false,
    remarks: ''
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
  const closeAdjustmentModal = React.useCallback(() => setIsAdjustmentModalOpen(false), []);

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
          const permitRes = await financeApi.getPermitStatus(studentId, activeTerm.id);
          setPermitStatus(permitRes.data);
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
        term: activeTerm?.id || 1, // Fallback purely for safety
        month: parseInt(formData.month),
        amount: formData.amount || 0,
        is_promissory: formData.is_promissory,
        remarks: formData.remarks
      });
      addToast('success', 'Payment recorded successfully.');
      setIsPaymentModalOpen(false);
      fetchStudentLedger(selectedStudent.id);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to record payment.';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const submitAdjustment = async () => {
    if (!formData.amount || parseFloat(formData.amount) >= 0) {
        addToast('warning', 'Adjustment must be a negative amount.');
        return;
    }
    try {
      setLoading(true);
      await financeApi.recordAdjustment({
        student: selectedStudent.id,
        term: 1, // Placeholder
        month: parseInt(formData.month),
        amount: formData.amount,
        remarks: formData.remarks
      });
      addToast('info', 'Adjustment recorded (Append-only correction).');
      setIsAdjustmentModalOpen(false);
      fetchStudentLedger(selectedStudent.id);
    } catch (error) {
      addToast('error', 'Adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Date',
      render: (row) => <div className="text-sm text-slate-600">{new Date(row.created_at).toLocaleDateString()}</div>
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
           <div className="text-xs text-slate-400 max-w-xs truncate">{row.remarks || '---'}</div>
        </div>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className={parseFloat(row.amount) < 0 ? 'text-danger font-bold' : 'text-emerald-600 font-bold'}>
          ₱{Math.abs(row.amount).toLocaleString()}
          {row.is_promissory && <span className="ml-2 text-[10px] text-amber-500 uppercase tracking-tighter">(Promissory)</span>}
        </span>
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
                      <h3 className="text-lg font-bold text-slate-800">{selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</h3>
                      <p className="text-sm font-mono text-slate-500 mt-1">{selectedStudent.idn}</p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                         <Button 
                           variant="primary" 
                           fullWidth 
                           icon={<Plus size={18} />} 
                           onClick={() => setIsPaymentModalOpen(true)}
                         >
                           Record Payment
                         </Button>
                         <Button 
                           variant="ghost" 
                           fullWidth 
                           className="text-danger" 
                           onClick={() => setIsAdjustmentModalOpen(true)}
                         >
                           Correction / Adj
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
            
            <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Month Selection"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  options={[...Array(6).keys()].map(i => ({ value: i+1, label: `Month ${i+1}` }))}
                  fullWidth
                />
                <Input 
                  label="Payment Amount (₱)"
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  fullWidth
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
              label="Remarks / Reference Number"
              multiline
              placeholder="e.g., OR#123456, Cash Payment..."
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
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

      {/* Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={closeAdjustmentModal}
        title="Record Correction Entry"
      >
        <div className="space-y-6">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100/50 flex gap-4 items-start mb-6">
                <AlertCircle size={24} className="text-rose-500 shrink-0" />
                <div className="text-sm">
                   <p className="font-bold text-rose-800 mb-1">Administrative Override</p>
                   <p className="text-rose-600/80 leading-relaxed text-xs">
                      Adjustments create a negative ledger entry to correct erroneous records. 
                      Original transactions remain in the history for audit purposes.
                   </p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Target Month"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  options={[...Array(6).keys()].map(i => ({ value: i+1, label: `Month ${i+1}` }))}
                  fullWidth
                />
                <Input 
                  label="Adjustment Amount (₱)"
                  type="number" 
                  step="any"
                  placeholder="-500.00"
                  className="text-danger font-bold"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  fullWidth
                />
            </div>

            <Input 
              label="Reason for Correction"
              multiline
              placeholder="State the reason for this adjustment..."
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              fullWidth
            />

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="ghost" onClick={() => setIsAdjustmentModalOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={submitAdjustment} loading={loading} icon={<AlertCircle size={18} />}>
                  Post Adjustment
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentProcessing;
