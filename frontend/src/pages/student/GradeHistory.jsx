import React, { useState, useEffect } from 'react';
import { Award, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import { gradesApi } from '../../api/grades';
import PageHeader from '../../components/shared/PageHeader';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import './StudentPortal.css';

const GradeHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await gradesApi.getHistory();
            setHistory(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Subject Code',
            render: (g) => <span className="font-bold text-slate-900">{g.subject_details?.code}</span>
        },
        {
            header: 'Title',
            render: (g) => <span>{g.subject_details?.name}</span>
        },
        {
            header: 'Units',
            render: (g) => <span className="font-medium">{g.subject_details?.units}</span>
        },
        {
            header: 'Midterm',
            render: (g) => <span className="font-bold text-slate-700">{g.midterm_grade || '-'}</span>
        },
        {
            header: 'Final',
            render: (g) => <span className="font-bold text-slate-900">{g.final_grade || '-'}</span>
        },
        {
            header: 'Status',
            render: (g) => (
                <Badge variant={
                    g.grade_status === 'PASSED' ? 'success' :
                    g.grade_status === 'FAILED' ? 'danger' : 'warning'
                }>
                    {g.grade_status || 'In Progress'}
                </Badge>
            )
        }
    ];

    // Group grades by term
    const groupedGrades = history.reduce((acc, grade) => {
        const term = grade.term_details?.code || 'Transfer Credits / Others';
        if (!acc[term]) acc[term] = [];
        acc[term].push(grade);
        return acc;
    }, {});

    const calculateTotalUnits = () => {
        return history
            .filter(g => g.grade_status === 'PASSED')
            .reduce((sum, g) => sum + (g.subject_details?.units || 0), 0);
    };

    if (loading) return <div className="p-8">Loading academic records...</div>;

    return (
        <div className="student-portal-container">
            <div className="mb-8">
                <PageHeader
                    title="Academic History"
                    description="Detailed record of all your semester grades."
                    badge={<GraduationCap size={32} className="text-indigo-600" />}
                    actions={
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Units Earned</p>
                            <p className="text-3xl font-black text-indigo-600 leading-none">{calculateTotalUnits()}</p>
                        </div>
                    }
                />
            </div>

            {Object.entries(groupedGrades).map(([term, grades], idx) => (
                <div key={idx} className="portal-section grade-term-card">
                    <div className="section-header">
                        <h3 className="section-title"><BookOpen size={20} className="text-indigo-500" /> {term}</h3>
                        <span className="text-sm font-bold text-slate-500">{grades.length} Subjects</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <Table 
                            columns={columns}
                            data={grades}
                            emptyMessage="No grades found for this term."
                        />
                    </div>
                </div>
            ))}

            {history.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No academic records found for this student.</p>
                </div>
            )}
        </div>
    );
};

export default GradeHistory;
