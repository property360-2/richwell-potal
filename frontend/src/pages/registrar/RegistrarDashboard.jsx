import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileCheck, CheckCircle, FileText, Table, Award, Layers, Search } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import Card from '../../components/ui/Card';
import '../shared/Dashboard.css';

const RegistrarDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pending_docs: 0,
        pending_grades: 0,
        total_students: 0,
        sections: 0
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
        { label: 'Pending Verifications', value: stats.pending_docs, icon: <FileCheck />, color: 'bg-amber-glass' },
        { label: 'Unfinalized Sections', value: stats.pending_grades, icon: <FileText />, color: 'bg-rose-glass' },
        { label: 'Enrolled Students', value: stats.total_students, icon: <Users />, color: 'bg-blue-glass' },
        { label: 'Active Sections', value: stats.sections, icon: <Layers />, color: 'bg-purple-glass' },
    ];

    const operations = [
        { title: 'Doc Verification', desc: 'Verify student credentials for enrollment.', icon: <FileCheck className="text-amber-500" />, path: '/registrar/verification', color: 'bg-amber-50' },
        { title: 'Section Management', desc: 'Create and assign students to sections.', icon: <Layers className="text-purple-500" />, path: '/registrar/sections', color: 'bg-purple-50' },
        { title: 'Grade Finalization', desc: 'Review and lock semester grades.', icon: <CheckCircle className="text-emerald-500" />, path: '/registrar/grades', color: 'bg-emerald-50' },
        { title: 'Masterlist Export', desc: 'Download comprehensive term reports.', icon: <Table className="text-blue-500" />, path: '/registrar/reports/masterlist', color: 'bg-blue-50' },
        { title: 'COR Issuance', desc: 'Preview and download student CORs.', icon: <FileText className="text-indigo-500" />, path: '/registrar/reports/cor', color: 'bg-indigo-50' },
        { title: 'Graduation Audit', desc: 'Check eligibility and mark graduates.', icon: <Award className="text-rose-500" />, path: '/registrar/reports/graduation', color: 'bg-rose-50' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Registrar Dashboard</h1>
                <p>Manage student records, sections, and official reports.</p>
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

            <h2 className="section-title mb-6 font-bold text-slate-800">Operational Tools</h2>
            <div className="quick-links-grid">
                {operations.map((link, i) => (
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

export default RegistrarDashboard;
