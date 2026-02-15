import React, { useState, useEffect } from 'react';
import { 
    CreditCard, 
    Printer, 
    Download, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    History,
    TrendingUp,
    ShieldCheck,
    Loader2,
    Lock,
    Unlock,
    Info,
    ArrowUpRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import CashierService from '../cashier/CashierService';

const StudentSOA = () => {
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchSOA();
    }, []);

    const fetchSOA = async () => {
        try {
            setLoading(true);
            const res = await CashierService.getMyPayments();
            setData(res);
        } catch (err) {
            error('Failed to load your financial statement');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    if (!data) return (
        <div className="h-screen flex flex-col items-center justify-center text-gray-400">
            <Info className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">No financial records found</p>
        </div>
    );

    const { buckets = [], recent_transactions = [], semester = 'Current Semester' } = data;
    const totalPaid = buckets.reduce((acc, b) => acc + b.paid, 0);
    const totalRequired = buckets.reduce((acc, b) => acc + b.required, 0);
    const overallBalance = totalRequired - totalPaid;
    const progress = (totalPaid / totalRequired) * 100;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Statement of Account" description="View your tuition payment schedule and history." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Statement Hub
                        <span className="text-blue-600/20"><CreditCard className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Tuition Breakdown • {semester}
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" icon={Printer} onClick={() => window.print()} className="print:hidden">
                        PRINT SOA
                    </Button>
                </div>
            </div>

            {/* Main Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <SummaryCard label="Assessment" value={formatCurrency(totalRequired)} color="blue" />
                <SummaryCard label="Total Paid" value={formatCurrency(totalPaid)} color="green" />
                <SummaryCard label="Remaining" value={formatCurrency(overallBalance)} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left: Payment Schedule */}
                <div className="lg:col-span-2 space-y-10">
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                Payment Schedule
                                <span className="text-[10px] bg-gray-100 px-3 py-1 rounded-full text-gray-400 uppercase tracking-widest">6-Month Plan</span>
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {buckets.map((b, idx) => (
                                <BucketItem key={idx} bucket={b} formatCurrency={formatCurrency} />
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Transaction Log</h2>
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Receipt #</th>
                                        <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recent_transactions.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-10 opacity-20 text-[10px] font-black uppercase">No payments recorded</td></tr>
                                    ) : recent_transactions.map((t, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase">{new Date(t.processed_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.receipt_number}</td>
                                            <td className="px-8 py-5 text-right text-xs font-black text-green-600">{formatCurrency(t.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right: progress and permits */}
                <div className="space-y-10">
                    {/* Visual Progress */}
                    <div className="bg-white p-10 rounded-[50px] border border-gray-100 shadow-2xl shadow-blue-500/5 text-center">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Settlement Progress</h3>
                        <div className="relative inline-flex items-center justify-center mb-6">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="72" stroke="currentColor" stroke-width="12" fill="none" className="text-gray-100"></circle>
                                <circle cx="80" cy="80" r="72" stroke="currentColor" stroke-width="12" fill="none" className="text-blue-600" 
                                        stroke-dasharray={452.39} 
                                        stroke-dashoffset={452.39 * (1 - progress / 100)}
                                        stroke-linecap="round"
                                >
                                </circle>
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-black text-gray-900 tracking-tighter">{Math.round(progress)}%</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">PAID</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed px-4">
                            You have settled {formatCurrency(totalPaid)} of your total assessment.
                        </p>
                    </div>

                    {/* Examination Readiness */}
                    <div className="bg-blue-600 p-10 rounded-[50px] shadow-2xl shadow-blue-200 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-24 h-24" /></div>
                        <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-8">Exam Permitting</h3>
                        <div className="space-y-4 relative z-10">
                            <PermitIndicator label="Prelims" requiredGate={1} buckets={buckets} />
                            <PermitIndicator label="Midterms" requiredGate={2} buckets={buckets} />
                            <PermitIndicator label="Prefinals" requiredGate={4} buckets={buckets} />
                            <PermitIndicator label="Finals" requiredGate={6} buckets={buckets} />
                        </div>
                    </div>

                    {/* Support info */}
                    <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                <Info className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">Financial Inquiries</p>
                                <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                                    Discrepancy in your records? Visit the Cashier's office with your official receipts.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, color }) => {
    const configs = {
        blue: 'bg-blue-600 text-white shadow-blue-100',
        green: 'bg-white text-green-600 border-gray-100',
        amber: 'bg-white text-amber-600 border-gray-100'
    };
    return (
        <div className={`${configs[color]} p-8 rounded-[40px] border shadow-2xl shadow-gray-500/5`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${color === 'blue' ? 'text-blue-100' : 'text-gray-400'}`}>{label}</p>
            <p className="text-3xl font-black tracking-tighter">{value}</p>
        </div>
    );
};

const BucketItem = ({ bucket, formatCurrency }) => {
    const progress = (bucket.paid / bucket.required) * 100;
    const isComplete = progress >= 100;

    return (
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 flex flex-col md:flex-row items-center gap-8">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-all
                ${isComplete ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                {isComplete ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
            </div>
            <div className="flex-grow text-center md:text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Month {bucket.month} {bucket.event_label && `• ${bucket.event_label}`}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <p className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(bucket.paid)}</p>
                    <span className="text-[10px] font-bold text-gray-300">/ {formatCurrency(bucket.required)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isComplete ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="shrink-0">
                {isComplete ? (
                    <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-100">SETTLED</div>
                ) : (
                    <div className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest">PENDING</div>
                )}
            </div>
        </div>
    );
};

const PermitIndicator = ({ label, requiredGate, buckets }) => {
    const bucket = buckets.find(b => b.month === requiredGate);
    const isUnlocked = bucket && bucket.paid >= bucket.required;

    return (
        <div className={`flex items-center justify-between p-5 rounded-[24px] border transition-all
            ${isUnlocked ? 'bg-white/10 border-white/20 text-white' : 'bg-black/10 border-white/5 text-blue-300'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${isUnlocked ? 'bg-blue-400' : 'bg-white/5'}`}>
                    {isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="text-left">
                    <p className="text-xs font-black tracking-tight leading-none mb-1">{label} Exam</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isUnlocked ? 'text-blue-100' : 'text-blue-400/60'}`}>
                        {isUnlocked ? 'Permit Active' : `Unlock at M${requiredGate}`}
                    </p>
                </div>
            </div>
            {isUnlocked && <ArrowUpRight className="w-4 h-4 text-blue-300" />}
        </div>
    );
};

export default StudentSOA;
