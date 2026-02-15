import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Filter, 
    Shield, 
    Activity, 
    Settings, 
    MoreVertical, 
    Mail, 
    UserPlus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    Lock,
    Unlock,
    Hash
} from 'lucide-react';
import { AdminService } from './AdminService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import AdminPermissionModal from './AdminPermissionModal';

const ROLE_LABELS = {
    'STUDENT': { label: 'Student', color: 'gray' },
    'PROFESSOR': { label: 'Professor', color: 'blue' },
    'CASHIER': { label: 'Cashier', color: 'emerald' },
    'REGISTRAR': { label: 'Registrar', color: 'orange' },
    'HEAD_REGISTRAR': { label: 'Head Registrar', color: 'red' },
    'ADMISSION_STAFF': { label: 'Admission', color: 'teal' },
    'DEPARTMENT_HEAD': { label: 'Dept Head', color: 'purple' },
    'ADMIN': { label: 'Administrator', color: 'indigo' }
};

const AdminUserManagement = () => {
    const { error } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await AdminService.getUsers({ search, role: roleFilter });
            setUsers(data.users || []);
        } catch (err) {
            error('Failed to load institutional user records');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="User Management" description="Institutional access control and security management." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">User Management</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Institutional Access Control • Security Policy Engine</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" icon={Activity} onClick={() => window.location.href='/admin/audit-logs'}>
                        AUDIT ENGINE
                    </Button>
                    <Button variant="primary" icon={Settings} onClick={() => window.location.href='/admin/config'}>
                        SYSTEM CONFIG
                    </Button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-6 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search by name, email, or student number..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="pl-10 pr-10 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none appearance-none font-black text-[10px] uppercase tracking-widest text-gray-600 cursor-pointer min-w-[180px]"
                            >
                                <option value="">All Institutional Roles</option>
                                {Object.entries(ROLE_LABELS).map(([val, info]) => (
                                    <option key={val} value={val}>{info.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <Button variant="primary" className="px-8 shadow-lg shadow-blue-500/20" type="submit">
                            QUERY
                        </Button>
                    </div>
                </form>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing User Database...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <UserCard 
                            key={user.id} 
                            user={user} 
                            onManage={() => setSelectedUser(user)}
                        />
                    ))}
                    {users.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                            <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">No Access Records Found</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Try adjusting your query parameters</p>
                        </div>
                    )}
                </div>
            )}

            {selectedUser && (
                <AdminPermissionModal 
                    user={selectedUser} 
                    onClose={() => setSelectedUser(null)}
                    onUpdate={fetchUsers}
                />
            )}
        </div>
    );
};

const UserCard = ({ user, onManage }) => {
    const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'gray' };
    
    return (
        <div className="group bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 overflow-hidden">
            <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-blue-50 group-hover:scale-110 transition-transform">
                            {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 tracking-tight text-lg leading-tight">{user.full_name}</h3>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">ID: {user.student_number || 'STAFF-CORP'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-500">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-bold truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                user.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                             }`}>
                                {roleInfo.label}
                             </span>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {user.permission_count} Polices
                             </span>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex gap-3">
                    <Button 
                        variant="blue-ghost" 
                        className="flex-1 text-[10px] font-black tracking-widest py-4 rounded-2xl"
                        icon={ShieldCheck}
                        onClick={onManage}
                    >
                        SECURITY
                    </Button>
                    <Button 
                        variant="secondary" 
                        className="flex-1 text-[10px] font-black tracking-widest py-4 rounded-2xl"
                        icon={Activity}
                        onClick={() => window.location.href=`/admin/audit-logs?search=${user.email}`}
                    >
                        LOGS
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminUserManagement;
