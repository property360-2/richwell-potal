import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    CheckCircle, 
    XCircle, 
    Lock, 
    Unlock, 
    Loader2, 
    ChevronRight,
    Search,
    User as UserIcon,
    Mail,
    Phone,
    Briefcase,
    ShieldCheck
} from 'lucide-react';
import { AdminService } from './AdminService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

const AdminPermissionModal = ({ user, onClose, onUpdate }) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [updatingPerm, setUpdatingPerm] = useState(null);

    useEffect(() => {
        if (user) {
            fetchPermissions();
        }
    }, [user]);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const data = await AdminService.getUserPermissions(user.id);
            setCategories(data.categories || []);
        } catch (err) {
            error('Failed to load user permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (permCode, currentGranted) => {
        try {
            setUpdatingPerm(permCode);
            await AdminService.updatePermission(user.id, permCode, !currentGranted);
            success('Permission updated successfully');
            await fetchPermissions();
            if (onUpdate) onUpdate();
        } catch (err) {
            error(err.message || 'Failed to update permission');
        } finally {
            setUpdatingPerm(null);
        }
    };

    if (!user) return null;

    return (
        <Modal 
            isOpen={!!user} 
            onClose={onClose} 
            title="Manage Security Permissions"
            maxWidth="max-w-4xl"
        >
            <div className="p-1 px-4 mb-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {user.first_name[0]}{user.last_name[0]}
                </div>
                <div>
                    <h3 className="font-black text-gray-900 leading-tight">{user.full_name}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user.role} • {user.email}</p>
                </div>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Policy Schema...</p>
                    </div>
                ) : (
                    categories.map((category) => (
                        <div key={category.name} className="relative group">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">{category.name}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {category.permissions.map((perm) => (
                                    <div 
                                        key={perm.code}
                                        className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-3 relative overflow-hidden ${
                                            perm.has_permission 
                                                ? 'bg-white border-green-100 shadow-sm' 
                                                : 'bg-gray-50/50 border-gray-100 opacity-80'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                                            perm.has_permission ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                                        }`}>
                                            {perm.has_permission ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="font-bold text-gray-900 text-sm leading-tight">{perm.name}</p>
                                                <button 
                                                    onClick={() => handleToggle(perm.code, perm.has_permission)}
                                                    disabled={updatingPerm === perm.code || !perm.can_toggle}
                                                    className={`w-10 h-6 rounded-full transition-all relative flex items-center ${
                                                        perm.has_permission ? 'bg-green-500' : 'bg-gray-300'
                                                    } ${!perm.can_toggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-all absolute ${
                                                        perm.has_permission ? 'left-5' : 'left-1'
                                                    }`} />
                                                    {updatingPerm === perm.code && (
                                                        <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{perm.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                                                    perm.source === 'role_default' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                }`}>
                                                    {perm.source.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-8 flex justify-end">
                <Button variant="secondary" onClick={onClose} className="px-8">
                    DONE
                </Button>
            </div>
        </Modal>
    );
};

export default AdminPermissionModal;
