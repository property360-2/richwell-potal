import React, { useState, useEffect, useMemo } from 'react';
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
import { AdminService } from './services/AdminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import AddUserModal from './modals/AddUserModal';

const ROLE_LABELS = {
    'STUDENT': { label: 'Student', color: 'gray' },
    'PROFESSOR': { label: 'Professor', color: 'blue' },
    'REGISTRAR': { label: 'Registrar', color: 'purple' },
    'HEAD_REGISTRAR': { label: 'Head Registrar', color: 'indigo' },
    'ADMISSION_STAFF': { label: 'Admission Staff', color: 'green' },
    'DEPARTMENT_HEAD': { label: 'Dept. Head', color: 'orange' },
    'CASHIER': { label: 'Cashier', color: 'yellow' },
    'ADMIN': { label: 'Admin', color: 'red' }
};

// Roles that can add users
const CAN_ADD_USERS = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF'];

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Check if current user can add users
    const canAddUser = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.is_superuser) return true;
        return CAN_ADD_USERS.includes(currentUser.role);
    }, [currentUser]);

    // Fetch users when filters change or search changes (with debounce)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [search, roleFilter, programFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await AdminService.getUsers({ search, role: roleFilter, program: programFilter });
            setUsers(data.users || []);
        } catch (err) {
            error('Failed to load institutional user records');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="User Management" description="Institutional access control and security management." />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">User Management</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Institutional Access Control • Security Policy Engine</p>
                </div>
                {canAddUser && (
                    <Button 
                        variant="primary" 
                        icon={UserPlus}
                        className="shadow-lg shadow-blue-500/20"
                        onClick={() => setShowAddUser(true)}
                    >
                        ADD USER
                    </Button>
                )}
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
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

                </div>
            </div>

            {/* Results Table */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing User Database...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                    <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">No Access Records Found</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Try adjusting your query parameters</p>
                </div>
            ) : (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Email</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => {
                                    const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'gray' };
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                         <p className="font-black text-gray-900 tracking-tight">{user.full_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-bold">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                                                        {user.student_number || 'STAFF'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                                    user.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    <Shield className="w-3 h-3" />
                                                    {roleInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        variant="secondary" 
                                                        className="text-[10px] font-black tracking-widest px-4 py-2 rounded-xl"
                                                        icon={Settings}
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setShowAddUser(true);
                                                        }}
                                                    >
                                                        EDIT
                                                    </Button>
                                                    <Button 
                                                        variant="secondary" 
                                                        className="text-[10px] font-black tracking-widest px-4 py-2 rounded-xl opacity-50 hover:opacity-100"
                                                        icon={Activity}
                                                        onClick={() => window.location.href=`/admin/audit-logs?search=${user.email}`}
                                                    >
                                                        LOGS
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AddUserModal 
                isOpen={showAddUser}
                onClose={() => {
                    setShowAddUser(false);
                    setEditingUser(null);
                }}
                editingUser={editingUser}
                onSuccess={fetchUsers}
            />
        </div>
    );
};

export default UserManagement;
