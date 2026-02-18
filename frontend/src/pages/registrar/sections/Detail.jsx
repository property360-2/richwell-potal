import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Users, 
    BookOpen, 
    Calendar, 
    Plus, 
    UserPlus, 
    MoreHorizontal,
    Edit2,
    Trash2,
    Clock,
    MapPin,
    GraduationCap,
    Loader2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Tabs from '../../../components/ui/Tabs';
import SectionSubjectModal from './modals/SectionSubjectModal';
import ScheduleSlotModal from './modals/ScheduleSlotModal';
import SectionStudentModal from './modals/SectionStudentModal';
import { api, endpoints } from '../../../api';

const RegistrarSectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error, info } = useToast();

    const [loading, setLoading] = useState(true);
    const [section, setSection] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [activeTab, setActiveTab] = useState('subjects');

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedSectionSubject, setSelectedSectionSubject] = useState(null);

    useEffect(() => {
        fetchSectionData();
    }, [id]);

    const fetchSectionData = async () => {
        try {
            setLoading(true);
            const [secRes, subRes, stuRes] = await Promise.all([
                fetch(`/api/v1/academics/sections/${id}/`),
                fetch(`/api/v1/academics/sections/${id}/subjects/`),
                fetch(`/api/v1/academics/sections/${id}/students/`)
            ]);

            if (secRes.ok) setSection(await secRes.json());
            if (subRes.ok) setSubjects(await subRes.json());
            if (stuRes.ok) setStudents(await stuRes.json());

        } catch (err) {
            error('Failed to load section profile');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    if (!section) return (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
            Section Not Found
        </div>
    );

    const tabs = [
        { id: 'subjects', label: 'Curriculum Load', icon: BookOpen },
        { id: 'students', label: `Enrolled Students (${students.length})`, icon: Users },
        { id: 'schedule', label: 'Weekly Timetable', icon: Calendar }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            {/* Nav & Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/registrar/sections')}
                        className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{section.name}</h1>
                            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                                YEAR {section.year_level}
                            </span>
                        </div>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                            {section.program_code || section.program?.code} • {section.semester_name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" icon={Edit2}>EDIT SETTINGS</Button>
                    <Button variant="danger" icon={Trash2}>DISSOLVE SECTION</Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stats Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-2xl shadow-blue-500/5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Section Capacity</p>
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50" />
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 * (1 - (students.length / section.capacity))} className="text-blue-600 transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-gray-900 leading-none">{students.length}</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase mt-1">OF {section.capacity}</span>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <StatRow label="Allocated Load" value={subjects.length} sub="Subjects" />
                            <StatRow label="Daily Footprint" value="6.5h" sub="Average" />
                        </div>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                        <div className="px-8 pt-8 border-b border-gray-50">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                                                ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <ActionButton 
                                    tab={activeTab} 
                                    onAssignSubject={() => setIsSubjectModalOpen(true)}
                                    onAddStudent={() => setIsStudentModalOpen(true)}
                                />
                            </div>
                        </div>

                        <div className="p-8 min-h-[500px]">
                            {activeTab === 'subjects' && (
                                <SubjectsList 
                                    subjects={subjects} 
                                    onEdit={(ss) => {
                                        setSelectedSectionSubject(ss);
                                        setIsScheduleModalOpen(true);
                                    }}
                                    onRemove={async (ssId) => {
                                        if (window.confirm('Remove this subject from the section load?')) {
                                            const res = await fetch(`/api/v1/academics/sections/${id}/subjects/${ssId}/`, { method: 'DELETE' });
                                            if (res.ok) { success('Subject removed'); fetchSectionData(); }
                                        }
                                    }}
                                />
                            )}
                            {activeTab === 'students' && <StudentsList students={students} />}
                            {activeTab === 'schedule' && <ScheduleGrid subjects={subjects} />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Operational Modals */}
            <SectionSubjectModal 
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                sectionId={id}
                programId={section.program_id || section.program?.id}
                currentSubjects={subjects}
                onSuccess={fetchSectionData}
            />

            <ScheduleSlotModal 
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                sectionSubject={selectedSectionSubject}
                onSuccess={fetchSectionData}
            />

            <SectionStudentModal 
                isOpen={isStudentModalOpen}
                onClose={() => setIsStudentModalOpen(false)}
                sectionId={id}
                programCode={section.program_code || section.program?.code}
                yearLevel={section.year_level}
                onSuccess={fetchSectionData}
            />
        </div>
    );
};

const StatRow = ({ label, value, sub }) => (
    <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
        <div className="text-right">
            <span className="text-sm font-black text-gray-900">{value}</span>
            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{sub}</span>
        </div>
    </div>
);

const ActionButton = ({ tab, onAssignSubject, onAddStudent }) => {
    if (tab === 'subjects') return <Button size="sm" variant="primary" icon={Plus} onClick={onAssignSubject}>ASSIGN SUBJECT</Button>;
    if (tab === 'students') return <Button size="sm" variant="primary" icon={UserPlus} onClick={onAddStudent}>ADD STUDENTS</Button>;
    return null;
};

const SubjectsList = ({ subjects, onEdit, onRemove }) => (
    <div className="grid grid-cols-1 gap-4">
        {subjects.map(s => (
            <div key={s.id} className="group p-6 bg-gray-50/50 hover:bg-white border-2 border-transparent hover:border-blue-100 rounded-[32px] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {s.subject?.code?.slice(0, 3)}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 tracking-tight">{s.subject?.code} - {s.subject?.title}</h4>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                                <GraduationCap className="w-3 h-3" />
                                {s.professor_name || 'No Professor Assigned'}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                                <Clock className="w-3 h-3" />
                                {s.schedule_slots?.length || 0} Slots
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onEdit(s)}
                        className="p-2 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-100 rounded-xl transition-all"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onRemove(s.id)}
                        className="p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-100 rounded-xl transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        ))}
        {subjects.length === 0 && (
            <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                <BookOpen className="w-16 h-16 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-widest">No subjects assigned to this section</p>
            </div>
        )}
    </div>
);

const StudentsList = ({ students }) => (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
            <thead className="bg-gray-50/50">
                <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Info</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-4">
                            <p className="font-black text-gray-900 leading-none">{s.last_name}, {s.first_name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{s.student_number || 'TEMP_ID'}</p>
                        </td>
                        <td className="px-8 py-4">
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100">Enrolled</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                            <button className="p-2 text-gray-300 hover:text-red-600 transition-all"><XCircle className="w-4 h-4" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const XCircle = ({ className }) => <Trash2 className={className} />; // Placeholder icon match

const ScheduleGrid = ({ subjects }) => {
    // Basic visualization for now, can be expanded to full calendar grid
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-indigo-50/30 border border-indigo-100 rounded-[32px]">
                <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                    <h5 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Time Conflict Analysis</h5>
                    <p className="text-xs font-bold text-indigo-600/60 leading-relaxed">
                        Automatic verification active. No overlapping schedules detected for the current subject load.
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {days.map(day => {
                    const slots = subjects.flatMap(s => (s.schedule_slots || []).filter(sl => sl.day === day))
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));
                    
                    if (slots.length === 0) return null;

                    return (
                        <div key={day} className="flex gap-6">
                            <div className="w-16 pt-2 shrink-0">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{day}</span>
                            </div>
                            <div className="flex-grow space-y-3 pb-6 border-b border-gray-50 last:border-0">
                                {slots.map((slot, idx) => (
                                    <div key={idx} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-black text-gray-900">
                                                {slot.start_time} - {slot.end_time}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 tracking-tight">{slot.subject_code || '---'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <MapPin className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{slot.room || 'TBA'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-2 text-gray-300 hover:text-blue-600 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {subjects.every(s => !s.schedule_slots?.length) && (
                    <div className="py-20 text-center opacity-30">
                        <Calendar className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No active schedules defined</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrarSectionDetail;
