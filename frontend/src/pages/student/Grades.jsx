import React, { useState, useEffect } from 'react';
import { 
    Book, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Download, 
    ChevronDown, 
    Search,
    Loader2,
    Calendar,
    ArrowUpRight,
    FileText
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../api';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import PageHeader from '../../components/shared/PageHeader';
import ResolutionStatus from '../../components/shared/ResolutionStatus';
import Button from '../../components/ui/Button';


const StudentGrades = () => {
    const { user } = useAuth();
    const { error } = useToast();

    const [loading, setLoading] = useState(true);
    const [gradesData, setGradesData] = useState({
        semesters: [],
        summary: {}
    });
    const [selectedSemester, setSelectedSemester] = useState('all');

    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const data = await api.get(endpoints.myGrades);
            setGradesData(data || { semesters: [], summary: {} });
        } catch (err) {
            error('Failed to load grades');
            console.error(err);
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

    const { semesters, summary, program_info } = gradesData;
    const filteredSemesters = selectedSemester === 'all' 
        ? semesters 
        : semesters.filter(s => s.semester_id === selectedSemester);

    const exportToPDF = async () => {
        try {
            const element = document.getElementById('grades-container');
            const dataUrl = await domToPng(element, { scale: 2 });
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'letter'
            });
            
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Summary_of_Grades.pdf');
        } catch (err) {
            console.error('Error generating PDF:', err);
            error('Failed to generate PDF');
        }
    };

    return (
        <div id="grades-container" className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in bg-white duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Summary of Grades</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">
                        {program_info?.program_name || 'Program Info Unavailable'}
                        {program_info?.curriculum_name && ` • ${program_info.curriculum_name}`}
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                        variant="secondary" 
                        icon={FileText} 
                        className="flex-1 md:flex-none"
                        onClick={exportToPDF}
                    >
                        EXPORT TO PDF
                    </Button>
                </div>
            </div>

            {/* Academic Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <SummaryCard 
                    label="Cumulative GPA" 
                    value={summary.cumulative_gpa?.toFixed(2) || '--'} 
                    color="blue" 
                    desc={getGPADesc(summary.cumulative_gpa)}
                />
                <SummaryCard label="Units Earned" value={summary.total_units_earned || 0} color="indigo" desc="Total Completed" />
                <SummaryCard label="Passed" value={summary.subjects_passed || 0} color="green" desc="Academic Success" />
                <SummaryCard label="Outstanding INC" value={summary.subjects_failed || 0} color="red" desc="Action Required" />
            </div>

            {/* Filter Bar */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative group">
                    <select 
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 pl-6 pr-12 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-700 focus:outline-none focus:border-blue-300 transition-all cursor-pointer shadow-sm"
                    >
                        <option value="all">All Semesters</option>
                        {semesters.map(s => (
                            <option key={s.semester_id} value={s.semester_id}>
                                {s.semester_name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Semester Wise Grades */}
            <div className="space-y-12">
                {filteredSemesters.map((semester) => (
                    <SemesterBlock key={semester.semester_id} semester={semester} />
                ))}
                {filteredSemesters.length === 0 && (
                    <div className="bg-white rounded-[40px] border border-gray-100 p-20 text-center shadow-2xl shadow-gray-500/5">
                        <Book className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">No subject enrolled yet</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Your academic records will appear here once you are officially enrolled in subjects.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, color, desc }) => {
    const colors = {
        blue: 'from-blue-600 to-blue-800 text-white shadow-blue-200',
        indigo: 'from-indigo-600 to-indigo-800 text-white shadow-indigo-200',
        green: 'from-green-500 to-green-700 text-white shadow-green-200',
        red: 'from-red-500 to-red-700 text-white shadow-red-200'
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} p-8 rounded-[40px] shadow-2xl hover:scale-[1.02] transition-transform`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
            <p className="text-4xl font-black tracking-tighter mb-2">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{desc}</p>
        </div>
    );
};

const SemesterBlock = ({ semester }) => {
    return (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
            <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/30">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                        {semester.semester_name} <span className="text-blue-600 ml-2">{semester.academic_year}</span>
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                        {semester.subjects.length} Subjects • {semester.total_units} Total Units
                    </p>
                </div>
                <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm text-center min-w-[120px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Semester GPA</p>
                    <p className="text-2xl font-black text-gray-900">{semester.gpa?.toFixed(2) || '--'}</p>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-12 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Grade</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {semester.subjects.map((s, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-12 py-6">
                                    <p className="font-black text-gray-900 text-sm">{s.subject_code}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 group-hover:text-blue-600 transition-colors uppercase">{s.subject_title}</p>
                                    {s.pending_resolution && (
                                        <div className="mt-4">
                                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-2">
                                                <Clock className="w-2.5 h-2.5" /> Resolution Progress
                                            </p>
                                            <ResolutionStatus 
                                                status={s.pending_resolution.status} 
                                                resolution={s.pending_resolution} 
                                            />
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-center font-black text-gray-500">
                                    {s.units}
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`text-2xl font-black ${getGradeColor(s.grade)}`}>
                                        {s.grade || '--'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(s.status)}`}>
                                        {s.status}
                                    </span>
                                    {s.status === 'INC' && s.retake_eligibility_date && (
                                        <div className="mt-2 group-hover:scale-105 transition-transform duration-300">
                                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                                                <Calendar className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black text-red-900 uppercase tracking-tighter leading-none mb-1">Retake Target Date</p>
                                                    <p className="text-[10px] font-bold text-red-600 tracking-tight whitespace-nowrap">
                                                        {new Date(s.retake_eligibility_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const getGradeColor = (grade) => {
    if (!grade) return 'text-gray-200';
    const g = parseFloat(grade);
    if (g <= 1.75) return 'text-green-600';
    if (g <= 2.5) return 'text-blue-600';
    if (g <= 3.0) return 'text-amber-500';
    return 'text-red-600';
};

const getStatusColor = (status) => {
    if (!status) return 'text-transparent bg-transparent border-transparent';
    switch (status) {
        case 'PASSED': return 'text-green-600 bg-green-50 border-green-100';
        case 'FAILED': return 'text-red-600 bg-red-50 border-red-100';
        case 'INC': return 'text-amber-600 bg-amber-50 border-amber-100';
        case 'RETAKE': return 'text-purple-600 bg-purple-50 border-purple-100';
        case 'DROPPED': return 'text-gray-500 bg-gray-50 border-gray-100';
        case 'IN PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-100';
        default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
};

const getGPADesc = (gpa) => {
    if (!gpa) return 'Awaiting Records';
    if (gpa <= 1.25) return 'Academic Distinction';
    if (gpa <= 1.75) return 'Very Good Standing';
    if (gpa <= 2.25) return 'Good Standing';
    return 'Satisfactory';
};

export default StudentGrades;
