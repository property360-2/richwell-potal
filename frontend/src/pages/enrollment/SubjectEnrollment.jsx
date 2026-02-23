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
    PartyPopper
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

    const mapSubject = (s) => ({
        ...s,
        id: s.id,
        code: s.code,
        title: s.title || s.name,
        units: parseFloat(s.units || 0),
        sections: (s.available_sections || s.sections || []).map(sec => ({
            id: sec.id,
            name: sec.name || sec.section_name,
            slots: sec.slots || 40,
            enrolled: sec.enrolled_count || 0
        }))
    });

    const totalUnits = useCallback(() => {
        const selectionUnits = selectionList.reduce((sum, item) => sum + item.subject.units, 0);
        const enrolledUnits = data.enrolledSubjects.reduce((sum, s) => sum + (s.units || 0), 0);
        return selectionUnits + enrolledUnits;
    }, [selectionList, data.enrolledSubjects]);

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
            error(`Prerequisites not met: ${subject.missing_prerequisites?.join(', ') || 'Contact Registrar'}`);
            return;
        }

        if (totalUnits() + subject.units > data.maxUnits) {
            error(`Unit limit exceeded (${totalUnits() + subject.units} > ${data.maxUnits})`);
            return;
        }

        const section = subject.sections.find(s => s.id === sectionId);
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
    const validStatuses = ['ACTIVE', 'ENROLLED', 'ADMITTED', 'PENDING'];
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
            
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Main Content Area */}
                <div className="flex-grow lg:max-w-[calc(100%-400px)]">
                    {/* Header */}
                    <header className="mb-10">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                Enlistment Portal
                            </span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{data.activeSemester?.name}</span>
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
                                <option value="Summer">Summer</option>
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
                            key="global-catalog"
                            title="Global Catalog" 
                            subtitle="All subjects available for cross-enrollment"
                            subjects={data.availableSubjects.filter(s => 
                                !data.recommendedSubjects.find(r => r.id === s.id) &&
                                (!filters.yearLevel || s.year_level == filters.yearLevel) &&
                                (!filters.semester || s.semester_number == filters.semester) &&
                                (!filters.search || s.code.toLowerCase().includes(filters.search.toLowerCase()) || s.title.toLowerCase().includes(filters.search.toLowerCase()))
                            )}
                            onAdd={addToList}
                            selectionList={selectionList}
                        />

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

                {/* Desktop Sidebar Selection Summary */}
                <div className="hidden lg:block w-[360px] shrink-0">
                    <div className="sticky top-12 bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden flex flex-col max-h-[calc(100vh-100px)]">
                        <div className="p-8 border-b border-gray-50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Selected Subjects</h3>
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                    <List className="w-5 h-5" />
                                </div>
                            </div>
                            
                            <div className="mb-2 flex justify-between items-end">
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Credit Load</span>
                                <span className="text-xl font-black text-gray-900">{totalUnits()} <span className="text-xs text-gray-400">/ {data.maxUnits}</span></span>
                            </div>
                            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((totalUnits() / data.maxUnits) * 100, 100)}%` }}
                                    className={`h-full transition-all duration-1000 ${totalUnits() > data.maxUnits ? 'bg-red-500' : totalUnits() > data.maxUnits - 3 ? 'bg-amber-500' : 'bg-blue-600'}`}
                                />
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            {selectionList.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100">
                                        <BookOpen className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No subjects selected</p>
                                </div>
                            ) : (
                                selectionList.map((item, idx) => (
                                    <motion.div 
                                        key={item.subject.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="p-4 bg-gray-50/50 rounded-3xl border border-gray-50 group hover:border-blue-100 hover:bg-white transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{item.subject.code}</p>
                                                <p className="text-xs font-bold text-gray-900 truncate max-w-[180px]">{item.subject.title}</p>
                                            </div>
                                            <button 
                                                onClick={() => removeFromList(item.subject.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Section {item.section.name}</span>
                                            <span className="text-[9px] font-black text-gray-500">{item.subject.units} Units</span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/30">
                            <Button 
                                variant="primary" 
                                className="w-full py-5 rounded-[24px] shadow-xl shadow-blue-500/20"
                                onClick={finalizeEnrollment}
                                disabled={selectionList.length === 0 || submitting || totalUnits() > data.maxUnits}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'FINALIZE ENLISTMENT'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Selection Drawer Toggle */}
            <AnimatePresence>
                {selectionList.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="lg:hidden fixed bottom-6 left-4 right-4 z-50"
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
                <div className="space-y-4">
                    <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 mb-6">
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

                    <div className="space-y-3">
                        {selectionList.map((item) => (
                            <div key={item.subject.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.subject.code}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[150px]">{item.subject.title}</p>
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
                    </div>
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
            if (sem === '1') semLabel = 'FIRST SEMESTER';
            else if (sem === '2') semLabel = 'SECOND SEMESTER';
            else if (sem === 'Summer') semLabel = 'SUMMER SESSION';

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
            
            <div className="space-y-12">
                {sortedYears.map((yearLabel, yIdx) => (
                    <div key={`${title}-${yearLabel}-${yIdx}`} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-[2px] flex-grow bg-blue-100/50"></div>
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-6 py-2 rounded-full border border-blue-100 shadow-sm whitespace-nowrap">
                                {yearLabel}
                            </h3>
                            <div className="h-[2px] flex-grow bg-blue-100/50"></div>
                        </div>

                        {Object.keys(groupedSubjects[yearLabel]).sort().map((semLabel, sIdx) => (
                            <div key={`${title}-${yearLabel}-${semLabel}-${sIdx}`} className="space-y-4">
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{semLabel}</h4>
                                </div>
                                <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50">
                                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Academic Subject</th>
                                                    <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Units</th>
                                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Section Selection</th>
                                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {groupedSubjects[yearLabel][semLabel].map(s => (
                                                    <SubjectTableRow key={s.id} subject={s} onAdd={onAdd} inList={selectionList.some(c => c.subject.id === s.id)} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {subjects.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-100 shadow-sm">
                        <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No subjects match your filters</p>
                    </div>
                )}
            </div>
        </section>
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
                        {subject.can_enroll === false && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                                    Prerequisites Missing: {subject.missing_prerequisites?.join(', ') || 'Contact Registrar'}
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
                            className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all
                                ${selectedSection === sec.id 
                                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                    : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                                } ${inList ? 'opacity-50 cursor-not-allowed' : ''} ${sec.enrolled >= sec.slots ? 'text-red-300 border-red-50' : ''}`}
                        >
                            {sec.name} ({sec.enrolled}/{sec.slots})
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
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest
                                    ${s.payment_approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {s.payment_approved ? 'Paid & Verified' : 'Pending Payment'}
                                </span>
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

export default SubjectEnrollmentPage;
