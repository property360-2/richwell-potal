import React, { useState, useEffect } from 'react';
import { 
    Receipt, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Info, 
    Clock, 
    Banknote,
    ArrowRightLeft,
    Filter,
    Calendar
} from 'lucide-react';
import { AdminService } from './services/AdminService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SEO from '../../components/shared/SEO';

const PAYMENT_MODES = [
    { value: '', label: 'All Modes' },
    { value: 'CASH', label: 'Cash' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'GCASH', label: 'GCash' },
    { value: 'MAYA', label: 'Maya' },
    { value: 'CHECK', label: 'Check' },
    { value: 'OTHER', label: 'Other' }
];

const TXN_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'regular', label: 'Regular' },
    { value: 'adjustment', label: 'Adjustment' }
];

const formatCurrency = (val) => {
    const n = parseFloat(val) || 0;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AdminTransactionLog = () => {
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        payment_mode: '',
        type: '',
        date_from: '',
        date_to: ''
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        count: 0,
        next: false,
        previous: false
    });
    const [selectedTxn, setSelectedTxn] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async (page = 1) => {
        try {
            setLoading(true);
            const data = await AdminService.getTransactions(filters, page);
            setTransactions(data.results || []);
            setPagination({
                currentPage: page,
                count: data.count || 0,
                next: !!data.next,
                previous: !!data.previous
            });
        } catch (err) {
            error('Failed to load transaction stream');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => fetchTransactions(1);

    const clearFilters = () => {
        const reset = { search: '', payment_mode: '', type: '', date_from: '', date_to: '' };
        setFilters(reset);
        fetchTransactions(1);
    };

    const getModeColor = (mode) => {
        const map = {
            CASH: 'bg-green-100 text-green-700',
            ONLINE: 'bg-blue-100 text-blue-700',
            GCASH: 'bg-cyan-100 text-cyan-700',
            MAYA: 'bg-purple-100 text-purple-700',
            CHECK: 'bg-amber-100 text-amber-700',
            OTHER: 'bg-gray-100 text-gray-700'
        };
        return map[mode] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Transaction Ledger" description="Payment transaction oversight and financial audit trail." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Transaction Ledger</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Financial Oversight • Audit Trail</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-gray-100 rounded-[28px] px-6 py-3 shadow-xl shadow-blue-500/5 flex items-center gap-3">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total:</span>
                        <span className="text-sm font-black text-gray-900">{pagination.count.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Receipt, Name, or ID..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Payment Mode</label>
                        <select 
                            value={filters.payment_mode}
                            onChange={(e) => handleFilterChange('payment_mode', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none appearance-none font-bold text-xs cursor-pointer"
                        >
                            {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Transaction Type</label>
                        <select 
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none appearance-none font-bold text-xs cursor-pointer"
                        >
                            {TXN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Date From</label>
                        <input 
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Date To</label>
                        <input 
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-xs"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 border-t border-gray-50 pt-8">
                    <Button variant="secondary" className="px-8 text-[10px]" onClick={clearFilters}>
                        RESET
                    </Button>
                    <Button variant="primary" className="px-8 text-[10px] shadow-lg shadow-blue-500/10" onClick={applyFilters}>
                        APPLY FILTERS
                    </Button>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Loading Transactions...</p>
                                    </td>
                                </tr>
                            ) : transactions.map((txn) => (
                                <tr key={txn.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900">{txn.processed_at ? new Date(txn.processed_at).toLocaleDateString() : '—'}</span>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {txn.processed_at ? new Date(txn.processed_at).toLocaleTimeString() : '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {txn.is_adjustment && (
                                                <ArrowRightLeft className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900 tracking-tight">{txn.receipt_number}</span>
                                                {txn.is_adjustment && (
                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Adjustment</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-800 tracking-tight">{txn.student_name}</span>
                                            <span className="text-[10px] font-bold text-gray-400">{txn.student_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getModeColor(txn.payment_mode)}`}>
                                            {txn.payment_mode}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`text-lg font-black tracking-tighter ${txn.is_adjustment ? 'text-amber-600' : 'text-green-600'}`}>
                                            {formatCurrency(txn.amount)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => setSelectedTxn(txn)}
                                            className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg transition-all"
                                        >
                                            <Info className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && transactions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <Receipt className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">No Transactions Found</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Adjust your filters to find results</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Showing: <span className="text-gray-900">{transactions.length}</span> of <span className="text-gray-900">{pagination.count.toLocaleString()}</span>
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={!pagination.previous}
                            onClick={() => fetchTransactions(pagination.currentPage - 1)}
                            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-6 flex items-center bg-blue-600 rounded-xl text-white font-black text-xs shadow-lg shadow-blue-500/20">
                            {pagination.currentPage}
                        </div>
                        <button 
                            disabled={!pagination.next}
                            onClick={() => fetchTransactions(pagination.currentPage + 1)}
                            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedTxn}
                onClose={() => setSelectedTxn(null)}
                title="Transaction Details"
                maxWidth="max-w-2xl"
            >
                {selectedTxn && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Receipt Number</p>
                                <p className="text-sm font-black text-gray-900">{selectedTxn.receipt_number}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date & Time</p>
                                <p className="text-sm font-black text-gray-900">
                                    {selectedTxn.processed_at ? new Date(selectedTxn.processed_at).toLocaleString() : '—'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Student</p>
                                <p className="text-sm font-black text-gray-900">{selectedTxn.student_name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{selectedTxn.student_number}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</p>
                                <p className={`text-xl font-black ${selectedTxn.is_adjustment ? 'text-amber-600' : 'text-green-600'}`}>
                                    {formatCurrency(selectedTxn.amount)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block mt-1 ${getModeColor(selectedTxn.payment_mode)}`}>
                                    {selectedTxn.payment_mode}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Processed By</p>
                                <p className="text-sm font-black text-gray-900">{selectedTxn.processed_by}</p>
                            </div>
                        </div>

                        {selectedTxn.is_adjustment && (
                            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Adjustment Details</p>
                                </div>
                                <p className="text-sm font-bold text-gray-800">{selectedTxn.adjustment_reason || 'No reason provided'}</p>
                                {selectedTxn.original_receipt && (
                                    <p className="text-[10px] font-bold text-amber-600 mt-2">
                                        Original: {selectedTxn.original_receipt}
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedTxn.notes && !selectedTxn.is_adjustment && (
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                                <p className="text-sm font-bold text-gray-700">{selectedTxn.notes}</p>
                            </div>
                        )}

                        <div className="pt-4">
                            <Button variant="secondary" className="w-full py-4 rounded-2xl" onClick={() => setSelectedTxn(null)}>
                                CLOSE
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminTransactionLog;
