import React from 'react';
import { 
    Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../components/shared/SEO';

const AdminDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Admin Console" description="System-level management and oversight." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Admin Console</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Universal System Oversight • Operational Integrity
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link to="/admin/audit-logs" className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-500/5 text-gray-400 hover:text-blue-600 transition-all font-black text-[10px] uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Live Audit Trail
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-500/5 p-12 text-center">
                <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-8">
                        <Activity className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-4">System Operational</h2>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">
                        All modules are functioning within normal parameters. Audit trails are active and being logged.
                    </p>
                    <Link to="/admin/audit-logs" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">
                        View Detailed Audit Activity
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
