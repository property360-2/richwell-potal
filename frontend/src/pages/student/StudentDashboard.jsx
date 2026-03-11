import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, CreditCard, Bell, Calendar, FileText, User } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { useAuth } from '../../hooks/useAuth';
import '../shared/Dashboard.css';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        enrolled_units: '-',
        gpa: '-',
        notifications: 0
    });
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

    const statCards = [
        { label: 'Unread Alerts', value: stats.notifications, icon: <Bell />, color: 'bg-rose-glass' },
        { label: 'Term GPA', value: stats.gpa, icon: <Award />, color: 'bg-purple-glass' },
        { label: 'Enrolled Units', value: stats.enrolled_units, icon: <BookOpen />, color: 'bg-blue-glass' },
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
                <p>Welcome back to your academic portal.</p>
            </div>

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
        </div>
    );
};

const Award = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
);

export default StudentDashboard;
