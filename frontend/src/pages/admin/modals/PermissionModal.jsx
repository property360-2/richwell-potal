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
import { AdminService } from '../services/AdminService';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';

const AdminPermissionModal = ({ user, onClose, onUpdate }) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [updatingPerm, setUpdatingPerm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'granted', 'denied', 'custom'
    const [collapsedCategories, setCollapsedCategories] = useState({});

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

    const toggleCategory = (categoryName) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [categoryName]: !prev[categoryName]
        }));
    };

    // Filter permissions based on search and status
    const getFilteredCategories = () => {
        return categories.map(category => {
            const filteredPerms = category.permissions.filter(perm => {
                // Search filter
                const matchesSearch = searchQuery === '' || 
                    perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    perm.description.toLowerCase().includes(searchQuery.toLowerCase());

                // Status filter
                const matchesStatus = 
                    filterStatus === 'all' ||
                    (filterStatus === 'granted' && perm.has_permission) ||
                    (filterStatus === 'denied' && !perm.has_permission) ||
                    (filterStatus === 'custom' && perm.source !== 'role_default');

                return matchesSearch && matchesStatus;
            });

            return {
                ...category,
                permissions: filteredPerms,
                grantedCount: filteredPerms.filter(p => p.has_permission).length,
                totalCount: filteredPerms.length
            };
        }).filter(cat => cat.permissions.length > 0);
    };

    // Calculate summary stats
    const getSummaryStats = () => {
        const allPerms = categories.flatMap(cat => cat.permissions);
        const granted = allPerms.filter(p => p.has_permission).length;
        const custom = allPerms.filter(p => p.source !== 'role_default').length;
        return { total: allPerms.length, granted, custom };
    };

    if (!user) return null;

    const filteredCategories = getFilteredCategories();
    const stats = getSummaryStats();

    return (
        <Modal 
            isOpen={!!user} 
            onClose={onClose} 
            title="Manage Permissions"
            maxWidth="max-w-5xl"
        >
            {/* User Info */}
            <div className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {user.first_name[0]}{user.last_name[0]}
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-gray-900 leading-tight">{user.full_name}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user.role} • {user.email}</p>
                </div>
            </div>

            {/* Summary Stats */}
            {!loading && (
                <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Permission Summary</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                            <div className="text-2xl font-black text-blue-600">{stats.granted}/{stats.total}</div>
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1">Granted</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl">
                            <div className="text-2xl font-black text-green-600">{stats.granted}</div>
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1">Active</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                            <div className="text-2xl font-black text-purple-600">{stats.custom}</div>
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1">Custom</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="mb-6 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search permissions by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filterStatus === 'all' 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterStatus('granted')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filterStatus === 'granted' 
                                ? 'bg-green-600 text-white shadow-lg' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Granted
                    </button>
                    <button
                        onClick={() => setFilterStatus('denied')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filterStatus === 'denied' 
                                ? 'bg-red-600 text-white shadow-lg' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Denied
                    </button>
                    <button
                        onClick={() => setFilterStatus('custom')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filterStatus === 'custom' 
                                ? 'bg-purple-600 text-white shadow-lg' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {/* Permissions List */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Policy Schema...</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="py-20 text-center">
                        <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">No Permissions Found</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    filteredCategories.map((category) => {
                        const isCollapsed = collapsedCategories[category.name];
                        return (
                            <div key={category.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category.name)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wide">{category.name}</h4>
                                        <span className="text-xs font-black text-gray-500">
                                            {category.grantedCount}/{category.totalCount}
                                        </span>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                                </button>

                                {/* Category Permissions */}
                                {!isCollapsed && (
                                    <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {category.permissions.map((perm) => (
                                            <div 
                                                key={perm.code}
                                                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                                    perm.has_permission 
                                                        ? 'bg-green-50/50 border-green-200' 
                                                        : 'bg-gray-50/50 border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <div className={`p-1.5 rounded-lg ${
                                                            perm.has_permission ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                                                        }`}>
                                                            {perm.has_permission ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                        </div>
                                                        <p className="font-bold text-gray-900 text-xs leading-tight">{perm.name}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleToggle(perm.code, perm.has_permission)}
                                                        disabled={updatingPerm === perm.code || !perm.can_toggle}
                                                        className={`w-9 h-5 rounded-full transition-all relative flex items-center flex-shrink-0 ${
                                                            perm.has_permission ? 'bg-green-500' : 'bg-gray-300'
                                                        } ${!perm.can_toggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <div className={`w-3 h-3 bg-white rounded-full transition-all absolute ${
                                                            perm.has_permission ? 'left-5' : 'left-1'
                                                        }`} />
                                                        {updatingPerm === perm.code && (
                                                            <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-gray-500 font-medium leading-relaxed mb-2">{perm.description}</p>
                                                <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                                                    perm.source === 'role_default' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                }`}>
                                                    {perm.source.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
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
