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
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import CashierService from './CashierService';

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
    const [processing, setProcessing] = useState(false);
    
    // Form State
    const [paymentData, setPaymentData] = useState({
        amount: '',
        receipt: '',
        month: 1
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

    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

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
                <div className="flex gap-4">
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
                <StatBox icon={Receipt} label="Transactions Today" value={todayTransactions.length} color="green" />
                <StatBox icon={Users} label="Pending Enrollees" value={pendingMonth1.length} color="amber" />
                <StatBox icon={Wallet} label="Avg Collection" value={formatCurrency(todayTotal / (todayTransactions.length || 1))} color="blue" />
                <StatBox icon={Calendar} label="Target (Monthly)" value="92%" color="indigo" />
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
                            <div className="flex-1 relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Student Name or ID Number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-50 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-green-200 transition-all"
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
                                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest
                                                ${s.enrollment_status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {s.enrollment_status}
                                            </span>
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

                            <Button 
                                variant="primary" 
                                className="w-full py-5" 
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
                                START TRANSACTION
                            </Button>
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
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Payment Amount (PHP)</label>
                                        <input 
                                            type="number" 
                                            value={paymentData.amount}
                                            onChange={(e) => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                                            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-2xl font-black text-gray-900 focus:outline-none focus:border-green-400 transition-all shadow-sm"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Official Receipt #</label>
                                        <input 
                                            type="text" 
                                            value={paymentData.receipt}
                                            onChange={(e) => setPaymentData(d => ({ ...d, receipt: e.target.value }))}
                                            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black text-blue-600 uppercase tracking-widest focus:outline-none focus:border-green-400 transition-all shadow-sm"
                                            placeholder="OR-000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Apply to Month</label>
                                        <select 
                                            value={paymentData.month}
                                            onChange={(e) => setPaymentData(d => ({ ...d, month: e.target.value }))}
                                            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-green-400 transition-all shadow-sm appearance-none"
                                        >
                                            {selectedStudent.payment_buckets?.map(b => (
                                                <option key={b.month} value={b.month}>
                                                    Month {b.month} ({formatCurrency(b.required - b.paid)} Due)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
        </div>
    );
};

const StatBox = ({ icon: Icon, label, value, color }) => {
    const colors = {
        green: 'text-green-600 bg-green-50 border-green-100 shadow-green-500/5',
        amber: 'text-amber-600 bg-amber-50 border-amber-100 shadow-amber-500/5',
        blue: 'text-blue-600 bg-blue-50 border-blue-100 shadow-blue-500/5',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-500/5'
    };
    return (
        <div className={`p-6 bg-white border rounded-[32px] ${colors[color]} border-opacity-50 shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-5 h-5 opacity-40" />
                <ArrowRightLeft className="w-4 h-4 opacity-10" />
            </div>
            <p className="text-xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
};

const BalanceItem = ({ label, value, status = false }) => (
    <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        {status ? (
            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest
                ${value === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {value}
            </span>
        ) : (
            <span className="text-xs font-black text-gray-900">{value}</span>
        )}
    </div>
);

export default CashierDashboard;
