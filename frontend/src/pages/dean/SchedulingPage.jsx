import React, { useState, useEffect } from 'react';
import { Clock, Users, BookOpen, Calendar, MapPin, AlertTriangle, CheckCircle2, Search, Edit2, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { schedulingApi } from '../../api/scheduling';
import { facultyApi } from '../../api/faculty';
import { termsApi } from '../../api/terms';
import { facilitiesApi } from '../../api/facilities';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';

const SchedulingPage = () => {
    const [professors, setProfessors] = useState([]);
    const [selectedProf, setSelectedProf] = useState(null);
    const [profSchedules, setProfSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rooms, setRooms] = useState([]);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        days: [],
        start_time: '',
        end_time: '',
        room: ''
    });

    const { showToast } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const termRes = await termsApi.getTerms({ is_active: true });
            const term = termRes.data.results?.[0] || termRes.data[0];
            setActiveTerm(term);

            const profRes = await facultyApi.getAll();
            setProfessors(profRes.data.results || profRes.data);

            const roomRes = await facilitiesApi.getRooms();
            setRooms(roomRes.data.results || roomRes.data);
        } catch (err) {
            showToast('error', 'Failed to load initial data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchProfSchedules = async (profId) => {
        if (!activeTerm) return;
        try {
            const res = await schedulingApi.getSchedules({ professor_id: profId, term_id: activeTerm.id });
            setProfSchedules(res.data.results || res.data);
        } catch (err) {
            showToast('error', 'Failed to load professor schedules');
        }
    };

    useEffect(() => {
        if (selectedProf) {
            fetchProfSchedules(selectedProf.id);
        }
    }, [selectedProf, activeTerm]);

    const handleOpenSetup = (sched) => {
        setSelectedSchedule(sched);
        setFormData({
            days: sched.days || [],
            start_time: sched.start_time ? sched.start_time.substring(0, 5) : '',
            end_time: sched.end_time ? sched.end_time.substring(0, 5) : '',
            room: sched.room || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveSchedule = async () => {
        if (!formData.start_time || !formData.end_time || formData.days.length === 0) {
            return showToast('error', 'Please fill in all required fields');
        }

        try {
            setIsSaving(true);
            await schedulingApi.assign({
                term_id: activeTerm.id,
                section_id: selectedSchedule.section,
                subject_id: selectedSchedule.subject,
                professor_id: selectedProf.id,
                room_id: formData.room || null,
                days: formData.days,
                start_time: formData.start_time,
                end_time: formData.end_time
            });
            showToast('success', 'Schedule updated successfully');
            setIsModalOpen(false);
            fetchProfSchedules(selectedProf.id);
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Conflict detected or failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day) 
                ? prev.days.filter(d => d !== day) 
                : [...prev.days, day]
        }));
    };

    const filteredProfs = professors.filter(p => 
        p.user?.get_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !activeTerm) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[calc(100vh-100px)] animate-in fade-in duration-500">
            {/* Professor Sidebar */}
            <div className="lg:col-span-4 space-y-6 flex flex-col">
                <div className="flex flex-col gap-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Faculty Timetable</h2>
                    <Input 
                        placeholder="Search professor or ID..." 
                        icon={<Search size={18} />} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white border-slate-200 shadow-sm"
                    />
                </div>

                <div className="overflow-y-auto flex-1 space-y-3 pr-2 scrollbar-thin max-h-[70vh]">
                    {filteredProfs.map(prof => (
                        <div 
                            key={prof.id}
                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 flex items-center gap-4 ${
                                selectedProf?.id === prof.id 
                                ? 'border-blue-600 bg-blue-50/40 shadow-blue-100 shadow-md ring-1 ring-blue-600/10' 
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                            onClick={() => setSelectedProf(prof)}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${
                                selectedProf?.id === prof.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {prof.user?.first_name?.[0]}{prof.user?.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 uppercase tracking-tight truncate">
                                    {prof.user?.first_name} {prof.user?.last_name}
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    {prof.employee_id} • {prof.department}
                                </div>
                            </div>
                            <ChevronRight size={16} className={`${selectedProf?.id === prof.id ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>
                    ))}
                    
                    {filteredProfs.length === 0 && !loading && (
                        <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs tracking-widest">
                            No faculty found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Scheduling Area */}
            <div className="lg:col-span-8 h-full flex flex-col">
                {selectedProf ? (
                    <div className="space-y-6 flex flex-col h-full animate-in slide-in-from-right duration-500">
                        <div className="flex justify-between items-end pb-4 border-b border-slate-100">
                            <div>
                                <Badge variant="primary" className="mb-2 uppercase text-[10px] font-black tracking-widest px-3 py-1">
                                    {activeTerm?.code} Schedule
                                </Badge>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    {selectedProf.user?.get_full_name}'s Loading
                                </h3>
                                <p className="text-slate-500 text-sm font-medium">Configure subject time slots and room assignments</p>
                            </div>
                            <Button variant="ghost" className="bg-slate-50" icon={<RefreshCw size={18} />} onClick={() => fetchProfSchedules(selectedProf.id)}>
                                Sync
                            </Button>
                        </div>

                        <div className="flex-1 space-y-4 pt-4 overflow-y-auto pr-2 scrollbar-thin">
                            {profSchedules.length > 0 ? (
                                profSchedules.map(sched => (
                                    <div key={sched.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 hover:border-blue-200 transition-all group shadow-sm">
                                        <div className="flex flex-col md:flex-row gap-8">
                                            {/* Subject Info */}
                                            <div className="md:w-5/12">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Badge variant="neutral" className="bg-slate-900 text-white border-none text-[9px] font-black uppercase rounded-lg px-3">
                                                        {sched.section_name}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-slate-200 text-slate-500 text-[9px] font-black uppercase px-2">
                                                        {sched.component_type === 'LEC' ? 'LEC' : 'LAB'}
                                                    </Badge>
                                                </div>
                                                <h4 className="font-black text-xl text-slate-800 leading-tight uppercase group-hover:text-blue-600 transition-colors">
                                                    {sched.subject_code}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed italic">{sched.subject_description}</p>
                                            </div>

                                            {/* Schedule Details Dashboard */}
                                            <div className="md:w-7/12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 transition-colors hover:bg-white group-hover:border-blue-100">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Days</div>
                                                        <div className="text-sm font-black text-slate-700">
                                                            {sched.days.length > 0 ? sched.days.join(', ') : 'Not Set'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 transition-colors hover:bg-white group-hover:border-blue-100">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                                                        <Clock size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Slot</div>
                                                        <div className="text-sm font-black text-slate-700">
                                                            {sched.start_time ? `${sched.start_time.substring(0, 5)} - ${sched.end_time.substring(0, 5)}` : 'TBA'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 col-span-1 sm:col-span-2 transition-colors hover:bg-white group-hover:border-blue-100">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Room Resource</div>
                                                        <div className="text-sm font-black text-slate-700">{sched.room_name || 'TO BE ASSIGNED'}</div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="xs" 
                                                        className="text-blue-600 h-8 font-black uppercase text-[10px]" 
                                                        icon={<Edit2 size={12}/>}
                                                        onClick={() => handleOpenSetup(sched)}
                                                    >
                                                        Modify
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 flex flex-col items-center text-center bg-slate-50/30 rounded-[40px] border-4 border-dashed border-slate-100 m-4">
                                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
                                        <BookOpen size={40} />
                                    </div>
                                    <h4 className="font-black text-slate-300 uppercase tracking-[0.2em] text-lg">No Faculty Loads</h4>
                                    <p className="text-sm text-slate-400 max-w-[240px] mt-2 font-medium">This professor has not been assigned any subject loads for the current term.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-[48px] border-2 border-slate-100 shadow-inner overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -ml-32 -mb-32"></div>
                        
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl flex items-center justify-center mx-auto mb-8 border border-slate-50">
                                <Users size={40} className="text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800">Select Faculty</h3>
                            <p className="max-w-[280px] mt-4 text-sm font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">
                                Choose a professor from the roster to manage their teaching timetable and room assignments.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Setup Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Timetable Assignment"
                size="md"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Subject & Section</div>
                            <div className="font-black text-lg">{selectedSchedule?.subject_code} — {selectedSchedule?.section_name}</div>
                        </div>
                        <Badge variant="info" className="bg-blue-600 border-none font-black">{selectedSchedule?.component_type}</Badge>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-700 uppercase tracking-tight">Select Days</label>
                        <div className="flex flex-wrap gap-2">
                            {['M', 'T', 'W', 'TH', 'F', 'S'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all border-2 ${
                                        formData.days.includes(day)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Start Time"
                            type="time"
                            value={formData.start_time}
                            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        />
                        <Input 
                            label="End Time"
                            type="time"
                            value={formData.end_time}
                            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        />
                    </div>

                    <Select 
                        label="Room Assignment (Optional)"
                        placeholder="Automatic / TBA"
                        value={formData.room}
                        onChange={(e) => setFormData({...formData, room: e.target.value})}
                        options={rooms.map(r => ({
                            value: r.id,
                            label: `${r.name} (${r.room_type} — Cap: ${r.capacity})`
                        }))}
                    />

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                        <Info size={18} className="text-blue-600 shrink-0" />
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                            The system will automatically validate conflicts for the professor, section, and room upon saving.
                        </p>
                    </div>

                    <div className="flex gap-3 justify-end mt-8">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" loading={isSaving} onClick={handleSaveSchedule}>Publish Schedule</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SchedulingPage;
