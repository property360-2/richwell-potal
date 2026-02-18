import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    FileText, 
    Printer, 
    Download, 
    CheckCircle, 
    XCircle,
    Loader2,
    Calendar,
    Eye
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SEO from '../../components/shared/SEO';

const RegistrarExamPermits = () => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [permits, setPermits] = useState([]);
    const [filteredPermits, setFilteredPermits] = useState([]);
    
    // Filters
    const [search, setSearch] = useState('');
    const [periodFilter, setPeriodFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PRINTED, PENDING

    useEffect(() => {
        fetchPermits();
    }, []);

    useEffect(() => {
        filterData();
    }, [search, periodFilter, statusFilter, permits]);

    const fetchPermits = async () => {
        try {
            setLoading(true);
            const res = await api.get(endpoints.examPermitList); // Add to api.jsx first!
            setPermits(res.results || res); // Handle pagination or list
        } catch (err) {
            console.error(err);
            error('Failed to load exam permits');
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let result = [...permits];

        // Search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => 
                p.enrollment?.student?.first_name?.toLowerCase().includes(q) ||
                p.enrollment?.student?.last_name?.toLowerCase().includes(q) ||
                p.enrollment?.student?.student_number?.includes(q) ||
                p.permit_code?.toLowerCase().includes(q)
            );
        }

        // Period
        if (periodFilter !== 'ALL') {
            result = result.filter(p => p.exam_period === periodFilter);
        }

        // Status
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'PRINTED') {
                result = result.filter(p => p.is_printed);
            } else if (statusFilter === 'PENDING') {
                result = result.filter(p => !p.is_printed);
            }
        }

        setFilteredPermits(result);
    };

    const handlePrintMark = async (id) => {
        try {
            await api.get(endpoints.printExamPermit(id));
            success('Permit marked as printed');
            // Update local state
            setPermits(current => 
                current.map(p => p.id === id ? { ...p, is_printed: true, printed_at: new Date().toISOString() } : p)
            );
        } catch (err) {
            error('Failed to update print status');
        }
    };

    const LoadingState = () => (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading permits...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SEO title="Exam Permit Management" description="Manage and print student exam permits." />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Permits</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Manage and verify student examination permits
                    </p>
                </div>
                <div className="flex gap-2">
                     <Button variant="secondary" icon={Download}>Export List</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search student, ID, or permit code..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select 
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                    >
                        <option value="ALL">All Periods</option>
                        <option value="PRELIM">Prelim</option>
                        <option value="MIDTERM">Midterm</option>
                        <option value="FINALS">Finals</option>
                    </select>
                    <select 
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PRINTED">Printed</option>
                        <option value="PENDING">Not Printed</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <LoadingState />
                ) : filteredPermits.length === 0 ? (
                    <div className="py-20 text-center">
                        <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900">No Permits Found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Permit Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Generated</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredPermits.map((permit) => (
                                    <tr key={permit.id} className="group hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">
                                                    {permit.enrollment?.student?.last_name}, {permit.enrollment?.student?.first_name}
                                                </p>
                                                <p className="text-xs font-medium text-gray-500 font-mono mt-0.5">
                                                    {permit.enrollment?.student?.student_number}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="blue" size="sm">{permit.exam_period}</Badge>
                                                <span className="text-xs font-mono text-gray-500">{permit.permit_code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-xs font-medium">
                                                    {new Date(permit.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {permit.is_printed ? (
                                                <Badge variant="green" size="sm" icon={CheckCircle}>Printed</Badge>
                                            ) : (
                                                <Badge variant="gray" size="sm" icon={Printer}>Ready</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handlePrintMark(permit.id)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Mark as Printed / Print"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrarExamPermits;
