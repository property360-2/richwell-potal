import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FileText, 
    Download, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    Printer, 
    ShieldCheck, 
    Loader2, 
    ChevronLeft 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import SEO from '../../components/shared/SEO';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const StudentExamPermits = () => {
    const { user } = useAuth();
    const { success, error, warning } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(null); // 'PRELIM', 'MIDTERM', 'FINALS' or null
    const [permits, setPermits] = useState([]);
    
    // Define exam periods
    const periods = ['PRELIM', 'MIDTERM', 'FINALS'];

    useEffect(() => {
        fetchPermits();
    }, []);

    const fetchPermits = async () => {
        try {
            setLoading(true);
            const res = await api.get(endpoints.myExamPermits);
            // Ensure we're setting an array, even if API returns object wrapper
            const permitsList = Array.isArray(res) ? res : (res.results || []);
            setPermits(permitsList);
        } catch (err) {
            console.error(err);
            // Don't show error on 404/empty, just show empty state
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (period) => {
        setGenerating(period);
        try {
            const res = await api.post(endpoints.generateExamPermit, {
                exam_period: period
            });
            
            success(`${period} Exam Permit generated successfully!`);
            fetchPermits(); // Refresh list
        } catch (err) {
            console.error(err);
            // Backend returns specific reasons (e.g. "Outstanding balance")
            error(err.message || `Failed to generate ${period} permit.`);
        } finally {
            setGenerating(null);
        }
    };

    const getPermitForPeriod = (period) => {
        return permits.find(p => p.exam_period === period);
    };

    // Helper to determine status color and icon
    const getStatusConfig = (permit) => {
        if (!permit) return { color: 'gray', icon: Clock, label: 'Not Generated' };
        if (permit.is_valid === false) return { color: 'red', icon: AlertCircle, label: 'Invalid' };
        if (permit.is_printed) return { color: 'emerald', icon: CheckCircle, label: 'Printed & Valid' };
        return { color: 'blue', icon: ShieldCheck, label: 'Generated' };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <SEO title="My Exam Permits" description="View and generate your examination permits." />
            
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/student/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Exam Permits</h1>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                {user?.student_profile?.school_year_label} • {user?.student_profile?.semester_label}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Info Assessment */}
                <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200 mb-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20"></div>
                    <div className="relative z-10 flex gap-6 items-start">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">Examination Requirements</h2>
                            <p className="text-blue-100 font-medium leading-relaxed max-w-2xl">
                                To generate your exam permit, you must have settled the required monthly installment for the respective examination period.
                                Once generated, present your permit code to the proctor or registrar.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Permits Crid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {periods.map((period) => {
                        const permit = getPermitForPeriod(period);
                        const status = getStatusConfig(permit);
                        const StatusIcon = status.icon;

                        return (
                            <div key={period} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-2xl bg-${status.color}-50 text-${status.color}-600`}>
                                        <StatusIcon className="w-8 h-8" />
                                    </div>
                                    <Badge variant={status.color} size="sm">{status.label}</Badge>
                                </div>

                                <div className="mb-auto">
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{period} PERMIT</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {permit ? `Ref: ${permit.permit_code}` : 'Not yet generated'}
                                    </p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-50">
                                    {permit ? (
                                        <div className="text-center">
                                            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Permit Code</p>
                                                <p className="text-2xl font-black text-gray-900 tracking-widest font-mono">{permit.permit_code}</p>
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 flex items-center justify-center gap-1">
                                                 <Printer className="w-3 h-3" /> 
                                                 {permit.is_printed ? `Printed on ${new Date(permit.printed_at).toLocaleDateString()}` : 'Ready for printing'}
                                            </p>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleGenerate(period)}
                                            loading={generating === period}
                                            disabled={!!generating}
                                            variant="primary"
                                            className="w-full py-3 text-sm font-black tracking-widest uppercase"
                                        >
                                            Generate Permit
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StudentExamPermits;
