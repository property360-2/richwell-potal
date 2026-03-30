import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Calendar, CheckCircle, FileText, Globe } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import Card from '../../components/ui/Card';
import '../shared/Dashboard.css';

const AdmissionDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pending_applicants: 12, // Mock or fetch
        today_appointments: 5,
        admissions_today: 8
    });

    const statCards = [
        { label: 'Pending Applicants', value: stats.pending_applicants, icon: <UserPlus />, color: 'bg-blue-glass' },
        { label: "Today's Appointments", value: stats.today_appointments, icon: <Calendar />, color: 'bg-purple-glass' },
        { label: 'Admissions Today', value: stats.admissions_today, icon: <CheckCircle />, color: 'bg-emerald-glass' },
    ];

    const actions = [
        { title: 'Applicant Management', desc: 'Process and review new student applications.', icon: <Users className="text-blue-500" />, path: '/admission/applicants', color: 'bg-blue-50' },
        { title: 'Admission Requirements', desc: 'Manage list of required documents per program.', icon: <FileText className="text-purple-500" />, path: '/admission/requirements', color: 'bg-purple-50' },
        { title: 'Public Inquiry Logs', desc: 'Track inquiries from the public website.', icon: <Globe className="text-emerald-500" />, path: '/admission/inquiries', color: 'bg-emerald-50' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Admission Dashboard</h1>
                <p>Track recruitment, applications, and student entry.</p>
            </div>

            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <div key={i} className="stat-card">
                        <div className={`stat-icon-wrapper ${card.color}`}>
                            {card.icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{card.value}</span>
                            <span className="stat-label">{card.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="section-title mb-6 font-bold text-slate-800">Enrollment Pipeline</h2>
            <div className="quick-links-grid">
                {actions.map((link, i) => (
                    <div key={i} className="link-card" onClick={() => navigate(link.path)}>
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

export default AdmissionDashboard;
