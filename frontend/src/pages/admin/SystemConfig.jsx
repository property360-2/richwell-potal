import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Save, 
    Trash2, 
    Plus, 
    Loader2, 
    AlertCircle, 
    Code, 
    Info,
    RefreshCw,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { AdminService } from './services/AdminService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SEO from '../../components/shared/SEO';

const AdminSystemConfig = () => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        key: '',
        value: '',
        description: ''
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await AdminService.getConfigs();
            setConfigs(data || []);
        } catch (err) {
            error('Failed to load global system parameters');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (config = null) => {
        if (config) {
            setEditingConfig(config);
            setFormData({
                key: config.key,
                value: JSON.stringify(config.value, null, 2),
                description: config.description || ''
            });
        } else {
            setEditingConfig(null);
            setFormData({ key: '', value: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            let parsedValue;
            try {
                parsedValue = JSON.parse(formData.value);
            } catch (err) {
                // If not JSON, try to handle as string if it's simple
                try {
                    parsedValue = JSON.parse(`"${formData.value}"`);
                } catch (e2) {
                    error('Invalid value format. Must be a valid JSON type.');
                    return;
                }
            }

            const payload = {
                key: formData.key.toUpperCase().replace(/\s+/g, '_'),
                value: parsedValue,
                description: formData.description
            };

            if (editingConfig) {
                await AdminService.updateConfig(editingConfig.key, payload);
                success('Configuration packet updated');
            } else {
                await AdminService.saveConfig(payload);
                success('New system parameter registered');
            }
            
            setIsModalOpen(false);
            fetchConfigs();
        } catch (err) {
            error(err.message || 'Transmission failure');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to delete ${key}? This may destabilize institutional operations.`)) return;
        try {
            await AdminService.deleteConfig(key);
            success('Configuration node decommissioned');
            fetchConfigs();
        } catch (err) {
            error('Failed to remove configuration point');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="System Configuration" description="Global portal parameters and institutional toggles." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">System Configuration</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Global Parameters • Environment Variables</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()} className="shadow-lg shadow-blue-500/20 px-8">
                    NEW PARAMETER
                </Button>
            </div>

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Polling Config Engine...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {configs.map((config) => (
                        <div key={config.key} className="group bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 hover:shadow-2xl transition-all duration-500">
                            <div className="p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                                            <Settings className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 tracking-tight text-lg leading-tight uppercase font-mono">{config.key}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Status: Operational</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900 rounded-3xl p-5 mb-6 relative overflow-hidden group/code shadow-inner">
                                    <pre className="text-xs font-mono text-blue-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                        {JSON.stringify(config.value, null, 2)}
                                    </pre>
                                </div>

                                <p className="text-sm font-medium text-gray-500 leading-relaxed mb-8 flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-300" />
                                    {config.description || 'No operational description provided.'}
                                </p>

                                <div className="pt-6 border-t border-gray-50 flex gap-3">
                                    <Button 
                                        variant="blue-ghost" 
                                        className="flex-1 text-[10px] font-black tracking-widest py-4 rounded-2xl"
                                        onClick={() => handleOpenModal(config)}
                                    >
                                        OVERRIDE
                                    </Button>
                                    <button 
                                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        onClick={() => handleDelete(config.key)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {configs.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                            <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Config Engine Empty</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Initialize parameters to start managing the environment</p>
                        </div>
                    )}
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingConfig ? "Override Parameter" : "Register Parameter"}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Config Key</label>
                        <input 
                            type="text"
                            disabled={!!editingConfig}
                            value={formData.key}
                            onChange={(e) => setFormData({...formData, key: e.target.value})}
                            placeholder="OPERATIONAL_MODE"
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-mono font-bold text-gray-900 disabled:opacity-50"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Value (JSON Format)</label>
                        <textarea 
                            value={formData.value}
                            onChange={(e) => setFormData({...formData, value: e.target.value})}
                            placeholder='true, 1, or {"mode": "stable"}'
                            rows={6}
                            className="w-full px-6 py-4 bg-gray-900 border-2 border-transparent rounded-2xl focus:border-blue-500 text-blue-400 outline-none transition-all font-mono text-sm shadow-inner"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Operational Context</label>
                        <textarea 
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="Explain the impact of this parameter..."
                            rows={3}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button variant="secondary" className="flex-1 py-4" type="button" onClick={() => setIsModalOpen(false)}>
                            ABORT
                        </Button>
                        <Button variant="primary" className="flex-1 py-4 shadow-xl shadow-blue-500/20" type="submit" loading={saving}>
                            COMMIT CHANGES
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminSystemConfig;
