import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, CheckCircle2, DollarSign, ArrowLeft, MoreHorizontal, User } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
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
        // We assume term is the active term, for now fetching all
        const historyRes = await financeApi.getPayments({ student: studentId });
        setHistory(historyRes.data.results || historyRes.data);
        
        // Fetch permit status (using a dummy term ID for now, should be dynamic)
        const permitRes = await financeApi.getPermitStatus(studentId, 1);
        setPermitStatus(permitRes.data);
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
        term: 1, // Placeholder
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
      <div className="mb-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} icon={<ArrowLeft size={20} />} />
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payment Processing</h1>
               <p className="text-slate-500">Search student to view ledger and record transactions.</p>
            </div>
         </div>
      </div>

      <div className="max-w-2xl mx-auto mb-10">
          <Card className="p-4 flex gap-3 shadow-xl border-slate-200">
             <div className="flex-1">
                <Input 
                  placeholder="Enter Student IDN or Name..." 
                  icon={<User size={18} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
             </div>
             <Button variant="primary" onClick={handleSearch} loading={loading}>Search Ledger</Button>
          </Card>
      </div>

      {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-5">
              <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 text-center overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                         <User size={80} />
                      </div>
                      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
                         <span className="text-3xl font-black text-primary uppercase">{selectedStudent.idn?.substring(0, 2)}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</h3>
                      <p className="text-sm font-mono text-slate-400 mt-1 uppercase tracking-widest">{selectedStudent.idn}</p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                         <Button variant="primary" fullWidth icon={<Plus size={18} />} onClick={() => setIsPaymentModalOpen(true)}>Record Payment</Button>
                         <Button variant="ghost" fullWidth className="text-danger hover:bg-danger/10" onClick={() => setIsAdjustmentModalOpen(true)}>Correction / Adj</Button>
                      </div>
                  </Card>

                  <Card className="overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                         <CreditCard size={14} /> Permit Readiness
                      </div>
                      <div className="p-4 space-y-4">
                         {permitStatus && Object.entries(permitStatus).map(([key, data]) => (
                            <div key={key} className="flex items-center justify-between">
                               <span className="text-sm font-bold text-slate-600 uppercase">{key}</span>
                               <Badge variant={data.status === 'PAID' ? 'success' : (data.status === 'PROMISSORY' ? 'warning' : 'danger')}>
                                  {data.status}
                               </Badge>
                            </div>
                         ))}
                         {!permitStatus && <div className="text-center text-xs text-slate-400 py-4 italic">No status data available</div>}
                      </div>
                  </Card>
              </div>

              <div className="lg:col-span-3">
                  <Card>
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Transaction Ledger</span>
                          <span className="text-xs text-slate-400 font-bold italic">Append-Only System (No Edits)</span>
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
      {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6">
                   <h3 className="text-xl font-black text-slate-900 border-b pb-4 mb-4 flex items-center gap-2">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                      Record New Payment
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Month (1-6)</label>
                            <select 
                               className="w-full rounded-xl border-slate-200 p-3 text-sm focus:ring-primary focus:border-primary shadow-sm"
                               value={formData.month}
                               onChange={(e) => setFormData({...formData, month: e.target.value})}
                            >
                               {[1,2,3,4,5,6].map(m => <option key={m} value={m}>Month {m}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₱)</label>
                            <Input 
                               type="number" 
                               placeholder="0.00"
                               value={formData.amount}
                               onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            />
                         </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                         <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                               type="checkbox" 
                               className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                               checked={formData.is_promissory}
                               onChange={(e) => setFormData({...formData, is_promissory: e.target.checked})}
                            />
                            <div>
                               <div className="font-bold text-slate-700 text-sm">Convert to Promissory Note</div>
                               <div className="text-[10px] text-slate-400 uppercase leading-tight font-bold">Allowed only for Month 1 or if previous month is paid</div>
                            </div>
                         </label>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Remarks / Notes</label>
                          <textarea 
                             className="w-full rounded-xl border-slate-200 h-20 p-3 text-sm focus:ring-primary focus:border-primary shadow-sm"
                             placeholder="Ex: OR#12345, Cash payment..."
                             value={formData.remarks}
                             onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                          />
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                      <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                      <Button variant="primary" onClick={submitPayment} loading={loading}>Save Payment</Button>
                   </div>
                </div>
             </Card>
          </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-danger/20 border-t-4 border-t-danger">
                <div className="p-6">
                   <h3 className="text-xl font-black text-slate-900 border-b pb-4 mb-4 flex items-center gap-2">
                       <AlertCircle size={24} className="text-danger" />
                       Record Correction Entry
                   </h3>
                   <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed bg-danger/5 p-3 rounded-lg border border-danger/10">
                      <strong>Note:</strong> Original records cannot be edited. This adjustment will add a negative entry to the student ledger to correct an error.
                   </p>
                   
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Month Affected</label>
                            <select 
                               className="w-full rounded-xl border-slate-200 p-3 text-sm focus:ring-danger focus:border-danger shadow-sm"
                               value={formData.month}
                               onChange={(e) => setFormData({...formData, month: e.target.value})}
                            >
                               {[1,2,3,4,5,6].map(m => <option key={m} value={m}>Month {m}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₱)</label>
                            <Input 
                               type="number" 
                               placeholder="-500.00"
                               className="border-danger/30 text-danger font-bold"
                               value={formData.amount}
                               onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            />
                         </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Reason for Adjustment</label>
                          <textarea 
                             className="w-full rounded-xl border-slate-200 h-24 p-3 text-sm focus:ring-danger focus:border-danger shadow-sm bg-slate-50"
                             placeholder="Ex: Correction for data entry error on 2024-03-10..."
                             value={formData.remarks}
                             onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                          />
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                      <Button variant="ghost" onClick={() => setIsAdjustmentModalOpen(false)}>Cancel</Button>
                      <Button variant="danger" onClick={submitAdjustment} loading={loading}>Save Adjustment</Button>
                   </div>
                </div>
             </Card>
          </div>
      )}
    </div>
  );
};

export default PaymentProcessing;
