import React, { useState, useEffect } from 'react';
import { 
    Banknote, 
    Search, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Plus, 
    ArrowUpRight,
    Loader2,
    Users,
    Receipt,
    Wallet,
    Calendar,
    ChevronRight,
    Filter,
    ArrowRightLeft,
    TrendingUp
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, StatCard, Input, Select, Textarea, Card, FormField } from '../../components/ui';
import SEO from '../../components/shared/SEO';
import CashierService from './services/CashierService';
import { formatCurrency } from '../../utils/formatters';
import ExportButton from '../../components/ui/ExportButton';
import { endpoints } from '../../api';

const CashierDashboard = () => {
    const { success, error, info, warning } = useToast();
    const [loading, setLoading] = useState(true);
    const [todayTransactions, setTodayTransactions] = useState([]);
    const [pendingMonth1, setPendingMonth1] = useState([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
    // UI State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    // Form State
    const [paymentData, setPaymentData] = useState({
        amount: '',
        receipt: '',
        month: 1
    });
    const [adjustData, setAdjustData] = useState({
        amount: '',
        reason: '',
        paymentMode: 'CASH'
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [transactions, pending] = await Promise.all([
                CashierService.getTodayTransactions(),
                CashierService.getPendingPayments()
            ]);
            setTodayTransactions(transactions);
            setPendingMonth1(pending);
        } catch (err) {
            error('Financial data sync failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        try {
            setSearchLoading(true);
            const results = await CashierService.searchStudent(searchQuery);
            setSearchResults(results);
        } catch (err) {
            error('Search operation failed');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!paymentData.amount || !paymentData.receipt) return warning('Complete payment signature required');

        try {
            setProcessing(true);
            const payload = {
                enrollment_id: selectedStudent.enrollment_id || selectedStudent.enrollment?.id,
                amount: parseFloat(paymentData.amount),
                payment_mode: 'CASH',
                reference_number: paymentData.receipt,
                allocations: [{ month: parseInt(paymentData.month), amount: parseFloat(paymentData.amount) }],
                notes: `Month ${paymentData.month} automated processing`
            };

            const res = await CashierService.recordPayment(payload);
            if (res) {
                success('Transaction finalized and receipt generated');
                setIsPaymentModalOpen(false);
                setPaymentData({ amount: '', receipt: '', month: 1 });
                fetchDashboardData(); // Refresh summary
                // Refresh selection if searching
                if (searchQuery) handleSearch();
            }
        } catch (err) {
            error('Transaction rejection by ledger');
        } finally {
            setProcessing(false);
        }
    };

    const handleAdjustPayment = async () => {
        if (!adjustData.amount || !adjustData.reason) return warning('Amount and reason are required');
        if (adjustData.reason.trim().length < 5) return warning('Reason must be at least 5 characters');

        try {
            setProcessing(true);
            const payload = {
                enrollment_id: selectedStudent.enrollment_id || selectedStudent.enrollment?.id,
                amount: parseFloat(adjustData.amount),
                adjustment_reason: adjustData.reason,
                payment_mode: adjustData.paymentMode
            };

            const res = await CashierService.adjustPayment(payload);
            if (res) {
                success('Adjustment recorded successfully');
                setIsAdjustModalOpen(false);
                setAdjustData({ amount: '', reason: '', paymentMode: 'CASH' });
                fetchDashboardData();
            }
        } catch (err) {
            error('Adjustment failed — check details and try again');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        </div>
    );

    const todayTotal = todayTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Cashier Dashboard" description="Process student payments and financial recording." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Cashier Hub
                        <span className="text-green-600/20"><Wallet className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Payment Processing & Revenue Tracking
                    </p>
                </div>
                <div className="flex gap-4 items-center">
                    <ExportButton 
                        endpoint={endpoints.exportPayments} 
                        filename="payments" 
                        label="Export Payments" 
                    />
                    <div className="bg-white border border-gray-100 rounded-[28px] px-8 py-3 shadow-xl shadow-green-500/5 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Today's Collection</p>
                            <p className="text-xl font-black text-green-600 tracking-tighter">{formatCurrency(todayTotal)}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <StatCard icon={Receipt} label="Transactions Today" value={todayTransactions.length} color="green" />
                <StatCard icon={Users} label="Pending Enrollees" value={pendingMonth1.length} color="amber" />
                <StatCard icon={Wallet} label="Avg Collection" value={formatCurrency(todayTotal / (todayTransactions.length || 1))} color="blue" />
                <StatCard icon={Calendar} label="Target (Monthly)" value="92%" color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Search and Pending */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Search Section */}
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-green-500/5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Search className="w-4 h-4" /> Student Search
                        </h3>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1">
                                <Input 
                                    type="text" 
                                    placeholder="Student Name or ID Number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    icon={Search}
                                    className="uppercase tracking-widest text-[11px]"
                                />
                            </div>
                            <Button variant="primary" onClick={handleSearch} disabled={searchLoading}>
                                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEARCH'}
                            </Button>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-3">
                                {searchResults.map(s => (
                                    <div 
                                        key={s.id} 
                                        className={`p-5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all
                                            ${selectedStudent?.id === s.id ? 'bg-green-50 border-green-100 shadow-sm' : 'bg-white border-gray-100 hover:border-green-100'}`}
                                        onClick={() => setSelectedStudent(s)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 text-xs">
                                                {s.first_name[0]}{s.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 tracking-tight">{s.first_name} {s.last_name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.student_number} • {s.program_code || s.program?.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={s.enrollment_status === 'ACTIVE' ? 'success' : 'warning'}>
                                                {s.enrollment_status}
                                            </Badge>
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Month 1 */}
                    {pendingMonth1.length > 0 && (
                        <div className="bg-amber-50/50 p-8 rounded-[40px] border border-amber-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><AlertCircle className="w-24 h-24" /></div>
                            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Awaiting Enrollment (Month 1)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingMonth1.slice(0, 4).map(s => {
                                    const m1 = s.payment_buckets?.find(b => b.month === 1);
                                    const balance = (m1?.required || 0) - (m1?.paid || 0);
                                    return (
                                        <div 
                                            key={s.id} 
                                            className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                            onClick={() => {
                                                setSelectedStudent(s);
                                                setPaymentData(p => ({ ...p, month: 1, amount: balance.toString() }));
                                                setIsPaymentModalOpen(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-[11px] font-black text-gray-900 group-hover:text-amber-600 transition-colors">{s.first_name} {s.last_name}</p>
                                                <p className="text-[9px] font-black text-amber-400">{s.program?.code}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Balance Due:</span>
                                                <span className="text-sm font-black text-red-600">{formatCurrency(balance)}</span>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">RECORD COLLECTION</span>
                                                <Plus className="w-3 h-3 text-amber-600" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Detail & Today's History */}
                <div className="space-y-8">
                    {/* Selection Detail */}
                    {selectedStudent && (
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-green-500/5 animate-in slide-in-from-bottom-5">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 bg-green-600 rounded-[20px] shadow-lg shadow-green-200 flex items-center justify-center text-white text-xl font-black">
                                    {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedStudent.student_number}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <BalanceItem label="Current Enrollment" value={selectedStudent.enrollment_status} status />
                                <BalanceItem label="Program" value={selectedStudent.program?.code || selectedStudent.program_code} />
                                <div className="pt-4 mt-4 border-t border-gray-50">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Ledger Summary</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-gray-50 rounded-2xl">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Total Paid</p>
                                            <p className="text-sm font-black text-green-600 truncate">{formatCurrency(selectedStudent.payment_buckets?.reduce((a, b) => a + b.paid, 0) || 0)}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Target</p>
                                            <p className="text-sm font-black text-gray-900 truncate">{formatCurrency(selectedStudent.payment_buckets?.reduce((a, b) => a + b.required, 0) || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    variant="primary" 
                                    className="flex-1 py-5" 
                                    icon={Banknote}
                                    onClick={() => {
                                        const next = selectedStudent.payment_buckets?.find(b => b.paid < b.required);
                                        setPaymentData({ 
                                            amount: next ? (next.required - next.paid).toString() : '', 
                                            receipt: '', 
                                            month: next ? next.month : 1 
                                        });
                                        setIsPaymentModalOpen(true);
                                    }}
                                >
                                    COLLECT
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    className="py-5" 
                                    icon={ArrowRightLeft}
                                    onClick={() => setIsAdjustModalOpen(true)}
                                >
                                    ADJUST
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Today's Transactions */}
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-green-500/5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <History className="w-4 h-4" /> Today's Activity
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {todayTransactions.length === 0 ? (
                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center py-10">No collections recorded today</p>
                            ) : todayTransactions.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <div>
                                        <p className="text-[11px] font-black text-gray-900 leading-tight mb-1">{t.student_name || t.student}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-blue-600 uppercase">{t.receipt_number || t.receipt}</span>
                                            <span className="text-[8px] font-black text-gray-300 uppercase">{t.time || new Date(t.created_at || t.processed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-green-600">{formatCurrency(t.amount)}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">CREDIT</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Modal */}
            {isPaymentModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsPaymentModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[50px] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                                <Banknote className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Record Collection</h3>
                            <p className="text-gray-500 font-bold text-xs mt-1">Institutional Ledger Update</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                                <div className="space-y-5">
                                    <FormField label="Payment Amount (PHP)">
                                        <Input 
                                            type="number" 
                                            value={paymentData.amount}
                                            onChange={(e) => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                                            placeholder="0.00"
                                            className="text-2xl"
                                        />
                                    </FormField>
                                    <FormField label="Official Receipt #">
                                        <Input 
                                            type="text" 
                                            value={paymentData.receipt}
                                            onChange={(e) => setPaymentData(d => ({ ...d, receipt: e.target.value }))}
                                            placeholder="OR-000000"
                                            className="text-xs text-blue-600 uppercase tracking-widest"
                                        />
                                    </FormField>
                                    <FormField label="Apply to Month">
                                        <Select 
                                            value={paymentData.month}
                                            onChange={(e) => setPaymentData(d => ({ ...d, month: e.target.value }))}
                                            options={selectedStudent.payment_buckets?.map(b => ({
                                                value: b.month,
                                                label: `Month ${b.month} (${formatCurrency(b.required - b.paid)} Due)`
                                            })) || []}
                                            className="text-xs uppercase tracking-widest"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsPaymentModalOpen(false)}>CANCEL</Button>
                                <Button 
                                    variant="primary" 
                                    className="flex-1" 
                                    icon={CheckCircle2} 
                                    onClick={handleRecordPayment}
                                    disabled={processing}
                                >
                                    {processing ? 'POSTING...' : 'FINALIZE'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjustment Modal */}
            {isAdjustModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Payment Adjustment</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    {selectedStudent.student_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <FormField label="Adjustment Amount (₱)">
                                    <Input 
                                        type="number" 
                                        value={adjustData.amount} 
                                        onChange={(e) => setAdjustData(d => ({ ...d, amount: e.target.value }))} 
                                        placeholder="Enter amount"
                                        className="text-lg font-black"
                                    />
                                </FormField>
                                <p className="text-[9px] font-bold text-gray-400 mt-1 ml-1">Use positive value for credit, negative for debit</p>
                            </div>

                            <FormField label="Reason for Adjustment">
                                <textarea
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData(d => ({ ...d, reason: e.target.value }))}
                                    placeholder="Describe why this adjustment is being made (min 5 characters)"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all resize-none"
                                />
                            </FormField>

                            <FormField label="Payment Mode">
                                <Select 
                                    value={adjustData.paymentMode}
                                    onChange={(e) => setAdjustData(d => ({ ...d, paymentMode: e.target.value }))}
                                    options={[
                                        { value: 'CASH', label: 'Cash' },
                                        { value: 'ONLINE', label: 'Online Banking' },
                                        { value: 'GCASH', label: 'GCash' },
                                        { value: 'MAYA', label: 'Maya' },
                                        { value: 'CHECK', label: 'Check' },
                                        { value: 'OTHER', label: 'Other' }
                                    ]}
                                    className="text-xs uppercase tracking-widest"
                                />
                            </FormField>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <Button variant="secondary" className="flex-1" onClick={() => { setIsAdjustModalOpen(false); setAdjustData({ amount: '', reason: '', paymentMode: 'CASH' }); }}>CANCEL</Button>
                            <Button 
                                variant="primary" 
                                className="flex-1" 
                                icon={CheckCircle2} 
                                onClick={handleAdjustPayment}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'CONFIRM ADJUSTMENT'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const BalanceItem = ({ label, value, status = false }) => (
    <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        {status ? (
            <Badge variant={value === 'ACTIVE' ? 'success' : 'warning'}>
                {value}
            </Badge>
        ) : (
            <span className="text-xs font-black text-gray-900">{value}</span>
        )}
    </div>
);

export default CashierDashboard;
