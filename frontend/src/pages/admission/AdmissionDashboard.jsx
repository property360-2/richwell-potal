import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Filter, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ChevronRight,
    Loader2,
    ShieldCheck,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    AlertCircle,
    Copy,
    Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import AdmissionService from './AdmissionService';
import Modal from '../../components/ui/Modal';

// Assuming a custom modal for now if the one in core is legacy

const AdmissionDashboard = () => {
    const { user } = useAuth();
    const { success, error, info } = useToast();
    const [loading, setLoading] = useState(true);
    const [applicants, setApplicants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    
    // UI State
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);
    const [proposedId, setProposedId] = useState('');
    const [idStatus, setIdStatus] = useState({ loading: false, available: null });
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    useEffect(() => {
        fetchApplicants();
    }, []);

    const fetchApplicants = async () => {
        try {
            setLoading(true);
            const data = await AdmissionService.getApplicants();
            setApplicants(data);
        } catch (err) {
            error('Failed to load applicant pool');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckId = async (id) => {
        if (!id) return setIdStatus({ loading: false, available: null });
        try {
            setIdStatus({ loading: true, available: null });
            const res = await AdmissionService.checkIdAvailability(id);
            setIdStatus({ loading: false, available: res.available });
        } catch (err) {
            setIdStatus({ loading: false, available: false });
        }
    };

    const handleApprove = async () => {
        if (!proposedId) return error('Student ID is required');
        if (idStatus.available === false) return error('ID is already taken');

        try {
            const res = await AdmissionService.approveApplicant(selectedApplicant.id, proposedId);
            if (res) {
                success('Applicant approved and ID assigned');
                setIsIdModalOpen(false);
                setSelectedApplicant(null);
                fetchApplicants();
            }
        } catch (err) {
            error('Approval projection failed');
        }
    };

    const handleReject = async () => {
        try {
            const res = await AdmissionService.rejectApplicant(selectedApplicant.id, rejectReason);
            if (res) {
                success('Applicant rejected');
                setIsRejecting(false);
                setSelectedApplicant(null);
                fetchApplicants();
            }
        } catch (err) {
            error('Rejection failed');
        }
    };

    const filtered = applicants.filter(a => {
        const matchesSearch = !searchTerm || 
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = applicants.filter(a => a.status === 'PENDING').length;

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Admission Dashboard" description="Screen and approve student applications." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Admission Hub
                        <span className="text-blue-600/20"><ShieldCheck className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Applicant Screening & ID Assignment
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white border border-gray-100 rounded-[28px] px-8 py-3 shadow-xl shadow-blue-500/5 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pending Pool</p>
                            <p className="text-xl font-black text-blue-600 tracking-tighter">{pendingCount}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="lg:col-span-3 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search applicants by name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-white border border-gray-100 rounded-3xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                    />
                </div>
                <div className="relative group">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-6 pr-10 py-4 bg-white border border-gray-100 rounded-3xl text-[10px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-blue-200 shadow-xl shadow-blue-500/5 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="APPROVED">Enrolled Students</option>
                        <option value="REJECTED">Declined Applications</option>
                    </select>
                </div>
            </div>

            {/* Applicants Table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicant</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applied Program</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Submitted</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center opacity-20">
                                    <Users className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No matching applicants found</p>
                                </td>
                            </tr>
                        ) : filtered.map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50/30 transition-all group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-blue-600 text-sm shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            {a.first_name[0]}{a.last_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{a.first_name} {a.last_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{a.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-black text-gray-600 uppercase">{a.program_code || '---'}</span>
                                        <span className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]">{a.program_name}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <StatusPill status={a.status} />
                                </td>
                                <td className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase">
                                    {new Date(a.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button 
                                        onClick={() => setSelectedApplicant(a)}
                                        className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors"
                                    >
                                        Review Details
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Applicant Detail Drawer/Modal */}
            {selectedApplicant && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedApplicant(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        <div className="p-10 border-b border-gray-50 shrink-0">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black">
                                        {selectedApplicant.first_name[0]}{selectedApplicant.last_name[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedApplicant.first_name} {selectedApplicant.last_name}</h2>
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Applicant ID: {selectedApplicant.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedApplicant(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <StatusPill status={selectedApplicant.status} large />
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-10 space-y-12">
                            {/* Personal Info */}
                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <Users className="w-4 h-4" /> Personal Information
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <DetailItem label="Full Legal Name" value={`${selectedApplicant.first_name} ${selectedApplicant.middle_name || ''} ${selectedApplicant.last_name}`} />
                                    <DetailItem label="Gender" value={selectedApplicant.gender} />
                                    <DetailItem label="Civil Status" value={selectedApplicant.civil_status || 'Single'} />
                                    <DetailItem label="Date of Birth" value={selectedApplicant.date_of_birth} />
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <Mail className="w-4 h-4" /> Contact & Residence
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <DetailItem label="Email Address" value={selectedApplicant.email} />
                                    <DetailItem label="Mobile Number" value={selectedApplicant.contact_number} />
                                    <div className="col-span-2">
                                        <DetailItem label="Primary Address" value={selectedApplicant.address} />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <GraduationCap className="w-4 h-4" /> Academic Intent
                                </h4>
                                <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100/50">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm"><GraduationCap className="w-6 h-6 text-blue-600" /></div>
                                        <div>
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Proposed Academic Program</p>
                                            <p className="text-lg font-black text-blue-900 leading-tight">{selectedApplicant.program_name}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-extrabold uppercase">{selectedApplicant.program_code || '---'}</span>
                                                <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest">Year {selectedApplicant.year_level} Admission</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {selectedApplicant.status === 'PENDING' && (
                            <div className="p-10 border-t border-gray-50 flex gap-4 shrink-0">
                                <Button 
                                    className="flex-1 py-5" 
                                    variant="danger" 
                                    icon={XCircle}
                                    onClick={() => setIsRejecting(true)}
                                >
                                    REJECT APPLICANT
                                </Button>
                                <Button 
                                    className="flex-1 py-5" 
                                    variant="primary" 
                                    icon={CheckCircle2}
                                    onClick={() => {
                                        const year = new Date().getFullYear();
                                        setProposedId(`${year}-${Math.floor(1000 + Math.random() * 9000)}`);
                                        setIsIdModalOpen(true);
                                    }}
                                >
                                    ACCEPT & ASSIGN ID
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ID Assignment Modal */}
            {isIdModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsIdModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Assign Student Number</h3>
                            <p className="text-gray-500 font-bold text-xs mt-1">Institutional Identity Generation</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-[28px] border border-gray-100">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Proposed Student ID</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        value={proposedId}
                                        onChange={(e) => {
                                            setProposedId(e.target.value);
                                            handleCheckId(e.target.value);
                                        }}
                                        className="flex-1 bg-white border border-gray-100 rounded-2xl px-6 py-3 text-xl font-black text-gray-900 tracking-[0.2em] focus:outline-none focus:border-blue-400 transition-all text-center"
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                    {idStatus.loading ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" /> : 
                                     idStatus.available === true ? <Check className="w-3 h-3 text-green-600" /> :
                                     idStatus.available === false ? <AlertCircle className="w-3 h-3 text-red-600" /> : null}
                                    <span className={`text-[9px] font-black uppercase tracking-widest
                                        ${idStatus.available === true ? 'text-green-600' : 
                                          idStatus.available === false ? 'text-red-600' : 'text-gray-400'}`}>
                                        {idStatus.loading ? 'Checking Registry...' : 
                                         idStatus.available === true ? 'ID is available' : 
                                         idStatus.available === false ? 'ID already registered' : 'Enter ID to verify'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsIdModalOpen(false)}>CANCEL</Button>
                                <Button variant="primary" className="flex-1" onClick={handleApprove} disabled={!idStatus.available}>PROCEED</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {isRejecting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsRejecting(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Decline Application</h3>
                            <p className="text-gray-500 font-bold text-xs mt-1">State administrative reason for rejection</p>
                        </div>

                        <div className="space-y-6">
                            <textarea 
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter reason for rejection (this will be sent to the applicant)"
                                className="w-full bg-gray-50 border border-gray-100 rounded-[28px] p-6 text-sm font-bold min-h-[150px] focus:outline-none focus:bg-white focus:border-red-200 transition-all font-sans"
                            />
                            <div className="flex gap-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsRejecting(false)}>BACK</Button>
                                <Button variant="danger" className="flex-1" onClick={handleReject}>REJECT</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusPill = ({ status, large = false }) => {
    const configs = {
        PENDING: { color: 'bg-yellow-50 text-yellow-600 border-yellow-100', label: 'Pending Review', icon: Clock },
        APPROVED: { color: 'bg-green-50 text-green-600 border-green-100', label: 'Enrolled', icon: CheckCircle2 },
        REJECTED: { color: 'bg-red-50 text-red-600 border-red-100', label: 'Declined', icon: XCircle }
    };
    
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
        <span className={`${config.color} border px-3 py-1.5 rounded-xl uppercase tracking-widest inline-flex items-center gap-2
            ${large ? 'text-[10px] font-black' : 'text-[8px] font-extrabold'}`}>
            <Icon className={large ? 'w-4 h-4' : 'w-3 h-3'} />
            {config.label}
        </span>
    );
};

const DetailItem = ({ label, value }) => (
    <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-gray-900 tracking-tight">{value || '---'}</p>
    </div>
);

export default AdmissionDashboard;
