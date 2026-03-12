import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, MapPin, Activity, Settings, Layout, Layers } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import Card from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import '../shared/Dashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        programs: 0,
        subjects: 0,
        professors: 0,
        rooms: 0,
        audit_count: 0
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
        { label: 'Academic Programs', value: stats.programs, icon: <Layout />, color: 'blue' },
        { label: 'Faculty Members', value: stats.professors, icon: <Users />, color: 'purple' },
        { label: 'Active Subjects', value: stats.subjects, icon: <BookOpen />, color: 'emerald' },
        { label: 'Campus Rooms', value: stats.rooms, icon: <MapPin />, color: 'amber' },
        { label: 'Audit Entries', value: stats.audit_count, icon: <Activity />, color: 'rose' },
    ];

    const quickLinks = [
        { title: 'System Audit', desc: 'Track all data mutations and security events.', icon: <Activity className="text-rose-500" />, path: '/admin/audit', color: 'bg-rose-50' },
        { title: 'User Management', desc: 'Control user roles, permissions, and accounts.', icon: <Users className="text-blue-500" />, path: '/admin/users', color: 'bg-blue-50' },
        { title: 'Curriculum Management', desc: 'Define programs, subjects, and prerequisites.', icon: <GraduationCap className="text-emerald-500" />, path: '/admin/curriculum', color: 'bg-emerald-50' },
        { title: 'Department Controls', desc: 'Manage colleges and organizational units.', icon: <Layers className="text-purple-500" />, path: '/admin/departments', color: 'bg-purple-50' },
    ];

    return (
        <div className="dashboard-container">
            <PageHeader 
                title="Admin Command Center" 
                description="Global oversight and system configuration." 
                className="mb-8"
            />

            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <StatCard
                        key={i}
                        title={card.label}
                        value={card.value}
                        icon={card.icon}
                        colorTheme={card.color}
                        delay={i * 100}
                        loading={loading}
                    />
                ))}
            </div>

            <h2 className="section-title mb-6 font-bold text-slate-800">Quick Operations</h2>
            <div className="quick-links-grid">
                {quickLinks.map((link, i) => (
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

export default AdminDashboard;
