import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, 
    AlertCircle, 
    X, 
    ChevronRight,
    Activity
} from 'lucide-react';
import { api } from '../../api';

const DashboardAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            // Check if user has permission first? 
            // The API handles it, but frontend might want to be safe.
            // We'll just try/catch safely.
            const res = await api.get('/audit/dashboard/alerts/');
            if (res && res.alerts) {
                setAlerts(res.alerts);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard alerts:", err);
            // Silent failure is better here than blocking the dashboard
        } finally {
            setLoading(false);
        }
    };

    if (loading || alerts.length === 0 || !visible) return null;

    const dangerAlerts = alerts.filter(a => a.level === 'danger');
    const warningAlerts = alerts.filter(a => a.level === 'warning');

    // Prioritize danger, then warning
    const sortedAlerts = [...dangerAlerts, ...warningAlerts];

    return (
        <div className="mb-8 animate-fade-in-up">
            <div className="bg-white rounded-3xl shadow-xl shadow-red-100/50 border border-red-50 overflow-hidden">
                <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">System Alerts</h3>
                            <p className="text-xs font-bold text-red-500">{alerts.length} Issues Detected</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setVisible(false)}
                        className="p-2 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="divide-y divide-red-50">
                    {sortedAlerts.map((alert, index) => (
                        <div key={index} className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${alert.level === 'danger' ? 'bg-red-50/10' : ''}`}>
                            {alert.level === 'danger' ? (
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold ${alert.level === 'danger' ? 'text-red-700' : 'text-gray-800'}`}>
                                    {alert.type.replace(/_/g, ' ')}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                    {alert.message}
                                </p>
                            </div>

                            {alert.target_id && (
                                <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardAlerts;
