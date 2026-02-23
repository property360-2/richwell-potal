import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
    BookOpen, 
    ShoppingCart, 
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
import { useEnrollmentData, useEnrollSubjects } from '../../hooks/useEnrollment';

const SubjectEnrollmentPage = () => {
    const { user } = useAuth();
    const { success, error, warning } = useToast();
    const navigate = useNavigate();



    const [cart, setCart] = useState([]);
    const [filters, setFilters] = useState({ yearLevel: '', semester: '', search: '' });
    const [isCartOpen, setIsCartOpen] = useState(false);

    const { data: enrollmentData, isLoading: loading, error: queryError } = useEnrollmentData();
    const { mutate: enroll, isPending: submitting } = useEnrollSubjects();

    const data = enrollmentData || {
        recommendedSubjects: [],
        availableSubjects: [],
        enrolledSubjects: [],
        maxUnits: 24,
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
        const cartUnits = cart.reduce((sum, item) => sum + item.subject.units, 0);
        const enrolledUnits = data.enrolledSubjects.reduce((sum, s) => sum + (s.units || 0), 0);
        return cartUnits + enrolledUnits;
    }, [cart, data.enrolledSubjects]);

    const addToCart = (subject, sectionId) => {
        if (!sectionId) {
            warning('Please select a section first');
            return;
        }

        if (cart.some(item => item.subject.id === subject.id)) {
            error('Subject already in cart');
            return;
        }

        if (totalUnits() + subject.units > data.maxUnits) {
            error('Unit limit exceeded');
            return;
        }

        const section = subject.sections.find(s => s.id === sectionId);
        setCart(prev => [...prev, { subject, section }]);
        success(`${subject.code} added to selections`);
    };

    const removeFromCart = (subjectId) => {
        setCart(prev => prev.filter(item => item.subject.id !== subjectId));
    };

    const finalizeEnrollment = () => {
        const payload = {
            enrollments: cart.map(item => ({
                subject: item.subject.id,
                section: item.section.id
            }))
        };
        
        enroll(payload, {
            onSuccess: () => {
                success('🎉 OFFICIALLY ENROLLED! Your subjects have been secured.');
                setCart([]);
                setIsCartOpen(false);
                setTimeout(() => navigate('/student/dashboard'), 2000);
            },
            onError: (err) => {
                error(err.message || 'Submission failed');
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
        <div className="max-w-7xl mx-auto px-4 py-12 pb-32 animate-in fade-in duration-700">
            {/* Header */}
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                        Enlistment Portal
                    </span>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{data.activeSemester?.name}</span>
                </div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Subject Enrollment</h1>
                <p className="text-gray-500 font-medium mt-2">Personalize your academic load for the upcoming term.</p>
            </header>

            {/* Dash & Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-gray-900 leading-none">{totalUnits()}</div>
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">/ {data.maxUnits} Limit</div>
                            </div>
                        </div>
                        <div>
                            <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden mb-3 border border-gray-100">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(totalUnits() / data.maxUnits) * 100}%` }}
                                    className={`h-full transition-all duration-1000 ${totalUnits() > data.maxUnits - 3 ? 'bg-amber-500' : 'bg-blue-600'}`}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter text-center">Credit Load Capacity</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-100/20 flex flex-col md:flex-row gap-6 h-full items-end">
                        <div className="flex-[2] w-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest flex items-center gap-2">
                                <Search className="w-3 h-3" /> Search Subjects
                            </label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Code or Title..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-black text-gray-600 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest flex items-center gap-2">
                                <Filter className="w-3 h-3" /> Filter by Year
                            </label>
                            <select 
                                value={filters.yearLevel}
                                onChange={(e) => setFilters(prev => ({ ...prev, yearLevel: e.target.value }))}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-black text-gray-600 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Mixed Levels</option>
                                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year Level {y}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Select Semester
                            </label>
                            <select 
                                value={filters.semester}
                                onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-black text-gray-600 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">All Semesters</option>
                                <option value="1">1st Semester</option>
                                <option value="2">2nd Semester</option>
                                <option value="Summer">Summer Session</option>
                            </select>
                        </div>
                        <Button 
                            variant="secondary" 
                            className="h-[60px] px-8"
                            onClick={() => setFilters({ yearLevel: '', semester: '', search: '' })}
                        >
                            RESET
                        </Button>
                    </div>
                </div>
            </div>

            {/* Subjects Grid */}
            <div className="space-y-16">
                <SubjectSection 
                    title="Curriculum Picks" 
                    subtitle="Standard subjects based on your year level"
                    subjects={data.recommendedSubjects.filter(s => 
                        (!filters.yearLevel || s.year_level == filters.yearLevel) &&
                        (!filters.semester || s.semester_number == filters.semester) &&
                        (!filters.search || s.code.toLowerCase().includes(filters.search.toLowerCase()) || s.title.toLowerCase().includes(filters.search.toLowerCase()))
                    )} 
                    onAdd={addToCart}
                    cart={cart}
                />

                <SubjectSection 
                    title="Global Catalog" 
                    subtitle="All other subjects available for cross-enrollment"
                    subjects={data.availableSubjects.filter(s => 
                        !data.recommendedSubjects.find(r => r.id === s.id) &&
                        (!filters.yearLevel || s.year_level == filters.yearLevel) &&
                        (!filters.semester || s.semester_number == filters.semester) &&
                        (!filters.search || s.code.toLowerCase().includes(filters.search.toLowerCase()) || s.title.toLowerCase().includes(filters.search.toLowerCase()))
                    )}
                    onAdd={addToCart}
                    cart={cart}
                />
            </div>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 100, x: '-50%', opacity: 0 }}
                        className="fixed bottom-10 left-1/2 z-50 w-full max-w-sm px-4"
                    >
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-gray-900 border-2 border-white/10 text-white p-6 rounded-[32px] shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white ring-4 ring-gray-900 group-hover:rotate-12 transition-transform">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-gray-900">
                                        {cart.length}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-400">Review Selection</div>
                                    <div className="text-sm font-bold opacity-60">{totalUnits()} Total Units</div>
                                </div>
                            </div>
                            <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Modal */}
            <Modal
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                title="Your Enlistment Cart"
                size="lg"
                actions={[
                    { label: 'Cancel', onClick: () => setIsCartOpen(false) },
                    { label: 'Submit Enrollment', variant: 'primary', onClick: finalizeEnrollment, disabled: submitting }
                ]}
            >
                <div className="space-y-4">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.subject.code}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.subject.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-widest">{item.section.name}</span>
                                <button onClick={() => removeFromCart(item.subject.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && <p className="text-center py-12 text-gray-400 font-bold">Your cart is empty</p>}
                </div>
            </Modal>
        </div>
    );
};

