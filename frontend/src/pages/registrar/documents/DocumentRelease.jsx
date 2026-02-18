import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Search, Loader2, XCircle, RotateCcw, Eye,
    ShieldCheck, AlertTriangle, RefreshCw, Filter, ChevronDown
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import SEO from '../../../components/shared/SEO';
import { api, endpoints } from '../../../api';

// Document type metadata for display
const DOC_TYPES = [
    { value: 'TOR', label: 'Transcript of Records' },
    { value: 'GOOD_MORAL', label: 'Good Moral Certificate' },
    { value: 'ENROLLMENT_CERT', label: 'Certificate of Enrollment' },
    { value: 'GRADES_CERT', label: 'Certificate of Grades' },
    { value: 'COMPLETION_CERT', label: 'Certificate of Completion' },
    { value: 'TRANSFER_CRED', label: 'Transfer Credentials' },
    { value: 'HONORABLE_DISMISSAL', label: 'Honorable Dismissal' },
    { value: 'DIPLOMA', label: 'Diploma' },
    { value: 'OTHER', label: 'Other Document' },
];

const STATUS_CONFIG = {
    ACTIVE: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REVOKED: { label: 'Revoked', color: 'bg-red-50 text-red-700 border-red-200' },
    REISSUED: { label: 'Reissued', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const DocumentReleasePage = () => {
    const { success, error: toastError } = useToast();
    const navigate = useNavigate();

    // Data state
    const [releases, setReleases] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, revoked: 0, tor_count: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modal state
    const [createModal, setCreateModal] = useState(false);
    const [detailModal, setDetailModal] = useState(null);
    const [revokeModal, setRevokeModal] = useState(null);

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [releasesData, statsData] = await Promise.all([
                api.get(endpoints.allReleases),
                api.get(endpoints.documentStats),
            ]);
            setReleases(releasesData.results || releasesData || []);
            setStats(statsData.data || statsData || { total: 0, active: 0, revoked: 0, tor_count: 0 });
        } catch (err) {
            console.error('Failed to load document releases:', err);
            toastError('Failed to load document releases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filtered releases
    const filtered = releases.filter(r => {
        const matchesSearch = searchTerm === '' ||
            r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.document_code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handlers
    const handleRevoke = async (code, reason) => {
        try {
            await api.post(endpoints.revokeDocument(code), { reason });
            success('Document revoked successfully');
            setRevokeModal(null);
            setDetailModal(null);
            fetchData();
        } catch (err) {
            toastError(err.message || 'Failed to revoke document');
        }
    };

    const handleReissue = async (code) => {
        try {
            await api.post(endpoints.reissueDocument(code));
            success('Document reissued successfully');
            setDetailModal(null);
            fetchData();
        } catch (err) {
            toastError(err.message || 'Failed to reissue document');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Document Release Management" description="Manage official document releases for students." />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Document Release</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Official Document Management Center</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={() => setCreateModal(true)}>
                    NEW RELEASE
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <StatCard label="Total Released" value={stats.total} icon={FileText} color="blue" />
                <StatCard label="Active" value={stats.active} icon={ShieldCheck} color="green" />
                <StatCard label="Revoked" value={stats.revoked} icon={XCircle} color="red" />
                <StatCard label="TOR Issued" value={stats.tor_count} icon={FileText} color="purple" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, student number, or document code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {['ALL', 'ACTIVE', 'REVOKED', 'REISSUED'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    statusFilter === s
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Code</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Released</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-black text-gray-700">{doc.document_code}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-gray-900 text-sm">{doc.student_name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.student_number} · {doc.student_program || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-gray-600">{doc.document_type_display || doc.document_type}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={doc.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-gray-500 font-bold">{formatDate(doc.released_at)}</span>
                                        <p className="text-[10px] text-gray-400 font-bold">by {doc.released_by_name}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setDetailModal(doc)}
                                            className="p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-bold">No documents found</p>
                                        <p className="text-xs text-gray-300 mt-1">Try adjusting your search or filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-50 text-xs text-gray-400 font-bold text-center">
                    Showing {filtered.length} of {releases.length} documents
                </div>
            </div>

            {/* Create Modal */}
            {createModal && (
                <CreateReleaseModal
                    onClose={() => setCreateModal(false)}
                    onCreated={() => { setCreateModal(false); fetchData(); }}
                />
            )}

            {/* Detail Modal */}
            {detailModal && (
                <DocumentDetailModal
                    doc={detailModal}
                    onClose={() => setDetailModal(null)}
                    onRevoke={(doc) => { setDetailModal(null); setRevokeModal(doc); }}
                    onReissue={handleReissue}
                />
            )}

            {/* Revoke Modal */}
            {revokeModal && (
                <RevokeModal
                    doc={revokeModal}
                    onClose={() => setRevokeModal(null)}
                    onConfirm={handleRevoke}
                />
            )}
        </div>
    );
};

// ─── Subcomponents ──────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, color }) => {
    const colorMap = {
        blue: 'text-blue-600 bg-blue-50/50 border-blue-100',
        green: 'text-emerald-600 bg-emerald-50/50 border-emerald-100',
        red: 'text-red-600 bg-red-50/50 border-red-100',
        purple: 'text-purple-600 bg-purple-50/50 border-purple-100',
    };

    return (
        <div className={`p-6 rounded-[24px] border-2 ${colorMap[color]} transition-all hover:shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <Icon className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-3xl font-black tracking-tighter">{value}</p>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
            {config.label}
        </span>
    );
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Create Release Modal ──────────────────────────────────────

const CreateReleaseModal = ({ onClose, onCreated }) => {
    const { success, error: toastError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [form, setForm] = useState({
        document_type: 'TOR',
        purpose: '',
        copies_released: 1,
        notes: '',
    });

    // Student search with debounce
    useEffect(() => {
        if (searchTerm.length < 2) { setStudents([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearching(true);
                const data = await api.get(`${endpoints.cashierStudentSearch}?search=${encodeURIComponent(searchTerm)}`);
                setStudents(data.results || data || []);
            } catch { setStudents([]); }
            finally { setSearching(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSubmit = async () => {
        if (!selectedStudent) { toastError('Please select a student'); return; }
        try {
            setSubmitting(true);
            await api.post(endpoints.createDocumentRelease, {
                student_id: selectedStudent.id || selectedStudent.student_id,
                document_type: form.document_type,
                purpose: form.purpose,
                copies_released: form.copies_released,
                notes: form.notes,
            });
            success('Document release created successfully');
            onCreated();
        } catch (err) {
            toastError(err.message || 'Failed to create release');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">New Document Release</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Issue an official document to a student</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Student Search */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Student</label>
                        {selectedStudent ? (
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-200">
                                <div>
                                    <p className="font-black text-gray-900 text-sm">{selectedStudent.student_name || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedStudent.student_number || 'No ID'}</p>
                                </div>
                                <button onClick={() => { setSelectedStudent(null); setSearchTerm(''); }} className="text-red-400 hover:text-red-600">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search student by name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                                {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}

                                {students.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                                        {students.map(s => (
                                            <button
                                                key={s.id || s.enrollment_id}
                                                onClick={() => { setSelectedStudent(s); setStudents([]); setSearchTerm(''); }}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <p className="text-sm font-black text-gray-900">{s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.student_number || 'No ID'} · {s.program_code || 'N/A'}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Document Type */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Document Type</label>
                        <select
                            value={form.document_type}
                            onChange={(e) => setForm(f => ({ ...f, document_type: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none"
                        >
                            {DOC_TYPES.map(dt => (
                                <option key={dt.value} value={dt.value}>{dt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Purpose (Optional)</label>
                        <input
                            type="text"
                            value={form.purpose}
                            onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                            placeholder="e.g., Employment requirement"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>

                    {/* Copies */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Copies</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={form.copies_released}
                            onChange={(e) => setForm(f => ({ ...f, copies_released: parseInt(e.target.value) || 1 }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Notes (Optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3}
                            placeholder="Notes visible only to registrar staff..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                        />
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !selectedStudent}
                        className="px-6 py-3 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Release Document
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};

// ─── Detail Modal ──────────────────────────────────────────────

const DocumentDetailModal = ({ doc, onClose, onRevoke, onReissue }) => (
    <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-100 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Document Details</h2>
                    <p className="font-mono text-xs text-gray-400 font-bold mt-1">{doc.document_code}</p>
                </div>
                <StatusBadge status={doc.status} />
            </div>

            <div className="p-8 space-y-5">
                <DetailRow label="Student" value={doc.student_name} sub={`${doc.student_number} · ${doc.student_program || 'N/A'}`} />
                <DetailRow label="Document Type" value={doc.document_type_display || doc.document_type} />
                <DetailRow label="Purpose" value={doc.purpose || '—'} />
                <DetailRow label="Copies Released" value={doc.copies_released} />
                <DetailRow label="Released By" value={doc.released_by_name} sub={formatDate(doc.released_at)} />
                {doc.notes && <DetailRow label="Internal Notes" value={doc.notes} />}

                {doc.status === 'REVOKED' && (
                    <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Revocation Details</p>
                        <p className="text-sm font-bold text-red-700">{doc.revocation_reason || 'No reason provided'}</p>
                        <p className="text-xs text-red-400 mt-1">By {doc.revoked_by_name} on {formatDate(doc.revoked_at)}</p>
                    </div>
                )}
            </div>

            <div className="p-8 border-t border-gray-100 flex gap-3 justify-end">
                <button onClick={onClose} className="px-6 py-3 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">
                    Close
                </button>
                {doc.status === 'ACTIVE' && (
                    <button
                        onClick={() => onRevoke(doc)}
                        className="px-6 py-3 rounded-2xl text-sm font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                    >
                        <XCircle className="w-4 h-4" /> Revoke
                    </button>
                )}
                {doc.status === 'REVOKED' && (
                    <button
                        onClick={() => onReissue(doc.document_code)}
                        className="px-6 py-3 rounded-2xl text-sm font-black text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Reissue
                    </button>
                )}
            </div>
        </div>
    </ModalOverlay>
);

const DetailRow = ({ label, value, sub }) => (
    <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 font-bold mt-0.5">{sub}</p>}
    </div>
);

// ─── Revoke Modal ──────────────────────────────────────────────

const RevokeModal = ({ doc, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        await onConfirm(doc.document_code, reason);
        setSubmitting(false);
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md">
                <div className="p-8 border-b border-gray-100">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                        <AlertTriangle className="w-7 h-7 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Revoke Document</h2>
                    <p className="text-xs text-gray-400 font-bold mt-1">This action is irreversible. The document will be marked as void.</p>
                </div>

                <div className="p-8 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-sm font-bold text-gray-700">{doc.document_type_display || doc.document_type}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.document_code} · {doc.student_name}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reason for Revocation *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Provide a clear reason for revocation..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !reason.trim()}
                        className="px-6 py-3 rounded-2xl text-sm font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Revocation
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};

// ─── Modal Overlay ─────────────────────────────────────────────

const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-lg">
            {children}
        </div>
    </div>
);

export default DocumentReleasePage;
