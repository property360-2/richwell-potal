import React, { useState, useEffect } from 'react';
import { 
    Award, 
    ArrowLeft, 
    Search, 
    ChevronDown, 
    Loader2, 
    History, 
    CheckCircle2, 
    XCircle, 
    MessageSquare,
    Clock,
    User,
    BookOpen,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import HeadService from './services/HeadService';

const HeadResolutions = () => {
    const navigate = useNavigate();
    const { success, error, info, warning } = useToast();
    const [loading, setLoading] = useState(true);
    const [resolutions, setResolutions] = useState([]);
    const [selectedRes, setSelectedRes] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchResolutions();
    }, []);

    const fetchResolutions = async () => {
        try {
            setLoading(true);
            const data = await HeadService.getPendingResolutions();
            setResolutions(data);
        } catch (err) {
            error('Failed to sync resolution queue');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (action === 'reject' && !notes) {
            return warning('Please provide a reason for rejection');
        }

        try {
            setProcessing(true);
            const res = await HeadService.processResolution(selectedRes.id, action, { notes, reason: notes });
            if (res) {
                success(action === 'approve' ? 'Resolution forwarded to Registrar' : 'Request declined');
                setSelectedRes(null);
                setNotes('');
                fetchResolutions();
            }
        } catch (err) {
            error('Transaction was not finalized');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Grade Resolutions" description="Review and approve grade change requests." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Grade Authority
                        <span className="text-indigo-600/20"><Shield className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Reviewing requests for academic record amendments
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white border border-gray-100 rounded-[28px] px-8 py-3 shadow-xl shadow-indigo-500/5 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pending Action</p>
                            <p className="text-xl font-black text-indigo-600 tracking-tighter">{resolutions.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-500/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Grade Change</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Requested By</th>
                            <th className="px-10 py-6 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {resolutions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-24 text-center">
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 tracking-tight">System All-Clear</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">No pending grade resolutions awaiting your review</p>
                                </td>
                            </tr>
                        ) : resolutions.map((res) => (
                            <tr key={res.id} className="hover:bg-gray-50/30 transition-all group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-sm shadow-sm">
                                            {res.student_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 tracking-tight leading-none mb-1">{res.student_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{res.student_number}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <p className="text-xs font-black text-indigo-600">{res.subject_code}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[200px]">{res.subject_title}</p>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-500">{res.original_grade || 'INC'}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-300" />
                                        <span className="px-3 py-1 bg-indigo-50 rounded-lg text-xs font-black text-indigo-600 border border-indigo-100">{res.requested_grade}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <p className="text-xs font-black text-gray-900">{res.requested_by_name}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(res.created_at).toLocaleDateString()}</p>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button 
                                        onClick={() => setSelectedRes(res)}
                                        className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
                                    >
                                        Review Request
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Resolution Modal */}
            {selectedRes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedRes(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in duration-500">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">Review Resolution</h3>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Case ID: {selectedRes.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setSelectedRes(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                                <XCircle className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Student</p>
                                    <p className="text-sm font-black text-gray-900">{selectedRes.student_name}</p>
                                    <p className="text-xs font-bold text-gray-500 tracking-tighter">{selectedRes.student_number}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject</p>
                                    <p className="text-sm font-black text-gray-900">{selectedRes.subject_code}</p>
                                    <p className="text-xs font-bold text-gray-500 tracking-tighter">{selectedRes.subject_title}</p>
                                </div>
                            </div>

                            <div className="p-8 bg-indigo-50 rounded-[40px] border border-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp className="w-20 h-20" /></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="text-center">
                                        <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Original</span>
                                        <span className="text-4xl font-black text-gray-400 tracking-tighter">{selectedRes.original_grade || 'INC'}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 opacity-20">
                                        <div className="h-0.5 w-12 bg-indigo-900" />
                                        <ArrowRight className="w-4 h-4 text-indigo-900" />
                                        <div className="h-0.5 w-12 bg-indigo-900" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Requested</span>
                                        <span className="text-5xl font-black text-indigo-600 tracking-tighter">{selectedRes.requested_grade}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Instructor Justification
                                </h4>
                                <div className="p-6 bg-gray-50 rounded-3xl border-l-[6px] border-indigo-500 italic text-sm font-bold text-gray-700">
                                    "{selectedRes.reason || 'No justification provided.'}"
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Oversight Notes</label>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add optional notes for the Registrar..."
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:bg-white focus:border-indigo-100 transition-all min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="p-10 border-t border-gray-50 flex gap-4">
                            <Button variant="danger" className="flex-1 py-5" onClick={() => handleAction('reject')} disabled={processing}>REJECT</Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 py-5" 
                                icon={CheckCircle2}
                                onClick={() => handleAction('approve')}
                                disabled={processing}
                            >
                                {processing ? 'PROCESSING...' : 'APPROVE & FORWARD'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeadResolutions;