// Sub-components for views
const SubjectSection = ({ title, subtitle, subjects, onAdd, cart }) => (
    <section>
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
            </div>
            <span className="px-4 py-1 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">{subjects.length} Found</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map(s => (
                <SubjectCard key={s.id} subject={s} onAdd={onAdd} inCart={cart.some(c => c.subject.id === s.id)} />
            ))}
        </div>
    </section>
);

const SubjectCard = ({ subject, onAdd, inCart }) => {
    const [selectedSection, setSelectedSection] = useState(subject.sections[0]?.id || '');

    return (
        <div className={`p-6 bg-white rounded-[32px] border-2 transition-all flex flex-col justify-between group
            ${inCart ? 'border-blue-600 ring-4 ring-blue-50/50' : 'border-gray-50 hover:border-gray-100 hover:shadow-2xl hover:shadow-blue-500/5'}`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        {subject.units} Units
                    </span>
                    {inCart && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                </div>
                <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">{subject.code}</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{subject.title}</p>
            </div>

            <div className="mt-8 space-y-4">
                <div className="relative">
                    <select 
                        disabled={inCart}
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-xs font-bold text-gray-600 focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                        {subject.sections.map(sec => (
                            <option key={sec.id} value={sec.id}>
                                Section {sec.name} ({sec.enrolled}/{sec.slots})
                            </option>
                        ))}
                        {subject.sections.length === 0 && <option>No Sections Available</option>}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <Button 
                    variant={inCart ? 'secondary' : 'primary'}
                    className="w-full py-4 uppercase text-[10px] tracking-widest font-black"
                    onClick={() => onAdd(subject, selectedSection)}
                    disabled={inCart || subject.sections.length === 0}
                >
                    {inCart ? 'Assigned to Cart' : 'Enlist Subject'}
                </Button>
            </div>
        </div>
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
                    {subjects.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
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
