import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../../api/scheduling';
import { Clock, AlertTriangle, CheckCircle2, BookOpen, LayoutGrid, Users, MapPin, ChevronRight } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Button from '../../../components/ui/Button';

const SchedulingReports = ({ activeTerm, onManageSection, onManageFaculty }) => {
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState('PENDING'); // PENDING, SECTIONS, FACULTY
    const [pendingSlots, setPendingSlots] = useState([]);
    const [sectionCompletion, setSectionCompletion] = useState([]);
    const [facultyLoad, setFacultyLoad] = useState([]);

    const fetchData = async () => {
        if (!activeTerm) return;
        try {
            setLoading(true);
            const [pendingRes, sectionRes, facultyRes] = await Promise.all([
                schedulingApi.getPendingSlots(activeTerm.id),
                schedulingApi.getSectionCompletion(activeTerm.id),
                schedulingApi.getFacultyLoadReport(activeTerm.id)
            ]);
            setPendingSlots(pendingRes.data);
            setSectionCompletion(sectionRes.data);
            setFacultyLoad(facultyRes.data);
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTerm]);

    if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {/* Report Selection Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button 
                    onClick={() => setReportType('PENDING')}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${reportType === 'PENDING' ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-white border-slate-100 hover:border-primary/50 text-slate-600'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reportType === 'PENDING' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                        <AlertTriangle size={18} className={reportType === 'PENDING' ? 'text-white' : ''} />
                    </div>
                    <div>
                        <div className={`text-xs font-black uppercase tracking-widest ${reportType === 'PENDING' ? 'text-white/70' : 'text-slate-400'}`}>All Pending</div>
                        <div className={`text-lg font-black ${reportType === 'PENDING' ? 'text-white' : 'text-slate-800'}`}>{pendingSlots.length} Slots</div>
                    </div>
                </button>

                <button 
                    onClick={() => setReportType('NEEDS_PROF')}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${reportType === 'NEEDS_PROF' ? 'bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]' : 'bg-white border-slate-100 hover:border-amber-500/50 text-slate-600'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reportType === 'NEEDS_PROF' ? 'bg-white/20' : 'bg-slate-100 text-amber-500'}`}>
                        <Users size={18} className={reportType === 'NEEDS_PROF' ? 'text-white' : ''} />
                    </div>
                    <div>
                        <div className={`text-xs font-black uppercase tracking-widest ${reportType === 'NEEDS_PROF' ? 'text-white/70' : 'text-slate-400'}`}>Needs Professor</div>
                        <div className={`text-lg font-black ${reportType === 'NEEDS_PROF' ? 'text-white' : 'text-slate-800'}`}>{pendingSlots.filter(s => !s.professor).length} Slots</div>
                    </div>
                </button>

                <button 
                    onClick={() => setReportType('SECTIONS')}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${reportType === 'SECTIONS' ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-white border-slate-100 hover:border-primary/50 text-slate-600'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reportType === 'SECTIONS' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                        <LayoutGrid size={18} className={reportType === 'SECTIONS' ? 'text-white' : ''} />
                    </div>
                    <div>
                        <div className={`text-xs font-black uppercase tracking-widest ${reportType === 'SECTIONS' ? 'text-white/70' : 'text-slate-400'}`}>Section Matrix</div>
                        <div className={`text-lg font-black ${reportType === 'SECTIONS' ? 'text-white' : 'text-slate-800'}`}>{sectionCompletion.filter(s => s.assigned === s.total).length}/{sectionCompletion.length} Complete</div>
                    </div>
                </button>

                <button 
                    onClick={() => setReportType('FACULTY')}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${reportType === 'FACULTY' ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-white border-slate-100 hover:border-primary/50 text-slate-600'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reportType === 'FACULTY' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                        <Users size={18} className={reportType === 'FACULTY' ? 'text-white' : ''} />
                    </div>
                    <div>
                        <div className={`text-xs font-black uppercase tracking-widest ${reportType === 'FACULTY' ? 'text-white/70' : 'text-slate-400'}`}>Workload</div>
                        <div className={`text-lg font-black ${reportType === 'FACULTY' ? 'text-white' : 'text-slate-800'}`}>{facultyLoad.filter(f => f.is_underloaded).length} Underloaded</div>
                    </div>
                </button>
            </div>

            {/* Report Content */}
            <Card className="shadow-sm border-slate-100 overflow-hidden">
                {reportType === 'PENDING' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Subject/Section</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Missing Elements</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingSlots.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-slate-400 italic">
                                            Excellent! No unassigned subjects found.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingSlots.map(slot => {
                                        const missing = [];
                                        if (!slot.professor) missing.push('Professor');
                                        if (!slot.room) missing.push('Room');
                                        if (slot.days.length === 0 || !slot.start_time) missing.push('Schedule (Time/Day)');
                                        
                                        return (
                                            <tr key={slot.id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-800">{slot.subject_code}</div>
                                                    <div className="text-[10px] font-bold text-primary uppercase tracking-tighter">{slot.section_name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {missing.map(m => (
                                                            <Badge key={m} variant="danger" className="text-[9px] font-black uppercase px-2 py-0.5">{m}</Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="neutral" className="text-[9px] font-black">{slot.component_type}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button 
                                                        size="xs" 
                                                        variant="ghost" 
                                                        icon={<ChevronRight size={14}/>}
                                                        onClick={() => onManageSection(slot.section)}
                                                    >
                                                        Fix Assignment
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportType === 'NEEDS_PROF' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-amber-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-700 border-b border-amber-100 italic">Critical: Missing Professor</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-700 border-b border-amber-100">Section</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-700 border-b border-amber-100">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-700 border-b border-amber-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingSlots.filter(s => !s.professor).length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-slate-400 italic">
                                            Success! All subjects have professors assigned.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingSlots.filter(s => !s.professor).map(slot => (
                                        <tr key={slot.id} className="group border-b border-slate-50 hover:bg-amber-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800">{slot.subject_code}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[200px]">{slot.subject_description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[11px] font-black text-amber-600 uppercase tracking-tight">{slot.section_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="neutral" className="text-[9px] font-black bg-amber-100 text-amber-700 border-amber-200">{slot.component_type}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    size="xs" 
                                                    variant="ghost" 
                                                    className="text-amber-600 hover:bg-amber-100"
                                                    icon={<ChevronRight size={14}/>}
                                                    onClick={() => onManageSection(slot.section)}
                                                >
                                                    Assign Prof
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportType === 'SECTIONS' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Section</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 text-center">Completion</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Progress Bar</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectionCompletion.map(section => {
                                    const percentage = (section.assigned / section.total) * 100;
                                    const isComplete = section.assigned === section.total;

                                    return (
                                        <tr key={section.section_id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800">{section.section_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-black ${isComplete ? 'text-success' : 'text-slate-700'}`}>
                                                    {section.assigned} / {section.total}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${isComplete ? 'bg-success' : 'bg-primary'}`} 
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400">{Math.round(percentage)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    size="xs" 
                                                    variant="ghost" 
                                                    icon={<ChevronRight size={14}/>}
                                                    onClick={() => onManageSection(section.section_id)}
                                                >
                                                    Configure
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportType === 'FACULTY' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Faculty Member</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 text-center">Load (Hrs)</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Target Efficiency</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facultyLoad.map(fac => {
                                    const percentage = Math.min((fac.current_hours / fac.target_hours) * 100, 100);
                                    return (
                                        <tr key={fac.professor_id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800">{fac.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={fac.status === 'FULL_TIME' ? 'primary' : 'warning'} className="text-[9px] font-black uppercase">
                                                    {fac.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-black text-slate-700">{fac.current_hours} <span className="text-[10px] text-slate-400">/ {fac.target_hours}</span></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${fac.is_underloaded ? 'bg-warning' : 'bg-success'}`} 
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    size="xs" 
                                                    variant="ghost" 
                                                    icon={<ChevronRight size={14}/>}
                                                    onClick={() => onManageFaculty(fac.professor_id)}
                                                >
                                                    Manage Load
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default SchedulingReports;
