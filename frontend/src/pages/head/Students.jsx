import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Loader2,
    Users,
    BookOpen,
    UserCheck,
    BarChart3,
    ArrowUpRight,
    Filter,
    CheckSquare,
    Square,
    AlertTriangle,
    ChevronDown,
    MoreVertical,
    FileText,
    ShieldCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const HeadStudents = () => {
    const { user } = useAuth();
    const { success, error, info, warning } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, REGULAR, IRREGULAR
    
    // UI State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const data = await HeadService.getPendingEnrollments();
            
            // Group by student
            const grouped = {};
            data.forEach(se => {
                const key = se.student_id;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: se.student_id,
                        name: se.student_name,
                        number: se.student_number,
                        program: se.program_code,
                        year_level: se.year_level,
                        is_irregular: se.is_irregular,
                        subjects: [],
                        totalUnits: 0,
                        isPaid: se.is_month1_paid
                    };
                }
                grouped[key].subjects.push(se);
                grouped[key].totalUnits += se.subject_units;
            });
            
            setEnrollments(Object.values(grouped));
        } catch (err) {
            error('Failed to sync pending enrollments');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAll = async (student) => {
        try {
            setProcessing(true);
            const ids = student.subjects.map(s => s.id);
            await HeadService.bulkApprove(ids);
            success(`Enrollment for ${student.name} approved`);
            setSelectedStudent(null);
            fetchEnrollments();
        } catch (err) {
            error('Approval failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        
        try {
            setProcessing(true);
            // Collect all subject IDs from selected students
            const subjectIds = [];
            enrollments
                .filter(e => selectedIds.includes(e.id))
                .forEach(e => {
                    e.subjects.forEach(s => subjectIds.push(s.id));
                });
            
            const res = await HeadService.bulkApprove(subjectIds);
            success(`Approved enrollment for ${res.approved_count} subjects across ${selectedIds.length} students`);
            setSelectedIds([]);
            fetchEnrollments();
        } catch (err) {
            error('Bulk approval failed');
        } finally {
            setProcessing(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(e => e.id));
        }
    };

    const filtered = useMemo(() => {
        return enrollments.filter(e => {
            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                e.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                e.program.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (activeTab === 'REGULAR') return matchesSearch && !e.is_irregular;
            if (activeTab === 'IRREGULAR') return matchesSearch && e.is_irregular;
            return matchesSearch;
        });
    }, [enrollments, searchTerm, activeTab]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Student Approvals" description="Review and approve student subject enrollments." />
            
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Student Approvals
                        <span className="text-indigo-600/20"><UserCheck className="w-9 h-9" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-indigo-500" />
                        Academic Oversight System • Enrollment Phase
                    </p>
                </div>
                
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex gap-2">
                        <StatCard label="Total Pending" value={enrollments.length} color="indigo" />
                        <StatCard label="Selected" value={selectedIds.length} color="blue" />
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-2xl shadow-indigo-500/5 mb-8 flex flex-col md:flex-row items-center gap-4">
                {/* Search */}
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100/50 p-1.5 rounded-2xl w-full md:w-auto">
                    {['ALL', 'REGULAR', 'IRREGULAR'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-tight transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Bulk Select Trigger */}
                <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all w-full md:w-auto"
                >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                        <Square className="w-4 h-4 text-gray-300" />
                    )}
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Select All</span>
                </button>
            </div>

            {/* Student List */}
            <div className="grid grid-cols-1 gap-4 pb-32">
                {filtered.length === 0 ? (
                    <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center opacity-40">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No students found matching your criteria</p>
                    </div>
                ) : filtered.map((e) => (
                    <StudentCard 
                        key={e.id} 
                        student={e} 
                        isSelected={selectedIds.includes(e.id)}
                        onSelect={() => toggleSelect(e.id)}
                        onReview={() => setSelectedStudent(e)}
                        onApprove={() => handleApproveAll(e)}
                    />
                ))}
            </div>

            {/* Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-gray-900 border border-white/10 text-white rounded-[32px] px-8 py-5 shadow-2xl flex items-center gap-10 backdrop-blur-xl bg-opacity-95">
                        <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
                                {selectedIds.length}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none">Students Selected</p>
                                <p className="text-xs font-bold text-white mt-1">Ready for bulk approval</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedIds([])}
                                className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <Button 
                                variant="primary" 
                                className="!bg-white !text-gray-900 px-8 py-4 !rounded-2xl"
                                icon={CheckCircle2}
                                onClick={handleBulkApprove}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'APPROVE ALL SELECTED'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Drawer Placeholder - (Reusing existing drawer logic for details) */}
             {selectedStudent && (
                  <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                  <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                  <div className="relative w-full max-w-3xl bg-white rounded-[40px] shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                     {/* Drawer Header */}
                     <div className="p-10 border-b border-gray-50 flex justify-between items-start">
                         <div className="flex items-center gap-6">
                             <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white text-2xl font-black shadow-2xl shadow-indigo-200">
                                 {selectedStudent.name.charAt(0)}
                             </div>
                             <div>
                                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Detailed Enrollment Review</p>
                                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight">{selectedStudent.name}</h2>
                                 <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">
                                     {selectedStudent.number} • {selectedStudent.program} • YEAR {selectedStudent.year_level}
                                 </p>
                             </div>
                         </div>
                         <button onClick={() => setSelectedStudent(null)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                             <XCircle className="w-5 h-5 text-gray-400" />
                         </button>
                     </div>

                     {/* Drawer Content */}
                     <div className="flex-grow overflow-y-auto p-10">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Subject Breakdown</h3>
                            {selectedStudent.subjects.map((s) => (
                                <div key={s.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100/50 group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-black border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {s.subject_code}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{s.subject_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{s.section_name} • {s.subject_units} Units</p>
                                        </div>
                                    </div>
                                    <button 
                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        onClick={() => {
                                            const reason = window.prompt("Reason for rejection:");
                                            if (reason) {
                                                HeadService.rejectSubject(s.id, reason).then(() => {
                                                    success("Subject rejected");
                                                    fetchEnrollments();
                                                    setSelectedStudent(null);
                                                });
                                            }
                                        }}
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                     </div>

                     {/* Drawer Footer */}
                     <div className="p-10 border-t border-gray-50 bg-gray-50/30 flex gap-4">
                        <Button 
                            variant="secondary" 
                            className="flex-1 py-5 !rounded-2xl !bg-white border border-gray-100" 
                            onClick={() => setSelectedStudent(null)}
                        >
                            CLOSE
                        </Button>
                        <Button 
                            variant="primary" 
                            className="flex-3 py-5 !rounded-2xl" 
                            icon={CheckCircle2}
                            onClick={() => handleApproveAll(selectedStudent)}
                            disabled={processing}
                        >
                            {processing ? 'PROCESSING...' : 'APPROVE ALL SUBJECTS'}
                        </Button>
                     </div>
                 </div>
             </div>
            )}
        </div>
    );
};

const StudentCard = ({ student, isSelected, onSelect, onReview, onApprove }) => {
    return (
        <div className={`bg-white p-6 rounded-[32px] border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-indigo-200 shadow-xl shadow-indigo-500/5 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-gray-100'}`}>
            <div className="flex items-center gap-6">
                {/* Selection Checkbox */}
                <button onClick={onSelect} className="shrink-0 transition-transform active:scale-95">
                    {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-indigo-600" />
                    ) : (
                        <Square className="w-6 h-6 text-gray-200" />
                    )}
                </button>

                {/* Avatar */}
                <div className="relative">
                    <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 text-lg font-black border border-gray-100 group-hover:bg-indigo-600 transition-all">
                        {student.name.charAt(0)}
                    </div>
                    {student.is_irregular && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg" title="Irregular Student">
                            <AlertTriangle className="w-3 h-3" />
                        </div>
                    )}
                </div>

                {/* Name & Metadata */}
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">{student.name}</h3>
                        {!student.isPaid && (
                           <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100">
                               <Clock className="w-2.5 h-2.5" /> Pending Payment
                           </span>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        {student.number} 
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        {student.program}
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        Year {student.year_level}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{student.subjects.length} Subjects</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{student.totalUnits} Units</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-none border-gray-50">
                <button 
                    onClick={onReview}
                    className="flex-1 lg:flex-none px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                >
                    REVIEW DETAILS
                </button>
                <Button 
                    variant="primary" 
                    className="flex-1 lg:flex-none px-8 py-4 !rounded-2xl shadow-lg shadow-indigo-100" 
                    icon={CheckCircle2}
                    onClick={onApprove}
                >
                    APPROVE
                </Button>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color }) => (
    <div className="bg-white px-6 py-3 rounded-[24px] border border-gray-100 shadow-xl shadow-indigo-500/5 flex items-center gap-4">
        <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className={`text-xl font-black tracking-tighter text-${color}-600`}>{value}</p>
        </div>
        <div className={`w-10 h-10 bg-${color}-50 rounded-2xl flex items-center justify-center text-${color}-600`}>
            {label.includes('Total') ? <Users className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </div>
    </div>
);

export default HeadStudents;
