import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Printer, 
    FileText, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight,
    Loader2,
    RefreshCw,
    UserCircle,
    Download
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const RegistrarCORManagement = () => {
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/cashier/student-search/');
            if (res.ok) {
                const data = await res.json();
                setStudents(data.results || data || []);
            }
        } catch (err) {
            error('Failed to sync student registry');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCOR = async (student) => {
        try {
            setIsGenerating(true);
            // Simulate/Trigger PDF generation
            const res = await fetch(`/api/v1/registrar/enrollments/${student.id || student.enrollment_id}/generate-cor/`);
            
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `COR-${student.student_number || 'ST'}.pdf`;
                document.body.appendChild(a);
                a.click();
                success('COR Generated Successfully');
            } else {
                // Fallback to detailed view if direct download fails
                setSelectedStudent(student);
                info('Opening manual review for COR production');
            }
        } catch (err) {
            error('Production server unreachable');
        } finally {
            setIsGenerating(false);
        }
    };

    const filtered = students.filter(s => 
        (s.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.student_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (`${s.first_name} ${s.last_name}`).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="COR Management" description="Validate and finalize institutional Certificates of Registration." />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter text-balance">Certificate of Registration</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Enrollment Verification & Compliance</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchStudents} loading={loading}>
                        REFRESH REGISTRY
                    </Button>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 mb-10">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by student name, ID or program..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-lg font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Content Switcher */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Registry List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>
                    ) : (
                        filtered.map((student) => (
                            <div 
                                key={student.id || student.enrollment_id}
                                onClick={() => setSelectedStudent(student)}
                                className={`group p-6 bg-white border border-gray-100 rounded-[32px] transition-all hover:shadow-xl hover:border-blue-100 cursor-pointer flex items-center justify-between
                                    ${selectedStudent?.id === (student.id || student.enrollment_id) ? 'ring-2 ring-blue-600 border-transparent shadow-2xl shadow-blue-500/10' : ''}`}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                        {(student.first_name?.[0] || 'S')}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                                            {student.student_name || `${student.first_name} ${student.last_name}`}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.student_number}</span>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{student.program_code || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden md:flex flex-col items-end mr-4">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Enrolled In</span>
                                        <span className="text-xs font-black text-gray-900 uppercase">1st Sem 2025</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleGenerateCOR(student); }}
                                        disabled={isGenerating}
                                        className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="py-20 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                            <UserCircle className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching records in registry</p>
                        </div>
                    )}
                </div>

                {/* Inspection Panel */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 bg-white rounded-[40px] border border-gray-100 p-8 shadow-2xl shadow-blue-500/5 space-y-8 overflow-hidden">
                        {selectedStudent ? (
                            <div className="animate-in slide-in-from-right duration-500">
                                <div className="text-center mb-10">
                                    <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-500/40">
                                        {selectedStudent.first_name?.[0]}
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                                        {selectedStudent.student_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Verified Resident Student
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-gray-50 rounded-3xl space-y-3">
                                        <InspectionRow label="Enrollment ID" value={`#EC-${selectedStudent.id || '---'}`} />
                                        <InspectionRow label="Academic Year" value="2025-2026" />
                                        <InspectionRow label="Year Level" value={`Level ${selectedStudent.year_level || '1'}`} />
                                    </div>

                                    <div className="p-6 border-2 border-blue-50 bg-blue-50/20 rounded-3xl flex items-start gap-4">
                                        <AlertCircle className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                                        <div className="text-xs font-bold text-blue-900/60 leading-relaxed">
                                            The COR is an official document. Re-generation records the administrator's timestamp for auditing purposes.
                                        </div>
                                    </div>

                                    <Button 
                                        variant="primary" 
                                        className="w-full py-6 rounded-[24px]" 
                                        icon={Printer}
                                        loading={isGenerating}
                                        onClick={() => handleGenerateCOR(selectedStudent)}
                                    >
                                        PRODUCE PHYSICAL COR
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-20">
                                <FileText className="w-20 h-20 mx-auto mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a student<br/>to inspect clearance</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InspectionRow = ({ label, value }) => (
    <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
        <span className="text-xs font-black text-gray-900">{value}</span>
    </div>
);

export default RegistrarCORManagement;
