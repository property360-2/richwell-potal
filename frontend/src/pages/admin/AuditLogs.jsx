import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    Search, 
    Calendar, 
    User, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Info, 
    Clock, 
    Globe, 
    Shield, 
    Database,
    Download
} from 'lucide-react';
import { AdminService } from './services/AdminService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SEO from '../../components/shared/SEO';

const AdminAuditLogs = () => {
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [filters, setFilters] = useState({
        actions: [],
        targetModels: []
    });
    const [activeFilters, setActiveFilters] = useState({
        action: '',
        target_model: '',
        search: '',
        date_from: '',
        date_to: ''
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        count: 0,
        next: false,
        previous: false
    });
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        fetchMetadata();
        fetchLogs();
    }, []);

    const fetchMetadata = async () => {
        try {
            const data = await AdminService.getAuditLogFilters();
            setFilters({
                actions: data.actions || [],
                targetModels: data.target_models || []
            });
        } catch (err) {
            console.error('Failed to load filter metadata');
        }
    };

    const fetchLogs = async (page = 1) => {
        try {
            setLoading(true);
            const data = await AdminService.getAuditLogs(activeFilters, page);
            setLogs(data.results || []);
            setPagination({
                currentPage: page,
                count: data.count || 0,
                next: !!data.next,
                previous: !!data.previous
            });
        } catch (err) {
            error('Failed to load system audit stream');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        fetchLogs(1);
    };

    const clearFilters = () => {
        const reset = {
            action: '',
            target_model: '',
            search: '',
            date_from: '',
            date_to: ''
        };
        setActiveFilters(reset);
        fetchLogs(1);
    };

    const getActionColor = (action) => {
        if (action.includes('CREATED') || action.includes('ENROLLED')) return 'bg-green-100 text-green-700';
        if (action.includes('DELETED') || action.includes('DROPPED')) return 'bg-red-100 text-red-700';
        if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-700';
        if (action.includes('UPDATED')) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Audit Engine" description="Real-time system activity and institutional oversight." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Audit Engine</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Real-time Telemetry • Institutional Oversight</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" icon={Download} className="text-gray-600">
                        EXPORT DATA
                    </Button>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Global Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="User, Model, or ID..."
                                value={activeFilters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Action Vector</label>
                        <select 
                            value={activeFilters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none appearance-none font-bold text-xs cursor-pointer"
                        >
                            <option value="">All Vectors</option>
                            {filters.actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Target Schema</label>
                        <select 
                            value={activeFilters.target_model}
                            onChange={(e) => handleFilterChange('target_model', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none appearance-none font-bold text-xs cursor-pointer"
                        >
                            <option value="">All Models</option>
                            {filters.targetModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Time Delta - From</label>
                        <input 
                            type="date"
                            value={activeFilters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Time Delta - To</label>
                        <input 
                            type="date"
                            value={activeFilters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-xs"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 border-t border-gray-50 pt-8">
                    <Button variant="secondary" className="px-8 text-[10px]" onClick={clearFilters}>
                        RESET VECTORS
                    </Button>
                    <Button variant="primary" className="px-8 text-[10px] shadow-lg shadow-blue-500/10" onClick={applyFilters}>
                        EXECUTE QUERY
                    </Button>
                </div>
            </div>

            {/* Logs Stream */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporal Node</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Actor</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Vector</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Schema Path</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Telemetry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Stream...</p>
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs">
                                                {(log.actor_name || 'SYS')[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-800 tracking-tight">{log.actor_name || 'SYSTEM'}</span>
                                                <span className="text-[10px] font-bold text-gray-400">{log.actor_email || 'CORE'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getActionColor(log.action)}`}>
                                            {log.action_display}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                                <Database className="w-3 h-3 text-gray-300" /> {log.target_model}
                                            </span>
                                            <span className="text-[9px] font-mono text-gray-400 mt-1 truncate max-w-[150px]">
                                                {log.target_id || '---'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg transition-all"
                                        >
                                            <Info className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <Activity className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">No Events Detected</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Adjust your query vectors to find results</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Node Count: <span className="text-gray-900">{pagination.count.toLocaleString()}</span> Events
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={!pagination.previous}
                            onClick={() => fetchLogs(pagination.currentPage - 1)}
                            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-6 flex items-center bg-blue-600 rounded-xl text-white font-black text-xs shadow-lg shadow-blue-500/20">
                            {pagination.currentPage}
                        </div>
                        <button 
                            disabled={!pagination.next}
                            onClick={() => fetchLogs(pagination.currentPage + 1)}
                            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Event Telemetry Details"
                maxWidth="max-w-2xl"
            >
                {selectedLog && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Temporal Stamp</p>
                                <p className="text-sm font-black text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">IP Address Node</p>
                                <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-600" /> {selectedLog.ip_address || 'INTRA-SYSTEM'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Security Action</p>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block mt-1 ${getActionColor(selectedLog.action)}`}>
                                    {selectedLog.action_display}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Actor Level</p>
                                <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-600" /> {selectedLog.actor_name || 'SYSTEM'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Data Payload Details</p>
                            <div className="bg-gray-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group/payload">
                                <pre className="text-xs font-mono text-blue-400 overflow-x-auto whitespace-pre-wrap leading-relaxed h-[300px] custom-scrollbar">
                                    {JSON.stringify(selectedLog.payload, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button variant="secondary" className="w-full py-4 rounded-2xl" onClick={() => setSelectedLog(null)}>
                                DISMISS TELEMETRY
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminAuditLogs;
