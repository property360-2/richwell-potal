import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
    BookOpen, 
    List, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Filter, 
    ChevronDown, 
    X, 
    GraduationCap,
    ArrowRight,
    Loader2,
    Search,
    Download,
    PartyPopper,
    Calendar
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SEO from '../../components/shared/SEO';
import { useEnrollmentData, useEnrollSubjects } from '../../hooks/useEnrollment';

const SubjectEnrollmentPage = () => {
    const { user } = useAuth();
    const { success, error, warning } = useToast();
    const navigate = useNavigate();



    const [selectionList, setSelectionList] = useState([]);
    const [filters, setFilters] = useState({ yearLevel: '', semester: '', search: '' });
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [summaryTab, setSummaryTab] = useState('list'); // 'list' or 'schedule'

    const { data: enrollmentData, isLoading: loading, error: queryError } = useEnrollmentData();
    const { mutate: enroll, isPending: submitting } = useEnrollSubjects();

    const data = enrollmentData || {
        recommendedSubjects: [],
        availableSubjects: [],
        enrolledSubjects: [],
        maxUnits: 30,
        enrollmentStatus: null,
        activeSemester: null
    };

    useEffect(() => {
        if (queryError) {
            error('Failed to load enrollment data');
            console.error(queryError);
        }
    }, [queryError]);


    const totalUnits = useCallback(() => {
        const selectionUnits = selectionList.reduce((sum, item) => sum + item.subject.units, 0);
        const enrolledUnits = data.enrolledSubjects.reduce((sum, s) => sum + (s.units || 0), 0);
        return selectionUnits + enrolledUnits;
    }, [selectionList, data.enrolledSubjects]);

    // Helper to parse "08:00 AM" to minutes for comparison
    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    const hasScheduleConflict = (newSection, currentSelection) => {
        if (!newSection.schedule || newSection.schedule.length === 0) return null;

        for (const item of currentSelection) {
            const existingSection = item.section;
            if (!existingSection.schedule) continue;

            for (const newSlot of newSection.schedule) {
                for (const existingSlot of existingSection.schedule) {
                    if (newSlot.day === existingSlot.day) {
                        const newStart = parseTimeToMinutes(newSlot.start_time);
                        const newEnd = parseTimeToMinutes(newSlot.end_time);
                        const existingStart = parseTimeToMinutes(existingSlot.start_time);
                        const existingEnd = parseTimeToMinutes(existingSlot.end_time);

                        // Overlap if (StartA < EndB) and (EndA > StartB)
                        if (newStart < existingEnd && newEnd > existingStart) {
                            return {
                                subjectCode: item.subject.code,
                                slot: `${existingSlot.day} ${existingSlot.start_time}-${existingSlot.end_time}`
                            };
                        }
                    }
                }
            }
        }
        return null;
    };

    const addToList = (subject, sectionId) => {
        if (!sectionId) {
            warning('Please select a section first');
            return;
        }

        if (selectionList.some(item => item.subject.id === subject.id)) {
            error('Subject already in selection list');
            return;
        }

        if (subject.can_enroll === false || subject.prerequisites_met === false) {
            error(subject.enrollment_blocked_reason || subject.enrollment_message || 'Contact Registrar');
            return;
        }

        if (totalUnits() + subject.units > data.maxUnits) {
            error(`Unit limit exceeded (${totalUnits() + subject.units} > ${data.maxUnits})`);
            return;
        }

        const section = subject.sections.find(s => s.id === sectionId);
        
        // Check for schedule conflicts
        const conflict = hasScheduleConflict(section, selectionList);
        if (conflict) {
            error(`Schedule Conflict: This section overlaps with ${conflict.subjectCode} (${conflict.slot})`);
            return;
        }

        setSelectionList(prev => [...prev, { subject, section }]);
        success(`${subject.code} added to your selection list`);
    };

    const removeFromList = (subjectId) => {
        setSelectionList(prev => prev.filter(item => item.subject.id !== subjectId));
    };

    const finalizeEnrollment = () => {
        const payload = {
            enrollments: selectionList.map(item => ({
                subject: item.subject.id,
                section: item.section.id
            }))
        };
        
        enroll(payload, {
            onSuccess: () => {
                success('🎉 OFFICIALLY ENROLLED! Your subjects have been secured.');
                setSelectionList([]);
                setIsSummaryOpen(false);
                setTimeout(() => navigate('/student/dashboard'), 2000);
            },
            onError: (err) => {
                // If the error has detailed results (from BulkEnrollSubjectView), find the specific failing subject
                const detailedError = err.data?.results?.find(r => r.status === 'error')?.message;
                error(detailedError || err.message || 'Submission failed');
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    // Eligibility logic
    const validStatuses = ['ACTIVE', 'ENROLLED', 'ADMITTED', 'PENDING', 'COMPLETED'];
    const isApproved = user?.student_number && validStatuses.includes(data.enrollmentStatus);
    const hasEnrolled = data.enrolledSubjects.length > 0;

    let enrollmentExpired = false;
    if (data.activeSemester?.enrollment_end_date) {
        const now = new Date();
        const end = new Date(data.activeSemester.enrollment_end_date);
        if (now > end) enrollmentExpired = true;
    }

    if (!isApproved) return <AdmissionPendingView />;
    if (hasEnrolled) return <EnrolledSubjectsView subjects={data.enrolledSubjects} />;
    if (enrollmentExpired) return <EnrollmentEndedView semester={data.activeSemester?.name} />;

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 lg:py-12 animate-in fade-in duration-700">
            <SEO title="Subject Enrollment" description="Personalize your academic load for the upcoming term." />
            
            <div className="flex flex-col gap-10 relative pb-32">
                {/* Main Content Area */}
                <div className="w-full max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-10">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                Enlistment Portal
                            </span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{data.activeSemester?.name}</span>
                            {data.studentProfile && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200">
                                    Section: {data.studentProfile.section_name} • {data.studentProfile.program_code}
                                </span>
                            )}
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Subject Enrollment</h1>
                        <p className="text-gray-500 font-medium mt-2">Personalize your academic load for the upcoming term.</p>
                    </header>

                    {/* Compact Filters Toolbar */}
                    <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-100/20 flex flex-wrap lg:flex-nowrap gap-4 mb-12 items-center">
                        <div className="flex-grow min-w-[200px] relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by Code or Title..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-bold text-gray-600 focus:bg-white focus:border-blue-100 transition-all"
                            />
                        </div>
                        <div className="flex gap-4 w-full lg:w-auto">
                            <select 
                                value={filters.yearLevel}
                                onChange={(e) => setFilters(prev => ({ ...prev, yearLevel: e.target.value }))}
                                className="flex-1 lg:w-40 px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-xs font-black uppercase tracking-widest text-gray-500 focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Mixed Levels</option>
                                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                            <select 
                                value={filters.semester}
                                onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                                className="flex-1 lg:w-40 px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-xs font-black uppercase tracking-widest text-gray-500 focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Semesters</option>
                                <option value="1">1st Sem</option>
                                <option value="2">2nd Sem</option>
                                <option value="3">Summer</option>
                            </select>
                            <button 
                                onClick={() => setFilters({ yearLevel: '', semester: '', search: '' })}
                                className="p-4 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Subjects Grid */}
                    <div className="space-y-16">

                        <SubjectSection 
                            key="curriculum-picks"
                            title="Curriculum Picks" 
                            subtitle="Standard subjects based on your year level"
                            subjects={data.recommendedSubjects.filter(s => 
                                (!filters.yearLevel || s.year_level == filters.yearLevel) &&
                                (!filters.semester || s.semester_number == filters.semester) &&
                                (!filters.search || s.code.toLowerCase().includes(filters.search.toLowerCase()) || s.title.toLowerCase().includes(filters.search.toLowerCase()))
                            )} 
                            onAdd={addToList}
                            selectionList={selectionList}
                        />
                    </div>
                </div>
            </div>

            {/* Unified Floating Selection Toggle */}
            <AnimatePresence>
                {selectionList.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
                    >
                        <button 
                            onClick={() => setIsSummaryOpen(true)}
                            className="w-full bg-gray-900 text-white p-5 rounded-[28px] shadow-2xl flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                        <List className="w-5 h-5" />
                                    </div>
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900">
                                        {selectionList.length}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">Review Selection</div>
                                    <div className="text-sm font-bold">{totalUnits()} Units Total</div>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-500" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Selection Summary Drawer */}
            <Modal
                isOpen={isSummaryOpen}
                onClose={() => setIsSummaryOpen(false)}
                title="Enlistment Summary"
                size="lg"
                actions={[
                    { label: 'Add More', onClick: () => setIsSummaryOpen(false) },
                    { label: 'Finalize Now', variant: 'primary', onClick: finalizeEnrollment, disabled: submitting || totalUnits() > data.maxUnits }
                ]}
            >
                <div className="space-y-6">
                    <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Total Credit Load</span>
                            <span className="text-2xl font-black text-blue-700">{totalUnits()} <span className="text-xs opacity-60">/ {data.maxUnits}</span></span>
                        </div>
                        <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${totalUnits() > data.maxUnits ? 'bg-red-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min((totalUnits() / data.maxUnits) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                        <button
                            onClick={() => setSummaryTab('list')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                summaryTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <List className="w-4 h-4" /> Selected Subjects
                        </button>
                        <button
                            onClick={() => setSummaryTab('schedule')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                summaryTab === 'schedule' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Calendar className="w-4 h-4" /> Weekly Schedule
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {summaryTab === 'list' ? (
                            <motion.div 
                                key="list-view"
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-3"
                            >
                                {selectionList.map((item) => (
                                    <div key={item.subject.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                                                <GraduationCap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.subject.code}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{item.subject.title}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest">{item.section.name}</span>
                                            <button onClick={() => removeFromList(item.subject.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="schedule-view"
                                initial={{ opacity: 0, x: 10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -10 }}
                            >
                                <SchedulePreview selectionList={selectionList} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Modal>
        </div>
    );
};

// Sub-components for views
const SubjectSection = ({ title, subtitle, subjects, onAdd, selectionList }) => {
    // Group subjects by Year and then by Semester
    const groupData = () => {
        const groups = {};
        subjects.forEach(s => {
            const year = s.year_level || 'N/A';
            const sem = s.semester_number || 'General';
            const yearLabel = year === 'N/A' ? 'Other Regular Subjects' : `Year Level ${year}`;
            let semLabel = `Semester ${sem}`;
            if (sem == 1) semLabel = 'FIRST SEMESTER';
            else if (sem == 2) semLabel = 'SECOND SEMESTER';
            else if (sem == 3 || sem === 'Summer') semLabel = 'SUMMER SESSION';

            if (!groups[yearLabel]) groups[yearLabel] = {};
            if (!groups[yearLabel][semLabel]) groups[yearLabel][semLabel] = [];
            groups[yearLabel][semLabel].push(s);
        });
        return groups;
    };

    const groupedSubjects = groupData();
    const sortedYears = Object.keys(groupedSubjects).sort();

    return (
        <section>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
                </div>
                <span className="px-4 py-1 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">{subjects.length} Available</span>
            </div>
            
            <div className="space-y-16">
                {sortedYears.map((yearLabel, yIdx) => (
                    <YearGroup 
                        key={`${yearLabel}-${yIdx}`}
                        yearLabel={yearLabel}
                        semestersData={groupedSubjects[yearLabel]}
                        onAdd={onAdd}
                        selectionList={selectionList}
                    />
                ))}                {subjects.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-100 shadow-sm">
                        <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No subjects match your filters</p>
                    </div>
                )}
            </div>
        </section>
    );
};

const YearGroup = ({ yearLabel, semestersData, onAdd, selectionList }) => {
    const semKeys = Object.keys(semestersData).sort();
    const [activeSem, setActiveSem] = useState(semKeys[0]);

    // Update active tab if data changes and current tab is no longer valid
    useEffect(() => {
        if (!semKeys.includes(activeSem) && semKeys.length > 0) {
            setActiveSem(semKeys[0]);
        }
    }, [semKeys, activeSem]);

    if(semKeys.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{yearLabel}</h3>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        {Object.values(semestersData).flat().length} Subjects
                    </span>
                </div>
                
                {semKeys.length > 1 && (
                    <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100 self-start sm:self-auto">
                        {semKeys.map(sem => (
                            <button
                                key={sem}
                                onClick={() => setActiveSem(sem)}
                                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                    activeSem === sem 
                                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200/60' 
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 border border-transparent'
                                }`}
                            >
                                {sem}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSem}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Academic Subject</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 w-32">Units</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Section Selection</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 w-48">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {semestersData[activeSem]?.map(s => (
                                    <SubjectTableRow key={s.id} subject={s} onAdd={onAdd} inList={selectionList.some(c => c.subject.id === s.id)} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const SubjectTableRow = ({ subject, onAdd, inList }) => {
    const [selectedSection, setSelectedSection] = useState(subject.sections[0]?.id || '');

    return (
        <tr className={`group transition-all ${inList ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                        ${inList ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-blue-600 shadow-sm border border-gray-100'}`}>
                        {inList ? <CheckCircle2 className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 uppercase text-sm tracking-tight flex flex-wrap items-center gap-2">
                            {subject.code}
                            {subject.program_code && (
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${subject.is_global ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                    {subject.is_global ? `Gen Ed • ${subject.program_code}` : subject.program_code}
                                </span>
                            )}
                            {subject.is_retake && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100">Retake</span>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[250px]">
                            {subject.title}
                        </div>
                        {subject.prerequisites && subject.prerequisites.length > 0 && (
                            <div className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1 flex gap-1 items-center flex-wrap">
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 mr-1">Prereq:</span>
                                {subject.prerequisites.map(p => typeof p === 'string' ? p : p.code).join(', ')}
                            </div>
                        )}
                        {subject.can_enroll === false && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                                    {subject.enrollment_message || subject.enrollment_blocked_reason || 'Cannot enroll'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-8 py-6 text-center">
                <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
                    {subject.units} Units
                </span>
            </td>
            <td className="px-8 py-6 min-w-[200px]">
                <div className="flex flex-wrap gap-2">
                    {subject.sections.map((sec, idx) => (
                        <button 
                            key={`${subject.id}-sec-${sec.id}-${idx}`}
                            disabled={inList || sec.enrolled >= sec.slots}
                            onClick={() => setSelectedSection(sec.id)}
                            className={`px-4 py-3 rounded-xl text-left border-2 transition-all min-w-[200px]
                                ${selectedSection === sec.id 
                                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                    : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50'
                                } ${inList ? 'opacity-50 cursor-not-allowed' : ''} ${sec.enrolled >= sec.slots ? 'border-red-100 bg-red-50 opacity-60' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`text-xs font-black uppercase tracking-tight ${selectedSection === sec.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {sec.name}
                                </div>
                                <div className={`text-[9px] font-bold ${sec.enrolled >= sec.slots ? 'text-red-500' : 'text-gray-500'}`}>
                                    {sec.enrolled}/{sec.slots}
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="text-[9px] font-bold text-gray-400 truncate flex items-center gap-1">
                                    <span className="text-blue-400">👤</span> {sec.professor || 'Wala pa'}
                                </div>
                                {sec.schedule && sec.schedule.length > 0 ? (
                                    <div className="text-[8px] font-bold text-gray-400 flex flex-col gap-0.5">
                                        {sec.schedule.map((slot, sidx) => (
                                            <div key={sidx} className="flex items-center gap-1">
                                                <span className="text-amber-400">⏰</span>
                                                {slot.day} {slot.start_time}-{slot.end_time} ({slot.room})
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[8px] font-bold text-gray-300 italic">No schedule set</div>
                                )}
                            </div>
                        </button>
                    ))}
                    {subject.sections.length === 0 && <span className="text-[10px] font-black text-red-400 uppercase">Closed</span>}
                </div>
            </td>
            <td className="px-8 py-6 text-right">
                <Button 
                    variant={inList ? 'secondary' : (subject.can_enroll === false ? 'secondary' : 'primary')}
                    className="h-10 px-6 rounded-xl uppercase text-[9px] tracking-widest font-black"
                    onClick={() => onAdd(subject, selectedSection)}
                    disabled={inList || subject.sections.length === 0 || !selectedSection || subject.can_enroll === false}
                >
                    {inList ? 'ADDED' : (subject.can_enroll === false ? 'BLOCKED' : 'ADD TO LIST')}
                </Button>
            </td>
        </tr>
    );
};

const AdmissionPendingView = () => (
    <div className="max-w-xl mx-auto mt-20 p-12 bg-white rounded-[40px] border border-amber-100 shadow-2xl shadow-amber-500/10 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-100">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-4 uppercase">Verification Active</h2>
        <p className="text-gray-500 font-bold mb-8 leading-relaxed">Your portal account is currently pending admission office clearance. Please check back later once your identification has been verified.</p>
        <Button variant="secondary" onClick={() => window.location.href='/dashboard'}>BACK TO DASHBOARD</Button>
    </div>
);

const getStatusBadge = (s) => {
    // 1. Officially Enrolled
    if (s.is_fully_enrolled || s.status === 'ENROLLED') {
        return (
            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1 ml-auto w-fit">
                <CheckCircle2 className="w-3 h-3" /> Officially Enrolled
            </span>
        );
    }
    
    // 2. Both Pending (Needs Payment & Head Approval)
    if (!s.payment_approved && !s.head_approved) {
        return (
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1 ml-auto w-fit">
                <Clock className="w-3 h-3" /> Pending Payment & Head Approval
            </span>
        );
    }

    // 3. Paid but waiting for head
    if (s.payment_approved && !s.head_approved) {
        return (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1 ml-auto w-fit">
                <Clock className="w-3 h-3" /> Pending Head Approval
            </span>
        );
    }

    // 4. Head Approved but waiting for payment
    if (!s.payment_approved && s.head_approved) {
        return (
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1 ml-auto w-fit">
                <Clock className="w-3 h-3" /> Pending Payment
            </span>
        );
    }

    // Default Fallback
    return (
        <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-1 ml-auto w-fit">
            <Clock className="w-3 h-3" /> Pending Approval
        </span>
    );
};

const EnrolledSubjectsView = ({ subjects }) => (
    <div className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">Enrollment Active</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Your Study Load</h1>
            <p className="text-gray-500 font-medium mt-2">Subjects verified and officially assigned for the current term.</p>
        </header>
        
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Subject</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Section</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {subjects.map((s) => (
                        <tr key={s.id || s.subject_code} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                                <div className="font-black text-gray-900">{s.subject_code}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{s.subject_title}</div>
                            </td>
                            <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    {s.section_name}
                                </span>
                            </td>
                            <td className="px-8 py-6 text-center font-black text-gray-900">{s.units}</td>
                            <td className="px-8 py-6 text-right">
                                {getStatusBadge(s)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const EnrollmentEndedView = ({ semester }) => (
    <div className="max-w-xl mx-auto mt-20 p-12 bg-white rounded-[40px] border border-red-100 shadow-2xl shadow-red-500/10 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100">
            <Clock className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-4 uppercase">Enrollment Ended</h2>
        <p className="text-gray-500 font-bold mb-8 leading-relaxed">The enrollment period for {semester || 'the current term'} has officially ended. Please coordinate with the Registrar's Office for late enrollment inquiries.</p>
        <Button variant="secondary" onClick={() => window.location.href='/dashboard'}>BACK TO DASHBOARD</Button>
    </div>
);

const DAYS = [
    { code: 'MON', name: 'Monday', short: 'Mon' },
    { code: 'TUE', name: 'Tuesday', short: 'Tue' },
    { code: 'WED', name: 'Wednesday', short: 'Wed' },
    { code: 'THU', name: 'Thursday', short: 'Thu' },
    { code: 'FRI', name: 'Friday', short: 'Fri' },
    { code: 'SAT', name: 'Saturday', short: 'Sat' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 19; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    TIME_SLOTS.push(`${displayHour.toString().padStart(2, '0')}:00 ${period}`);
}

const COLORS = [
    'border-blue-500 bg-blue-50 text-blue-700',
    'border-indigo-500 bg-indigo-50 text-indigo-700',
    'border-purple-500 bg-purple-50 text-purple-700',
    'border-pink-500 bg-pink-50 text-pink-700',
    'border-rose-500 bg-rose-50 text-rose-700',
    'border-emerald-500 bg-emerald-50 text-emerald-700',
    'border-teal-500 bg-teal-50 text-teal-700',
    'border-cyan-500 bg-cyan-50 text-cyan-700'
];

const SchedulePreview = ({ selectionList }) => {
    // Flatten and sort the schedule slots from all selected sections
    const allSlots = selectionList.flatMap(item => 
        (item.section.schedule || []).map(slot => ({
            ...slot,
            subjectCode: item.subject.code,
            subjectTitle: item.subject.title,
            sectionName: item.section.name,
            colorClass: COLORS[[...new Set(selectionList.map(i => i.subject.code))].indexOf(item.subject.code) % COLORS.length]
        }))
    ).sort((a, b) => {
        const dayOrder = DAYS.findIndex(d => d.code === a.day) - DAYS.findIndex(d => d.code === b.day);
        if (dayOrder !== 0) return dayOrder;
        return a.start_time.localeCompare(b.start_time);
    });

    if (allSlots.length === 0) {
        return (
            <div className="py-20 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No schedule information available</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Day</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Section</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {allSlots.map((slot, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                        {DAYS.find(d => d.code === slot.day)?.short || slot.day}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                                        <Clock className="w-3 h-3 text-amber-400" />
                                        {slot.start_time} - {slot.end_time}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-8 rounded-full ${slot.colorClass.split(' ')[0].replace('border-', 'bg-')}`}></div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{slot.subjectCode}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{slot.subjectTitle}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                        {slot.sectionName}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">
                                    {slot.room || 'TBA'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubjectEnrollmentPage;
