import React, { useState, useEffect, useRef } from 'react';
import {
    Receipt, Search, Loader2, Printer, Download,
    ChevronLeft, ChevronRight, Eye, Calendar, Filter,
    CheckCircle2, ArrowRightLeft, X
} from 'lucide-react';
import { api, endpoints } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import SEO from '../../components/shared/SEO';
import { Button, Input, Badge } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';

/* ── helpers ────────────────────────────────────────────────── */
const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

/* ── Receipt Modal ───────────────────────────────────────────── */
const ReceiptModal = ({ txn, onClose }) => {
    const receiptRef = useRef();

    const handlePrint = () => {
        const content = receiptRef.current.innerHTML;
        const w = window.open('', '_blank');
        w.document.write(`
            <html><head><title>OR-${txn.receipt_number}</title>
            <style>
                body{font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;max-width:400px;margin:0 auto}
                .logo{text-align:center;margin-bottom:24px}
                .logo h1{font-size:20px;font-weight:900;letter-spacing:-1px;margin:0}
                .logo p{font-size:11px;color:#6b7280;margin:4px 0 0}
                .divider{border:none;border-top:1px dashed #d1d5db;margin:16px 0}
                .row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px}
                .label{color:#6b7280;font-weight:600}
                .value{font-weight:800;text-align:right}
                .amount{font-size:28px;font-weight:900;color:#16a34a;text-align:center;margin:16px 0}
                .footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:24px}
                .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase}
                .badge-adj{background:#fef3c7;color:#d97706}
                .badge-ok{background:#dcfce7;color:#16a34a}
                @media print{body{padding:0}}
            </style></head>
            <body>${content}</body></html>
        `);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 300);
    };

    if (!txn) return null;
    const isAdj = txn.is_adjustment;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
                    <X className="w-4 h-4" />
                </button>

                {/* Printable content */}
                <div ref={receiptRef}>
                    <div className="logo text-center mb-6">
                        <h1 className="text-xl font-black text-gray-900 tracking-tighter">Richwell College</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Receipt</p>
                    </div>


                    <div className="text-center my-4">
                        <p className="text-4xl font-black text-green-600 tracking-tighter">{formatCurrency(txn.amount)}</p>
                    </div>

                    <hr className="border-dashed border-gray-200 my-4" />

                    <div className="space-y-2 text-sm">
                        {[
                            ['OR #', txn.receipt_number],
                            ['Student', txn.student_name],
                            ['Student ID', txn.student_number],
                            ['Processed By', txn.processed_by],
                            ['Date', fmt(txn.processed_at)],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                                <span className="text-[11px] font-black text-gray-900 text-right max-w-[60%]">{value}</span>
                            </div>
                        ))}
                        {txn.notes && (
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Notes</p>
                                <p className="text-[11px] font-black text-gray-600">{txn.notes}</p>
                            </div>
                        )}
                    </div>

                    <hr className="border-dashed border-gray-200 my-4" />
                    <p className="footer text-center text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                        Thank you for your payment • Richwell College
                    </p>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main Page ───────────────────────────────────────────────── */
const PaymentHistory = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const debouncedSearch = useDebounce(search, 500);

    const fetchTransactions = async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p };
            if (debouncedSearch) params.search = debouncedSearch;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            const data = await api.get(`${endpoints.paymentTransactions}`, { params });
            setTransactions(data.results || []);
            setTotal(data.count || 0);
            setHasNext(!!data.next);
            setHasPrev(!!data.previous);
        } catch {
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        setPage(1); 
        fetchTransactions(1); 
    }, [debouncedSearch, dateFrom, dateTo]);

    useEffect(() => { 
        fetchTransactions(page); 
    }, [page]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Payment History" description="View all payment transactions." />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Payment History
                        <span className="text-green-600/20"><Receipt className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        All recorded transactions
                    </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[28px] px-6 py-3 shadow-lg flex items-center gap-3">
                    <Receipt className="w-4 h-4 text-green-600" />
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Records</p>
                        <p className="text-lg font-black text-gray-900">{total}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Name, student ID, or OR#..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-green-400 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none focus:border-green-400 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none focus:border-green-400 transition-all"
                        />
                    </div>
                    {(search || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); fetchTransactions(1); }}
                            className="px-4 py-3 text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="py-20 text-center">
                        <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No transactions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Date</th>
                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">OR #</th>
                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Student</th>
                                    <th className="text-right text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Amount</th>
                                    <th className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] font-black text-gray-700">{fmt(t.processed_at)}</p>
                                            <p className="text-[9px] font-bold text-gray-400">{t.processed_by}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-[10px] font-black text-blue-600 font-mono">{t.receipt_number}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm font-black text-gray-900 leading-tight">{t.student_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">{t.student_number}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black ${t.is_adjustment && parseFloat(t.amount) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                {formatCurrency(Math.abs(parseFloat(t.amount)))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedTxn(t)}
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                                title="View Receipt"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {(hasNext || hasPrev) && (
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Page {page}</p>
                        <div className="flex gap-2">
                            <button
                                disabled={!hasPrev}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={!hasNext}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Receipt Detail Modal */}
            {selectedTxn && <ReceiptModal txn={selectedTxn} onClose={() => setSelectedTxn(null)} />}
        </div>
    );
};

export default PaymentHistory;
