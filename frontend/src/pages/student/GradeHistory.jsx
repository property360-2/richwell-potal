import React, { useState, useEffect } from 'react';
import { Award, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import { gradesApi } from '../../api/grades';
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
            <div className="portal-section mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Academic History</h2>
                            <p className="text-slate-500 font-medium">Detailed record of all your semester grades.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Units Earned</p>
                            <p className="text-3xl font-black text-indigo-600 leading-none">{calculateTotalUnits()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {Object.entries(groupedGrades).map(([term, grades], idx) => (
                <div key={idx} className="portal-section grade-term-card">
                    <div className="section-header">
                        <h3 className="section-title"><BookOpen size={20} className="text-indigo-500" /> {term}</h3>
                        <span className="text-sm font-bold text-slate-500">{grades.length} Subjects</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="grade-table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Title</th>
                                    <th>Units</th>
                                    <th>Midterm</th>
                                    <th>Final</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map((g, gIdx) => (
                                    <tr key={gIdx}>
                                        <td className="font-bold text-slate-900">{g.subject_details?.code}</td>
                                        <td>{g.subject_details?.name}</td>
                                        <td className="font-medium">{g.subject_details?.units}</td>
                                        <td className="font-bold text-slate-700">{g.midterm_grade || '-'}</td>
                                        <td className="font-bold text-slate-900">{g.final_grade || '-'}</td>
                                        <td>
                                            <span className={`badge-grade ${
                                                g.grade_status === 'PASSED' ? 'grade-passed' :
                                                g.grade_status === 'FAILED' ? 'grade-failed' : 'grade-inc'
                                            }`}>
                                                {g.grade_status || 'In Progress'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
