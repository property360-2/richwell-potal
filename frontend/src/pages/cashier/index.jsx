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
    ChevronRight,
    Filter,
    ArrowRightLeft,
    TrendingUp,
    Printer
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, StatCard, Input, Select, Textarea, Card, FormField } from '../../components/ui';
import SEO from '../../components/shared/SEO';
import CashierService from './services/CashierService';
import { formatCurrency } from '../../utils/formatters';
import ExportButton from '../../components/ui/ExportButton';
import { endpoints } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';

const CashierDashboard = () => {
    const { user } = useAuth();
    const { success, error, info, warning } = useToast();
    const [loading, setLoading] = useState(true);
    const [todayTransactions, setTodayTransactions] = useState([]);
    const [pendingMonth1, setPendingMonth1] = useState([]);
    const [dashboardStats, setDashboardStats] = useState({
        today_total: 0,
        today_count: 0,
        avg_collection: 0,
        pending_enrollees: 0,
        collection_target: "0%"
    });
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 500);
    
    // UI State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [successReceipt, setSuccessReceipt] = useState(null); // holds finalized txn data for the receipt modal
    const [printingTransaction, setPrintingTransaction] = useState(null);
    const [processing, setProcessing] = useState(false);
    
    const [paymentData, setPaymentData] = useState({
        amount: '',
        receipt: ''
    });
    const [adjustData, setAdjustData] = useState({
        amount: '',
        reason: '',
        paymentMode: 'CASH'
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            handleSearch();
        } else if (debouncedSearch.length === 0) {
            setSearchResults([]);
        }
    }, [debouncedSearch]);

    // Auto-generate an Official Receipt number: OR-YYYYMMDD-XXXXX
    const generateOR = () => {
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = String(Math.floor(10000 + Math.random() * 90000));
        return `OR-${date}-${rand}`;
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [transactionRes, pending] = await Promise.all([
                CashierService.getTodayTransactions(),
                CashierService.getPendingPayments()
            ]);
            setTodayTransactions(transactionRes.results || []);
            setDashboardStats(transactionRes.stats || {});
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
        if (!paymentData.amount) return warning('Please enter a payment amount');

        const orNumber = generateOR();
        try {
            setProcessing(true);
            const payload = {
                enrollment_id: selectedStudent.enrollment_id || selectedStudent.enrollment?.id,
                amount: parseFloat(paymentData.amount),
                payment_mode: 'CASH',
                reference_number: orNumber,
                notes: `Payment recorded by cashier`
            };

            const res = await CashierService.recordPayment(payload);
            if (res) {
                setIsPaymentModalOpen(false);
                setPaymentData({ amount: '', receipt: '' });
                // Show success receipt modal
                setSuccessReceipt({
                    receipt_number: orNumber,
                    student_name: selectedStudent.student_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                    student_number: selectedStudent.student_number,
                    amount: parseFloat(paymentData.amount),
                    payment_mode: 'CASH',
                    processed_at: new Date().toISOString(),
                    processed_by: user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Cashier',
                });
                fetchDashboardData();
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
        } finally {
            setProcessing(false);
        }
    };

    const handlePrintReceipt = (transaction) => {
        setPrintingTransaction(transaction);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        </div>
    );



    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Cashier Dashboard" description="Process student payments and financial recording." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Cashier Hub
                        <span className="text-green-600/20"><TrendingUp className="w-8 h-8" /></span>
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
                            <p className="text-xl font-black text-green-600 tracking-tighter">{formatCurrency(dashboardStats.today_total || 0)}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 mb-8">
                <StatCard icon={Receipt} label="Transactions Today" value={dashboardStats.today_count || 0} color="green" />
                <StatCard icon={Users} label="Students with Balance" value={pendingMonth1.length} color="amber" />
            </div>

            {/* Search Bar — always full width */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-green-500/5 mb-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Student Search
                </h3>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input 
                            type="text" 
                            placeholder="Search by Name or Student ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={Search}
                            className="uppercase tracking-widest text-[11px]"
                        />
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-2 mt-4">
                        {searchResults.map(s => (
                            <div 
                                key={s.id} 
                                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all
                                    ${selectedStudent?.id === s.id ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 hover:border-green-100 hover:bg-green-50/30'}`}
                                onClick={() => setSelectedStudent(s)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 text-xs shadow-sm">
                                        {(s.first_name?.[0] || '?')}{(s.last_name?.[0] || '')}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">{s.first_name} {s.last_name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.student_number} • {s.program_code || s.program?.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
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

            {/* Main Content: table + optional detail panel side by side */}
            <div className={`grid gap-6 ${selectedStudent ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

                {/* Unpaid Balances Table — takes full width or 2/3 when detail is open */}
                <div className={`${selectedStudent ? 'lg:col-span-2' : ''} bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-amber-500/5 overflow-hidden`}>
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Outstanding Balances
                        </h3>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                            {pendingMonth1.length} student{pendingMonth1.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {pendingMonth1.length === 0 ? (
                        <div className="py-20 text-center">
                            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-3" />
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">All students are up to date</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Student</th>
                                        <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Program</th>
                                        <th className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Status</th>
                                        <th className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Next Due</th>
                                        <th className="text-right text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Balance Due</th>
                                        <th className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pendingMonth1.map((s) => (
                                        <tr
                                            key={s.id}
                                            className={`transition-colors hover:bg-amber-50/30 cursor-pointer ${
                                                selectedStudent?.id === s.id ? 'bg-green-50/60 border-l-4 border-l-green-500' : ''
                                            }`}
                                            onClick={() => setSelectedStudent(s)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-xs font-black flex-shrink-0">
                                                        {(s.first_name?.[0] || '?')}{(s.last_name?.[0] || '')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 leading-tight">{s.student_name}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.student_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-[11px] font-black text-gray-600">{s.program_code}</p>
                                                <p className="text-[9px] font-bold text-gray-400">Yr. {s.year_level}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Badge variant={s.enrollment_status === 'ACTIVE' ? 'success' : 'warning'}>
                                                    {s.enrollment_status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                                                    Month {s.next_unpaid_month ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-red-600">{formatCurrency(s.total_balance)}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStudent(s);
                                                        setPaymentData({
                                                                amount: '',
                                                                receipt: generateOR()
                                                            });
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                >
                                                    Collect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Student Detail Panel — only shown when a student is selected */}
                {selectedStudent && (
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-green-500/5 animate-in slide-in-from-right-5 h-fit sticky top-24">
                        {/* Close button */}
                        <button
                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                            onClick={() => setSelectedStudent(null)}
                        >
                            ✕
                        </button>

                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-14 h-14 bg-green-600 rounded-[20px] shadow-lg shadow-green-200 flex items-center justify-center text-white text-xl font-black">
                                {(selectedStudent.first_name?.[0] || selectedStudent.student_name?.[0] || 'U').toUpperCase()}
                                {(selectedStudent.last_name?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                                    {selectedStudent.student_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedStudent.student_number || 'NO-ID'}</p>
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
                                        <p className="text-sm font-black text-green-600 truncate">{formatCurrency(selectedStudent.payment_buckets?.reduce((a, b) => a + parseFloat(b.paid_amount || b.paid || 0), 0) || 0)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl">
                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Balance</p>
                                        <p className="text-sm font-black text-red-500 truncate">{formatCurrency(selectedStudent.total_balance || 0)}</p>
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
                                    setPaymentData({ 
                                        amount: '', 
                                        receipt: generateOR()
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
            </div>

            {/* Transaction Modal */}
            {isPaymentModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsPaymentModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[50px] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                                <Banknote className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Record Collection</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                {selectedStudent.student_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                                <FormField label="Payment Amount (PHP)">
                                    <Input 
                                        type="number" 
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                                        placeholder="Enter any amount..."
                                        className="text-2xl"
                                        autoFocus
                                    />
                                </FormField>
                                <p className="text-[9px] font-bold text-gray-400 mt-3 text-center">
                                    Official Receipt # will be auto-generated upon finalization
                                </p>
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

            {/* ===== SUCCESS RECEIPT MODAL ===== */}
            {successReceipt && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-md" />
                    <div className="relative w-full max-w-sm bg-white rounded-[48px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">

                        {/* Success badge */}
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg shadow-green-100">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Payment Received!</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Transaction Finalized</p>
                        </div>

                        {/* Receipt body */}
                        <div id="cashier-receipt-print" className="bg-gray-50 rounded-[28px] p-6 space-y-3 border border-gray-100">
                            <div className="text-center mb-2">
                                <p className="text-3xl font-black text-green-600 tracking-tighter">{formatCurrency(successReceipt.amount)}</p>
                            </div>
                            <hr className="border-dashed border-gray-200" />
                            {[
                                ['OR #', successReceipt.receipt_number],
                                ['Student', successReceipt.student_name],
                                ['Student ID', successReceipt.student_number],
                                ['Mode', successReceipt.payment_mode],
                                ['Cashier', successReceipt.processed_by],
                                ['Date', new Date(successReceipt.processed_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                                    <span className="text-[11px] font-black text-gray-800 text-right max-w-[60%] break-all">{value}</span>
                                </div>
                            ))}
                            <hr className="border-dashed border-gray-200" />
                            <p className="text-center text-[8px] font-bold text-gray-300 uppercase tracking-widest">Thank you • Richwell College</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    const content = document.getElementById('cashier-receipt-print').innerHTML;
                                    const w = window.open('', '_blank');
                                    w.document.write(`<html><head><title>${successReceipt.receipt_number}</title>
                                    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:380px;margin:auto}
                                    .flex{display:flex;justify-content:space-between;margin:6px 0;font-size:12px}
                                    hr{border:none;border-top:1px dashed #ddd;margin:12px 0}
                                    p{text-align:center;font-size:12px}</style></head>
                                    <body>${content}</body></html>`);
                                    w.document.close();
                                    setTimeout(() => { w.print(); w.close(); }, 300);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button
                                onClick={() => setSuccessReceipt(null)}
                                className="flex-1 px-4 py-3 border border-gray-200 hover:bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjustment Modal */}
            {isAdjustModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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

            {/* Printable Receipt (Hidden) */}
            {printingTransaction && (
                <div id="printable-receipt" className="hidden print:block">
                    <div className="text-center mb-10 border-b-2 border-gray-900 pb-8">
                        <h1 className="text-3xl font-black tracking-tighter uppercase">Richwell Colleges, Inc.</h1>
                        <p className="text-xs font-bold uppercase tracking-widest mt-1">Institutional Accounting Office</p>
                        <p className="text-[10px] text-gray-500 mt-2">Plaridel, Bulacan, Philippines</p>
                    </div>

                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Official Receipt</h2>
                            <p className="text-xs font-bold text-blue-600 tracking-widest uppercase">#{printingTransaction.receipt_number || printingTransaction.receipt}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-gray-400 underline" style={{ textDecoration: 'underline' }}>Date of Issuance</p>
                            <p className="text-sm font-black">{new Date(printingTransaction.created_at || printingTransaction.processed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="space-y-6 mb-12">
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase">Received From</span>
                            <span className="text-sm font-black uppercase">{printingTransaction.student_name || printingTransaction.student}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase">Amount (In Words)</span>
                            <span className="text-sm font-black uppercase italic">*** {printingTransaction.amount} Pesos Only ***</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase">Payment Mode</span>
                            <span className="text-sm font-black uppercase">{printingTransaction.payment_mode || 'CASH'}</span>
                        </div>
                    </div>

                    <div className="bg-gray-900 text-white p-8 rounded-3xl flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest">Total Collection Amount</span>
                        <span className="text-3xl font-black tracking-tighter">₱{parseFloat(printingTransaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="mt-20 flex justify-between gap-20">
                        <div className="flex-1 text-center border-t-2 border-gray-900 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Student Signature</p>
                            <p className="text-[8px] text-gray-400 uppercase">(Valid only with ID verification)</p>
                        </div>
                        <div className="flex-1 text-center border-t-2 border-gray-900 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Authorized Cashier</p>
                            <p className="text-sm font-black uppercase">OFFICIAL CASHIER</p>
                        </div>
                    </div>

                    <div className="mt-24 text-center border-t border-gray-100 pt-8 opacity-50">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em]">This is a system-generated document. No dry seal required.</p>
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
