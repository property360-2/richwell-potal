import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    User, 
    Book, 
    History, 
    CreditCard, 
    ArrowLeft, 
    Mail, 
    Phone, 
    Calendar, 
    MapPin, 
    CheckCircle, 
    AlertCircle,
    Loader2,
    ShieldCheck,
    Edit2,
    GraduationCap,
    Clock
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import SEO from '../../../components/shared/SEO';
import Badge from '../../../components/ui/Badge';
import { api, endpoints } from '../../../api';

const RegistrarStudentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        fetchStudentDetails();
    }, [id]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const data = await api.get(endpoints.registrarStudentDetail(id));
            setStudent(data);
        } catch (err) {
            console.error('Failed to load student details', err);
            error('Failed to load student details');
            navigate('/registrar/students');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            await api.patch(endpoints.registrarStudentDetail(id), { status: newStatus });
            success('Status updated successfully');
            fetchStudentDetails();
        } catch (err) {
            console.error('Error updating status', err);
            error('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!student) return null;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'academic', label: 'Academic Status', icon: ShieldCheck },
        { id: 'enrollment', label: 'Enrollment History', icon: History },
        { id: 'credits', label: 'Credited Subjects', icon: Book },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title={`Profile: ${student?.full_name || 'Loading...'}`} description="Institutional student profile and academic record management." />
            
            {/* Header Action Bar */}
            <button 
                onClick={() => navigate('/registrar/students')}
                className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-blue-600 transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Masterlist
            </button>

            {/* Profile Header */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-gray-100 shadow-2xl shadow-blue-500/5 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="w-32 h-32 bg-blue-600 rounded-[40px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-blue-200">
                    {student.last_name[0]}{student.first_name[0]}
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{student.first_name} {student.last_name}</h1>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border 
                                ${student.status === 'ACTIVE' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                {student.status}
                            </span>
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                            {student.student_number || 'REGISTRATION PENDING'} • {student.program_code}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                            <Mail className="w-4 h-4" /> {student.email}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-bold border-l border-gray-100 pl-4">
                            <Phone className="w-4 h-4" /> {student.contact_number || 'No Phone'}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <Button variant="secondary" icon={Edit2}>EDIT PROFILE</Button>
                    <div className="flex gap-2">
                        {student.status === 'ACTIVE' ? (
                            <button 
                                onClick={() => handleStatusUpdate('INACTIVE')}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                            >
                                DEACTIVATE
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleStatusUpdate('ACTIVE')}
                                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors"
                            >
                                ACTIVATE
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-8 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${activeTab === tab.id 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Panels */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8 md:p-12 overflow-hidden">
                {activeTab === 'profile' && <ProfilePanel student={student} />}
                {activeTab === 'academic' && <AcademicPanel student={student} />}
                {activeTab === 'enrollment' && <EnrollmentPanel student={student} />}
                {activeTab === 'credits' && <CreditsPanel student={student} />}
            </div>
        </div>
    );
};

// Sub-panels
const ProfilePanel = ({ student }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2">
        <div className="space-y-8">
            <InfoGroup label="Full Name" value={`${student.first_name} ${student.last_name}`} icon={User} />
            <InfoGroup label="Email Address" value={student.email} icon={Mail} />
            <InfoGroup label="Contact Number" value={student.contact_number} icon={Phone} />
            <InfoGroup label="Complete Address" value={student.address} icon={MapPin} />
        </div>
        <div className="space-y-8">
            <InfoGroup label="Date of Birth" value={student.birthdate} icon={Calendar} />
            <InfoGroup label="Academic Program" value={student.program_name} icon={Book} />
            <InfoGroup label="Year Level" value={`Year ${student.year_level}`} icon={GraduationCap} />
            <InfoGroup label="Registration Date" value={new Date(student.created_at).toLocaleDateString()} icon={Clock} />
        </div>
    </div>
);

const AcademicPanel = ({ student }) => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100 flex items-center justify-between">
            <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Academic Status</p>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">
                    {student.academic_status || 'PROVISIONAL'}
                </h3>
            </div>
            <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-lg shadow-blue-100">
                <ShieldCheck className="w-8 h-8" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsBox label="Units Completed" value={student.units_completed || 0} color="blue" />
            <StatsBox label="General GPA" value={student.gpa || '0.00'} color="green" />
            <StatsBox label="Outstanding INC" value={student.inc_count || 0} color="amber" />
        </div>
    </div>
);

const EnrollmentPanel = ({ student }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        {student.enrollment_history?.length > 0 ? (
            <div className="divide-y divide-gray-50">
                {student.enrollment_history.map((e, i) => (
                    <div key={i} className="py-6 flex items-center justify-between hover:bg-gray-50/50 px-4 rounded-2xl transition-colors">
                        <div>
                            <p className="font-black text-gray-900 uppercase tracking-tight">{e.semester_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{e.academic_year}</p>
                        </div>
                        <div className="text-right">
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">
                                COMPLETED
                            </span>
                            <p className="text-xs font-bold text-gray-400 mt-2">{e.units} Units</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="py-20 text-center">
                <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Enrollment History Found</p>
            </div>
        )}
    </div>
);

const CreditsPanel = ({ student }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        {student.credited_subjects?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.credited_subjects.map((s, i) => (
                    <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="font-black text-gray-900 uppercase tracking-tight text-sm">{s.subject_code}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{s.subject_title}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-blue-600">{s.grade || 'CREDITED'}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="py-20 text-center">
                <Book className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Credited Subjects Recorded</p>
            </div>
        )}
    </div>
);

const InfoGroup = ({ label, value, icon: Icon }) => (
    <div className="flex gap-4">
        <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl h-fit">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-gray-900 leading-relaxed">{value || 'NOT PROVIDED'}</p>
        </div>
    </div>
);

const StatsBox = ({ label, value, color }) => {
    const colors = {
        blue: 'border-blue-100 bg-blue-50/20 text-blue-600',
        green: 'border-green-100 bg-green-50/20 text-green-600',
        amber: 'border-amber-100 bg-amber-50/20 text-amber-600'
    };
    return (
        <div className={`p-6 rounded-[32px] border-2 text-center ${colors[color]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
    );
};

export default RegistrarStudentDetail;
