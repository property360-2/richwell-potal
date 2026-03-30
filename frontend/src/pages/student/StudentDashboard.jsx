import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, CreditCard, Bell, Calendar, FileText, User } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { useAuth } from '../../hooks/useAuth';
import EnrollmentModal from './components/EnrollmentModal';
import '../shared/Dashboard.css';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [stats, setStats] = useState({ active_term: null, current_enrollment: null, student_info: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await reportsApi.getStats();
            setStats(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isEnrolledForTerm = !!stats.current_enrollment;
    const canEnrollForTerm = stats.active_term && !isEnrolledForTerm;

    const statCards = [
        { label: 'Unread Alerts', value: stats.notifications || 0, icon: <Bell />, color: 'bg-rose-glass' },
        { label: 'Term GPA', value: stats.stats?.gpa || '0.00', icon: <Award />, color: 'bg-purple-glass' },
        { label: 'Academic Status', value: stats.student_info?.status || 'Active', icon: <BookOpen />, color: 'bg-blue-glass' },
    ];

    const actions = [
        { title: 'Student Profile', desc: 'View and update your personal information.', icon: <User className="text-blue-500" />, path: '/profile', color: 'bg-blue-50' },
        { title: 'Grade Report', desc: 'Check your current and previous semester grades.', icon: <FileText className="text-emerald-500" />, path: '/student/grades', color: 'bg-emerald-50' },
        { title: 'Financial Ledger', desc: 'View payment history and exam permits.', icon: <CreditCard className="text-amber-500" />, path: '/student/finance', color: 'bg-amber-50' },
        { title: 'Class Schedule', desc: 'View your weekly class and room assignments.', icon: <Calendar className="text-indigo-500" />, path: '/student/schedule', color: 'bg-indigo-50' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Welcome, {user?.first_name}!</h1>
                <p>Access your academic performance and school resources here.</p>
            </div>

            {/* Enrollment Call-to-Action Banner */}
            {canEnrollForTerm && (
                <div className="enrollment-banner animate-in fade-in zoom-in slide-in-from-top-4 duration-500 border-2 border-primary-100 bg-white shadow-xl p-8 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-6 justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                        <GraduationCap size={240} />
                    </div>
                    <div className="flex-1 text-center md:text-left z-10">
                        <div className="inline-flex items-center gap-2 text-primary-600 font-bold px-3 py-1 bg-primary-50 rounded-full text-sm mb-3">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            Enrollment officially open for {stats.active_term.code}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Ready for the Next Step?</h2>
                        <p className="text-slate-600 max-w-lg">Complete your term registration to proceed with subject advising and secure your classes for the <b>{stats.active_term.name}</b>.</p>
                    </div>
                    <button 
                        onClick={() => setIsEnrollModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-1 text-white px-10 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 active:scale-95 group/btn z-10 whitespace-nowrap shadow-lg"
                    >
                        Enroll for the Term
                        <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* If enrolled but pending advising */}
            {isEnrolledForTerm && stats.current_enrollment.advising_status === 'FOR_ADVISING' && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-8 flex justify-between items-center text-amber-900 shadow-sm animate-pulse-subtle">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><BookOpen size={18}/> Enrollment Started!</h3>
                        <p className="text-sm opacity-90">Please proceed to subject selection to finalize your registration for {stats.active_term?.code}.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/student/advising')}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap text-sm shadow-md"
                    >
                        Select Subjects
                    </button>
                </div>
            )}

            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <div key={i} className="stat-card animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className={`stat-icon-wrapper ${card.color}`}>
                            {card.icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{loading ? '...' : card.value}</span>
                            <span className="stat-label">{card.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="section-title mb-6 font-bold text-slate-800">Quick Portal Actions</h2>
            <div className="quick-links-grid">
                {actions.map((link, i) => (
                    <div 
                        key={i} 
                        className="link-card animate-in fade-in slide-in-from-right-4" 
                        style={{ animationDelay: `${400 + (i * 100)}ms` }}
                        onClick={() => navigate(link.path)}
                    >
                        <div className={`link-icon ${link.color}`}>
                            {link.icon}
                        </div>
                        <div className="link-content">
                            <h3>{link.title}</h3>
                            <p>{link.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Enrollment Modal */}
            <EnrollmentModal 
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                studentData={{
                    id: stats.student_info?.id, // Note: I should ensure id is in stats
                    idn: stats.student_info?.idn,
                    user: user,
                    program: stats.student_info?.program,
                    contact_number: user?.contact_number
                }}
                termData={stats.active_term}
                onEnrollSuccess={fetchStats}
            />
        </div>
    );
};

const ArrowRight = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const Award = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
);

export default StudentDashboard;
