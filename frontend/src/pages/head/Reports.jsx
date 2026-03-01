import React, { useState, useEffect } from 'react';
import { 
    Users, 
    CreditCard, 
    TrendingUp, 
    Activity, 
    PieChart, 
    FileText, 
    AlertCircle, 
    CheckCircle2, 
    GraduationCap, 
    BookOpen,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const InfoCard = ({ title, value, subtitle, icon: Icon, trend, colorClass = "blue" }) => {
    const colorStyles = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
    }[colorClass] || "text-gray-600 bg-gray-50 border-gray-100";

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-xl shadow-gray-200/20 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
            <div className={`absolute -right-10 -top-10 w-40 h-40 ${colorStyles.split(' ')[1]} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-4 rounded-2xl ${colorStyles.split(' ')[1]} ${colorStyles.split(' ')[0]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">{title}</h3>
                <div className="text-3xl font-black text-gray-900 tracking-tight mb-1">{value}</div>
                {subtitle && <p className="text-gray-400 text-xs font-medium">{subtitle}</p>}
            </div>
        </div>
    );
};

const ProgressRing = ({ percentage = 0, size = 120, strokeWidth = 12, color = "stroke-blue-500", label }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    className="stroke-gray-100"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`${color} transition-all duration-1000 ease-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-gray-900">{percentage}%</span>
                {label && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{label}</span>}
            </div>
        </div>
    );
};


const ReportsDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [admissionStats, setAdmissionStats] = useState(null);
    const [paymentStats, setPaymentStats] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [admissions, payments] = await Promise.all([
                    HeadService.getAdmissionStats(),
                    HeadService.getPaymentReport()
                ]);
                setAdmissionStats(admissions);
                setPaymentStats(payments);
            } catch (err) {
                console.error("Failed to load reports:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin text-blue-600">
                    <Activity className="w-12 h-12" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 lg:py-12 animate-in fade-in duration-700">
            <SEO title="Universal Reports" description="Interactive analytics and data oversight." />

            {/* Header */}
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">
                            Analytics Hub
                        </span>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Live Data</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter">Universal Reports</h1>
                    <p className="text-gray-500 font-medium mt-2">Executive dashboard for admissions, enrollment, and revenue tracking.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/20 text-gray-500 hover:text-blue-600 transition-all font-black text-xs uppercase tracking-widest">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </header>

            {/* Admission Metrics */}
            {admissionStats && (
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Admissions & Enrollment</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <InfoCard 
                            title="Total Applicants" 
                            value={admissionStats.total_applicants} 
                            subtitle="All registered accounts"
                            icon={Users}
                            colorClass="indigo"
                        />
                        <InfoCard 
                            title="Officially Enrolled" 
                            value={admissionStats.active || 0} 
                            subtitle="Completed all steps"
                            icon={CheckCircle2}
                            trend={2.5}
                            colorClass="emerald"
                        />
                        <InfoCard 
                            title="Pending Admission" 
                            value={admissionStats.pending_admission || 0} 
                            subtitle="Awaiting file review"
                            icon={FileText}
                            colorClass="amber"
                        />
                        <InfoCard 
                            title="Rejected" 
                            value={admissionStats.rejected || 0} 
                            subtitle="Returned or denied"
                            icon={AlertCircle}
                            colorClass="rose"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Conversion Chart */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 flex flex-col items-center justify-center text-center">
                            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-8 w-full text-left">Conversion Rate</h3>
                            <ProgressRing 
                                percentage={admissionStats.conversion_rate || 0} 
                                size={180} 
                                strokeWidth={16} 
                                label="Applicant to Enrolled"
                                color="stroke-indigo-500" 
                            />
                            <p className="mt-8 text-sm text-gray-400 font-medium leading-relaxed">
                                Percentage of registered applicants who successfully completed the entire enrollment process.
                            </p>
                        </div>

                        {/* Top Programs */}
                        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Enrollment By Program</h3>
                                <PieChart className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="space-y-6">
                                {admissionStats.by_program && admissionStats.by_program.length > 0 ? (
                                    admissionStats.by_program.map((prog, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <div className="text-sm font-black text-gray-900">{prog.program_name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{prog.program_code}</div>
                                                </div>
                                                <div className="text-lg font-black text-indigo-600">{prog.count}</div>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${Math.min((prog.count / (admissionStats.active || 1)) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-400 text-sm font-medium">No program data available</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Metrics */}
            {paymentStats && (
                <div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Revenue & Collections</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <InfoCard 
                            title="Total Expected" 
                            value={`₱${parseFloat(paymentStats.total_required).toLocaleString()}`} 
                            subtitle="Total receivables"
                            icon={BarChart3}
                            colorClass="blue"
                        />
                        <InfoCard 
                            title="Total Collected" 
                            value={`₱${parseFloat(paymentStats.total_paid).toLocaleString()}`} 
                            subtitle="Actual payments received"
                            icon={TrendingUp}
                            colorClass="emerald"
                        />
                        <InfoCard 
                            title="Outstanding Balance" 
                            value={`₱${parseFloat(paymentStats.outstanding_balance).toLocaleString()}`} 
                            subtitle="Remaining to collect"
                            icon={AlertCircle}
                            colorClass="amber"
                        />
                        <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-xl shadow-gray-200/20 flex flex-col justify-center items-center relative overflow-hidden">
                             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-50 rounded-full blur-3xl opacity-50" />
                             <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] absolute top-6 left-6 z-10 w-full text-left">Collection Rate</h3>
                             <ProgressRing 
                                percentage={paymentStats.collection_rate} 
                                size={120} 
                                strokeWidth={10} 
                                color="stroke-emerald-500" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Promissory Notes Summary */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    Promissory Notes Activity
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                    <div className="text-3xl font-black text-gray-900 mb-1">
                                        ₱{parseFloat(paymentStats.promissory_notes?.total_amount_outstanding || 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">PN Total Outstanding</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-emerald-600 mb-1">
                                        ₱{parseFloat(paymentStats.promissory_notes?.total_amount_paid || 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">PN Total Paid</div>
                                </div>
                            </div>
                            
                            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-rose-900 mb-1">Overdue Promissory Notes</h4>
                                    <p className="text-sm text-rose-600">
                                        There are exactly <strong className="font-black">{paymentStats.promissory_notes?.overdue_count || 0}</strong> promissory notes that have passed their expiration date and require immediate attention or blocking.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* First Month Paid Ratio */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-blue-500" />
                                    Initial Payment Enforcement
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                                Tracks the number of officially enrolled and active students who have cleared their required first month's payment versus those who are deferred or missing the payment.
                            </p>
                            
                            <div className="flex h-16 w-full rounded-2xl overflow-hidden mb-4 shadow-inner">
                                <div 
                                    className="h-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg transition-all"
                                    style={{ flex: Math.max(paymentStats.students_paid_first_month, 1) }}
                                >
                                    {paymentStats.students_paid_first_month}
                                </div>
                                <div 
                                    className="h-full bg-rose-400 flex items-center justify-center text-white font-black text-lg transition-all"
                                    style={{ flex: Math.max(paymentStats.students_not_paid_first_month, 1) }}
                                >
                                    {paymentStats.students_not_paid_first_month}
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Paid First Month</span>
                                <span className="text-rose-500 flex items-center gap-1">Not Paid <AlertCircle className="w-3 h-3"/></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsDashboard;
