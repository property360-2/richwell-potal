import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Users, 
    FileText, 
    AlertCircle, 
    GraduationCap, 
    Calendar, 
    Clock, 
    ChevronRight,
    ArrowUpRight,
    Search,
    Plus,
    Loader2,
    Lock,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';

const RegistrarDashboard = () => {
    const { user } = useAuth();
    const { error } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        pendingCOR: 0,
        expiringINC: 0
    });
    const [recentStudents, setRecentStudents] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [studentsRes, incRes] = await Promise.all([
                fetch('/api/v1/cashier/student-search/'),
                fetch('/api/v1/registrar/inc-report/')
            ]);

            if (studentsRes.ok) {
                const students = await studentsRes.json();
                const list = students.results || students || [];
                setStats(prev => ({ 
                    ...prev, 
                    totalStudents: list.length,
                    pendingCOR: list.length // Based on legacy logic
                }));
                setRecentStudents(list.slice(0, 5).map(s => ({
                    id: s.id || s.enrollment_id,
                    student_number: s.student_number || 'N/A',
                    name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
                    program: s.program_code || s.program?.code || 'N/A',
                    year_level: s.year_level || 1
                })));
            }

            if (incRes.ok) {
                const incData = await incRes.json();
                setStats(prev => ({ ...prev, expiringINC: incData.expiring_soon_count || 0 }));
            }
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

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Registrar Dashboard" description="Administrative control center for student management and academic catalog." />
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Welcome, {user?.first_name || 'Registrar'}!</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Administrative Control Center</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                        variant="primary" 
                        icon={Plus} 
                        className="flex-1 md:flex-none"
                        onClick={() => navigate('/registrar/students?action=add')}
                    >
                        ADD STUDENT
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard 
                    label="Total Students" 
                    value={stats.totalStudents} 
                    icon={Users} 
                    color="blue" 
                    link="/registrar/students" 
                />
                <StatCard 
                    label="Pending COR" 
                    value={stats.pendingCOR} 
                    icon={FileText} 
                    color="green" 
                    link="/registrar/cor" 
                />
                <StatCard 
                    label="Expiring INC" 
                    value={stats.expiringINC} 
                    icon={AlertCircle} 
                    color={stats.expiringINC > 0 ? "amber" : "blue"} 
                    link="/registrar/inc" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Students */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Recent Students</h2>
                            <Link to="/registrar/students" className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                View Masterlist <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Year</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recentStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/registrar/students/${student.id}`)}>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{student.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{student.student_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 text-xs font-black text-gray-600 uppercase tracking-widest">{student.program}</td>
                                            <td className="px-8 py-4 text-right">
                                                <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase">Year {student.year_level}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentStudents.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-12 text-center text-gray-400 font-bold italic">No students found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight px-2">Quick Management</h2>
                    <ActionCard 
                        title="Subject Repository" 
                        desc="Manage academic catalog and curriculum"
                        icon={GraduationCap}
                        color="purple"
                        link="/registrar/subjects"
                    />
                    <ActionCard 
                        title="Academic Terms" 
                        desc="Configure semesters and enrollment"
                        icon={Calendar}
                        color="orange"
                        link="/registrar/semesters"
                    />
                    <ActionCard 
                        title="Section Manager" 
                        desc="Handle class schedules and sections"
                        icon={Clock}
                        color="indigo"
                        link="/registrar/sections"
                    />
                    <ActionCard 
                        title="Grade Monitoring" 
                        desc="Drill-down academic performance records"
                        icon={BarChart3}
                        color="blue"
                        link="/registrar/grades"
                    />
                    <ActionCard 
                        title="Finalization Authority" 
                        desc="Lock submitted grades for the semester"
                        icon={Lock}
                        color="indigo"
                        link="/registrar/grade-finalization"
                    />
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, link }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50/50 border-blue-100 shadow-blue-500/5',
        green: 'text-green-600 bg-green-50/50 border-green-100 shadow-green-500/5',
        amber: 'text-amber-600 bg-amber-50/50 border-amber-100 shadow-amber-500/5'
    };

    return (
        <Link to={link} className={`p-8 rounded-[32px] border-2 transition-all hover:shadow-2xl hover:scale-[1.02] flex items-center justify-between group ${colors[color]}`}>
            <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
                <p className="text-4xl font-black tracking-tighter">{value}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white shadow-lg group-hover:rotate-12`}>
                <Icon className="w-7 h-7" />
            </div>
        </Link>
    );
};

const ActionCard = ({ title, desc, icon: Icon, color, link }) => {
    const colors = {
        purple: 'from-purple-500 to-pink-600 shadow-purple-200',
        orange: 'from-orange-500 to-red-600 shadow-orange-200',
        indigo: 'from-indigo-500 to-blue-700 shadow-indigo-200',
        blue: 'from-blue-500 to-cyan-600 shadow-blue-200'
    };

    return (
        <Link to={link} className="block group">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-500/5 hover:shadow-2xl transition-all flex items-start gap-5">
                <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{title}</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-200 ml-auto self-center group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    );
};

export default RegistrarDashboard;
