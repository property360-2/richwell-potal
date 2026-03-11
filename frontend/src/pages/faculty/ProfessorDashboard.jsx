import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, FileText, Calendar, Activity, ChevronRight } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import Card from '../../components/ui/Card';
import '../shared/Dashboard.css';

const ProfessorDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        assigned_sections: 3,
        pending_grades: 45,
        active_students: 120
    });

    const statCards = [
        { label: 'Assigned Sections', value: stats.assigned_sections, icon: <BookOpen />, color: 'bg-blue-glass' },
        { label: 'Pending Grades', value: stats.pending_grades, icon: <FileText />, color: 'bg-amber-glass' },
        { label: 'Active Students', value: stats.active_students, icon: <Users />, color: 'bg-emerald-glass' },
    ];

    const actions = [
        { title: 'Grade Entry', desc: 'Submit and update midterm/final grades.', icon: <FileText className="text-emerald-500" />, path: '/professor/grading', color: 'bg-emerald-50' },
        { title: 'Class Schedule', desc: 'View your weekly teaching schedule and rooms.', icon: <Calendar className="text-blue-500" />, path: '/professor/schedule', color: 'bg-blue-50' },
        { title: 'Resolution Requests', desc: 'Handle student grade resolution requests.', icon: <Activity className="text-rose-500" />, path: '/professor/resolutions', color: 'bg-rose-50' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Faculty Dashboard</h1>
                <p>Manage your teaching load and student academic performance.</p>
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

            <h2 className="section-title mb-6 font-bold text-slate-800">Academic Tools</h2>
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

export default ProfessorDashboard;
