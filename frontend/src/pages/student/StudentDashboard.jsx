import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, 
    Book, 
    CreditCard, 
    CheckCircle, 
    AlertCircle, 
    Clock, 
    ChevronRight,
    ArrowUpRight,
    ShieldCheck,
    Loader2,
    Calendar,
    Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import { formatCurrency } from '../../utils/formatters';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { error } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        enrollmentStatus: 'N/A',
        enrolledUnits: 0,
        stats: {},
        paymentBuckets: [],
        gpa: null
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [enrollRes, subjectsRes, paymentsRes, gradesRes] = await Promise.all([
                fetch('/api/v1/students/my-enrollment/'),
                fetch('/api/v1/students/my-enrollments/'),
                fetch('/api/v1/students/my-payments/'),
                fetch('/api/v1/students/my-grades/')
            ]);

            let newData = { ...dashboardData };

            if (enrollRes.ok) {
                const data = await enrollRes.json();
                newData.enrollmentStatus = data.status || 'N/A';
            }

            if (subjectsRes.ok) {
                const data = await subjectsRes.json();
                newData.enrolledUnits = data.enrolled_units || 0;
            }

            if (paymentsRes.ok) {
                const data = await paymentsRes.json();
                newData.paymentBuckets = data.buckets || [];
            }

            if (gradesRes.ok) {
                const data = await gradesRes.json();
                newData.gpa = data.summary?.cumulative_gpa || null;
            }

            setDashboardData(newData);
        } catch (err) {
            console.error(err);
            error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    const { enrollmentStatus, enrolledUnits, paymentBuckets, gpa } = dashboardData;
    const profile = user?.student_profile;
    const studentType = profile?.overload_approved ? 'Overloaded' : (profile?.is_irregular ? 'Irregular' : 'Regular');

    // Payment Calculations
    const totalPaid = paymentBuckets.reduce((sum, b) => sum + b.paid, 0);
    const monthlyCommitment = paymentBuckets.length > 0 ? paymentBuckets[0].required : 0;
    const month1Paid = paymentBuckets.length > 0 ? paymentBuckets[0].paid >= paymentBuckets[0].required : false;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Student Dashboard" description="Track your academic progress, grades, and financial status." />
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Mabuhay, {user?.first_name}!</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Student Portal • {user?.student_number || 'REGISTRATION PENDING'}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                        variant="secondary" 
                        icon={Calendar} 
                        className="flex-1 md:flex-none"
                        onClick={() => navigate('/student/schedule')}
                    >
                        VIEW SCHEDULE
                    </Button>
                </div>
            </div>

            {/* Account Status Banners */}
            <div className="space-y-4 mb-10">
                {!user?.student_number && (
                    <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[32px] flex items-start gap-4 animate-in slide-in-from-top-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Account Pending Review</h3>
                            <p className="text-xs font-bold text-amber-700/80 mt-1 leading-relaxed">
                                Your application is currently being evaluated by the Admissions Office. You will be notified once a Student Number is issued.
                            </p>
                        </div>
                    </div>
                )}

                {!month1Paid && user?.student_number && (
                    <div className="bg-blue-600 p-8 rounded-[40px] text-white shadow-2xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="flex items-center gap-6 relative">
                            <div className="w-16 h-16 bg-white/20 rounded-[28px] flex items-center justify-center backdrop-blur-md">
                                <CreditCard className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Initial Payment Required</h3>
                                <p className="text-blue-100 font-bold text-xs uppercase tracking-widest mt-1">Status: Pending Enrollment Activation</p>
                                <p className="text-white/80 text-sm mt-3 max-w-md font-medium">
                                    Please settle your initial commitment of <span className="text-white font-black">{formatCurrency(monthlyCommitment)}</span> at the Cashier to finalize your subject enrollments.
                                </p>
                            </div>
                        </div>
                        <Button variant="white" className="relative group/btn text-blue-600" onClick={() => navigate('/student/soa')}>
                            VIEW STATEMENT <ArrowUpRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard label="Enrollment Status" value={enrollmentStatus} icon={ShieldCheck} color="blue" />
                <StatCard label="Enrolled Units" value={enrolledUnits} icon={Book} color="indigo" />
                <StatCard label="Cumulative GPA" value={gpa?.toFixed(2) || '--'} icon={CheckCircle} color="green" />
                <StatCard label="Student Type" value={studentType} icon={User} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Financial Progress */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8 md:p-12 h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payment Progress</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Semester Installment Tracking</p>
                            </div>
                            <div className="text-right">
                                <Link to="/student/soa" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center justify-end gap-1 mb-1">
                                    VIEW FULL SOA <ArrowUpRight className="w-3 h-3" />
                                </Link>
                                <p className="text-2xl font-black text-green-600 leading-none">{formatCurrency(totalPaid)}</p>
                                <p className="text-[9px] font-bold text-gray-300 uppercase mt-1">TOTAL PAID</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {paymentBuckets.map((bucket, index) => (
                                <PaymentBucket key={index} bucket={bucket} />
                            ))}
                            {paymentBuckets.length === 0 && (
                                <div className="py-20 text-center">
                                    <CreditCard className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No payment schedule generated yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Academic Metadata & Alerts */}
                <div className="space-y-6">
                    <div className="bg-gray-900 text-white rounded-[40px] p-8 shadow-2xl shadow-gray-200">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Subject Statistics</h3>
                        <div className="space-y-6">
                            <MetaItem label="Academic Program" value={user?.student_profile?.program_code || 'N/A'} />
                            <MetaItem label="Active Curriculum" value={user?.student_profile?.curriculum_code || 'N/A'} />
                            <MetaItem label="Home Section" value={user?.student_profile?.home_section_name || 'NOT ASSIGNED'} />
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/10">
                            <Link to="/student/grades" className="flex items-center justify-between group">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">View Grade Report</span>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[40px] p-8 text-white relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10 group-hover:scale-125 transition-transform duration-700"></div>
                        <h3 className="text-xl font-black tracking-tight mb-2">Subject Enlisting</h3>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest leading-relaxed">Enroll in your subjects for the current semester.</p>
                        <Button 
                            variant="white" 
                            className="w-full mt-6 py-4 text-indigo-600 font-black tracking-widest"
                            onClick={() => navigate('/enrollment/subjects')}
                        >
                            ENROLL NOW
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50/50',
        green: 'text-green-600 bg-green-50/50',
        indigo: 'text-indigo-600 bg-indigo-50/50',
        purple: 'text-purple-600 bg-purple-50/50'
    };
    return (
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-500/5 hover:shadow-2xl hover:scale-[1.02] transition-all group">
            <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-black text-gray-900 tracking-tight">{value}</p>
        </div>
    );
};

const PaymentBucket = ({ bucket }) => {
    const progress = Math.min(100, (bucket.paid / bucket.required) * 100);
    const isPaid = progress >= 100;
    
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <p className="text-xs font-black text-gray-700 uppercase tracking-tight">
                    {bucket.event_label ? `Month ${bucket.month}: ${bucket.event_label}` : `Month ${bucket.month}`}
                </p>
                <p className="text-xs font-black text-gray-900">
                    {formatCurrency(bucket.paid)} <span className="text-gray-300 font-bold mx-1">/</span> <span className="text-gray-400">{formatCurrency(bucket.required)}</span>
                </p>
            </div>
            <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isPaid ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-700'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

const MetaItem = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xs font-black text-white uppercase tracking-tight">{value}</p>
    </div>
);

export default StudentDashboard;
