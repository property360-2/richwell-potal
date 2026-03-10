import React, { useState, useEffect } from 'react';
import { Clock, CheckSquare, ShieldCheck, AlertCircle, ChevronRight, Info, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { schedulingApi } from '../../api/scheduling';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

const SchedulePicking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [approvedGrades, setApprovedGrades] = useState([]);
  const [sectionsMatrix, setSectionsMatrix] = useState([]);
  const [selectedSession, setSelectedSession] = useState('AM');
  const [subjectSections, setSubjectSections] = useState({}); // { subjectId: [sections] }
  const [selectedSections, setSelectedSections] = useState({}); // { subjectId: sectionId }
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const termRes = await api.get('terms/?is_active=true');
      const term = termRes.data.results?.[0] || termRes.data[0];
      setActiveTerm(term);

      if (term) {
        const enrollRes = await api.get(`students/enrollments/me/?term=${term.id}`);
        setEnrollment(enrollRes.data);

        const gradesRes = await api.get(`grades/advising/?term=${term.id}&advising_status=APPROVED`);
        const approved = gradesRes.data.results || [];
        setApprovedGrades(approved);

        if (enrollRes.data) {
          // Fetch matrix for regular students
          const matrixRes = await schedulingApi.getStatusMatrix({
            term_id: term.id,
            program_id: enrollRes.data.student_details?.program,
            year_level: enrollRes.data.year_level
          });
          setSectionsMatrix(matrixRes.data || []);

          // For irregular students, fetch sections for each subject
          if (!enrollRes.data.is_regular) {
              const sectionsMap = {};
              for (const grade of approved) {
                  const sRes = await api.get(`/api/sections/?term_id=${term.id}&subject_id=${grade.subject}`);
                  sectionsMap[grade.subject] = sRes.data.results || sRes.data;
              }
              setSubjectSections(sectionsMap);
          }
        }
      }
    } catch (err) {
      showToast('error', 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePickRegular = async () => {
    if (!window.confirm(`Are you sure you want to pick the ${selectedSession === 'AM' ? 'Morning' : 'Afternoon'} session?`)) return;
    try {
      setIsProcessing(true);
      const res = await schedulingApi.pickRegular({
        term_id: activeTerm.id,
        session: selectedSession
      });
      showToast('success', res.data.message);
      if (res.data.redirected) {
          showToast('info', 'Preferred session was full; you were assigned to the available session.');
      }
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to pick schedule');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickIrregular = async () => {
    const selections = Object.entries(selectedSections).map(([subjectId, sectionId]) => ({
        subject_id: parseInt(subjectId),
        section_id: parseInt(sectionId)
    }));

    if (selections.length < approvedGrades.length) {
        return showToast('error', 'Please select a section for all subjects');
    }

    try {
        setIsProcessing(true);
        await schedulingApi.pickIrregular({
            term_id: activeTerm.id,
            selections
        });
        showToast('success', 'Schedule picked successfully');
        fetchData();
    } catch (err) {
        showToast('error', err.response?.data?.error || 'Failed to pick schedules');
    } finally {
        setIsProcessing(false);
    }
  };

  if (loading && !enrollment) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!enrollment || enrollment.advising_status !== 'APPROVED') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
        <ShieldCheck size={64} className="text-slate-100 mb-2 shadow-2xl rounded-full p-4 bg-slate-50" />
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Advising Approval Required</h2>
        <p className="text-slate-500 max-w-sm font-medium">You must have an approved subject advising list from the Program Head before you can proceed with schedule picking.</p>
        <Button className="mt-4 px-8 rounded-full font-bold" onClick={() => window.location.href = '/student/advising'}>Go to Advising</Button>
      </div>
    );
  }

  const isRegular = enrollment.is_regular;

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Schedule Picking</h1>
          <p className="text-slate-500 mt-2 font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
            <Badge variant="primary" className="rounded-md px-3">{activeTerm?.code}</Badge>
            <span>Current Term Timetable Selection</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Approved Subjects */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Approved Subjects List" className="border-slate-200 shadow-sm">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {approvedGrades.map(grade => (
                <div key={grade.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="font-black text-slate-800 uppercase text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                        {grade.subject_details?.code}
                    </div>
                    <Badge variant="ghost" size="xs" className="text-[10px] font-black bg-white shadow-sm border border-slate-100">{grade.subject_details?.total_units} UNITS</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold leading-tight mt-1.5 uppercase opacity-70">{grade.subject_details?.description}</div>
                </div>
              ))}
              {approvedGrades.length === 0 && (
                <div className="text-center py-10 text-slate-300 font-black uppercase text-xs tracking-widest bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    No subjects approved
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
             <div className="flex gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Info size={24} className="text-blue-400" />
                </div>
                <div>
                    <h4 className="font-black uppercase text-base tracking-tight mb-1">Session Capacity</h4>
                    <p className="text-xs opacity-60 font-medium leading-relaxed">
                        Sections are capped at 40 students. If your preferred session is full, you will be automatically redirected to the next available slot.
                    </p>
                </div>
             </div>
          </Card>

          {enrollment.enrollment_status === 'ENROLLED' && (
             <Card className="bg-success-600 border-none shadow-success-100 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="flex gap-4 relative z-10 text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckSquare size={24} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase text-base tracking-tight mb-1 font-bold">Registration Complete</h4>
                        <p className="text-xs opacity-90 font-medium leading-relaxed italic">
                            You are now officially enrolled in all subjects! Your schedule is locked.
                        </p>
                    </div>
                </div>
             </Card>
          ) }
        </div>

        {/* Right Column: Picking UI */}
        <div className="lg:col-span-8">
          {isRegular ? (
            <div className="space-y-6">
              <div className="bg-white border-2 border-slate-100 rounded-[40px] shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="p-10 border-b border-slate-100 bg-slate-50/30">
                    <Badge variant="info" className="mb-4 font-black uppercase tracking-widest text-[10px]">Regular Student Flow</Badge>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Assign Your Session</h3>
                    <p className="text-slate-500 text-base font-medium">Choose your preferred session block to automatically join a section.</p>
                </div>

                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {['AM', 'PM'].map(session => {
                        const isSelected = selectedSession === session;
                        const available = sectionsMatrix.filter(s => s.session === session && !s.is_full);
                        const isSessionFull = available.length === 0;

                        return (
                            <div 
                                key={session}
                                onClick={() => !isSessionFull && setSelectedSession(session)}
                                className={`group relative p-8 rounded-[32px] border-4 transition-all duration-300 flex flex-col items-center text-center ${
                                    isSelected 
                                    ? 'border-blue-600 bg-blue-50/30 shadow-2xl shadow-blue-100' 
                                    : isSessionFull ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-40 grayscale' : 'border-slate-50 bg-white hover:border-slate-200 hover:shadow-lg'
                                }`}
                            >
                                <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'
                                }`}>
                                    <Clock size={40} />
                                </div>
                                
                                <h4 className={`text-3xl font-black tracking-tight ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>
                                    {session === 'AM' ? 'MORNING' : 'AFTERNOON'}
                                </h4>
                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 mb-6">
                                    {session === 'AM' ? '7:00 AM - 12:00 PM' : '1:00 PM - 6:00 PM'}
                                </div>

                                <div className="flex flex-wrap justify-center gap-2">
                                    {sectionsMatrix.filter(s => s.session === session).map(s => (
                                        <Badge key={s.id} variant={s.is_full ? 'error' : 'neutral'} className="text-[10px] font-black px-3 rounded-lg py-1">
                                            {s.name} • {s.is_full ? 'FULL' : `${s.current}/${s.max}`}
                                        </Badge>
                                    ))}
                                </div>

                                {isSessionFull && (
                                    <div className="mt-6">
                                        <Badge variant="error" className="font-black px-6 py-1 text-[11px] rounded-full">FULLY OCCUPIED</Badge>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckSquare size={16} className="text-success-500" />
                        Selected: <span className="text-slate-800 font-black">{selectedSession === 'AM' ? 'Morning' : 'Afternoon'} Block</span>
                    </div>
                    <Button 
                        variant="primary" 
                        size="lg" 
                        className="px-12 rounded-full font-black text-lg h-14 shadow-xl shadow-blue-500/20 active:scale-95 transition-transform"
                        loading={isProcessing}
                        onClick={handlePickRegular}
                    >
                        LOCK IN & ENROLL
                    </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
                <div className="bg-white border-2 border-slate-100 rounded-[40px] shadow-xl shadow-slate-100/50 overflow-hidden">
                    <div className="p-10 border-b border-slate-100 bg-slate-50/30">
                        <Badge variant="warning" className="mb-4 font-black uppercase tracking-widest text-[10px]">Irregular Selection Flow</Badge>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Build Your Timetable</h3>
                        <p className="text-slate-500 text-base font-medium">Select a section for each of your approved subjects below.</p>
                    </div>

                    <div className="p-10 space-y-8">
                        {approvedGrades.map(grade => (
                            <div key={grade.id} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-500">
                                        {grade.subject_details?.code}
                                    </div>
                                    <h4 className="font-black text-slate-800 uppercase text-sm">{grade.subject_details?.description}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-11">
                                    {(subjectSections[grade.subject] || []).map(section => {
                                        const isSelected = selectedSections[grade.subject] === section.id;
                                        const isFull = section.student_count >= section.max_students;

                                        return (
                                            <div 
                                                key={section.id}
                                                onClick={() => !isFull && setSelectedSections({...selectedSections, [grade.subject]: section.id})}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative group ${
                                                    isSelected 
                                                    ? 'border-blue-600 bg-blue-50/20 shadow-lg' 
                                                    : isFull ? 'border-slate-50 bg-slate-50 opacity-40 cursor-not-allowed' : 'border-slate-100 hover:border-slate-200'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`font-black text-xs ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>{section.name}</span>
                                                    <Badge variant={section.session === 'AM' ? 'info' : 'warning'} size="xs" className="text-[8px] font-black">{section.session}</Badge>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                                                    <span>Slot</span>
                                                    <span className={isFull ? 'text-red-500' : ''}>{section.student_count}/{section.max_students}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md border-2 border-white">
                                                        <CheckSquare size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(subjectSections[grade.subject] || []).length === 0 && (
                                        <div className="col-span-full py-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl">
                                            No sections available for this subject
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={16} className="text-blue-500" />
                            Selection: <span className="text-slate-800 font-black">{Object.keys(selectedSections).length} / {approvedGrades.length} Subjects</span>
                        </div>
                        <Button 
                            variant="primary" 
                            size="lg" 
                            className="px-12 rounded-full font-black text-lg h-14 shadow-xl shadow-blue-500/20"
                            loading={isProcessing}
                            onClick={handlePickIrregular}
                            disabled={Object.keys(selectedSections).length < approvedGrades.length}
                        >
                            FINALIZE SELECTION
                        </Button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePicking;
