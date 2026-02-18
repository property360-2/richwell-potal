import React, { useState, useEffect } from 'react';
import { api, endpoints } from '../../api';
import { 
    Shield, 
    Check, 
    X, 
    AlertCircle, 
    Loader2, 
    Info 
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ROLES = [
    { key: 'ADMIN', label: 'Admin' },
    { key: 'REGISTRAR', label: 'Registrar' },
    { key: 'HEAD_REGISTRAR', label: 'Head Reg.' },
    { key: 'ADMISSION_STAFF', label: 'Adm. Staff' },
    { key: 'CASHIER', label: 'Cashier' },
    { key: 'DEPARTMENT_HEAD', label: 'Dept. Head' },
    { key: 'PROFESSOR', label: 'Professor' },
    { key: 'STUDENT', label: 'Student' }
];

const PermissionsPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null); // { permId, role }
    const { showToast } = useToast();

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const data = await api.get(endpoints.permissionCategories);
            // data should be list of categories with nested permissions
            setCategories(data || []);
        } catch (error) {
            showToast('Failed to load permissions', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (permission, roleKey) => {
        if (toggling) return;
        
        const isGranted = permission.default_for_roles?.includes(roleKey);
        setToggling({ permId: permission.id, role: roleKey });

        try {
            const res = await api.post(endpoints.permissionToggle(permission.id), {
                role: roleKey
            });

            if (res.success) {
                // Update local state
                setCategories(prev => prev.map(cat => ({
                    ...cat,
                    permissions: cat.permissions.map(p => {
                        if (p.id === permission.id) {
                            return {
                                ...p,
                                default_for_roles: res.default_for_roles
                            };
                        }
                        return p;
                    })
                })));
                showToast(`Role ${isGranted ? 'removed' : 'added'} successfully`, 'success');
            }
        } catch (error) {
            showToast(error.message || 'Failed to update permission', 'error');
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                        Permission Matrix
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure default permissions for each role. Changes apply immediately.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-gray-50 z-10 w-1/3 min-w-[250px]">Permission</th>
                                {ROLES.map(role => (
                                    <th key={role.key} className="px-4 py-4 text-center min-w-[100px]">
                                        {role.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {categories.map(category => (
                                <React.Fragment key={category.id}>
                                    {/* Category Header */}
                                    <tr className="bg-blue-50/50">
                                        <td colSpan={ROLES.length + 1} className="px-6 py-3 font-semibold text-blue-800 flex items-center gap-2">
                                            {category.icon && <span className="text-xl">{category.icon}</span>}
                                            {category.name}
                                        </td>
                                    </tr>
                                    
                                    {/* Permissions */}
                                    {category.permissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={ROLES.length + 1} className="px-6 py-4 text-center text-gray-400 italic">
                                                No permissions defined in this category
                                            </td>
                                        </tr>
                                    ) : category.permissions.map(permission => (
                                        <tr key={permission.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 sticky left-0 bg-white z-10 group-hover:bg-gray-50 border-r border-transparent">
                                                <div className="font-medium text-gray-900">{permission.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{permission.description}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-1">{permission.code}</div>
                                            </td>
                                            {ROLES.map(role => {
                                                const hasPermission = permission.default_for_roles?.includes(role.key);
                                                const isProcessing = toggling?.permId === permission.id && toggling?.role === role.key;

                                                return (
                                                    <td key={role.key} className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => handleToggle(permission, role.key)}
                                                            disabled={isProcessing}
                                                            className={`
                                                                w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto
                                                                ${hasPermission 
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                    : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}
                                                                ${isProcessing ? 'opacity-50 cursor-wait' : ''}
                                                            `}
                                                        >
                                                            {isProcessing ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : hasPermission ? (
                                                                <Check className="w-5 h-5" />
                                                            ) : (
                                                                <X className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p>
                    <strong>Note:</strong> These settings control default permissions for roles. 
                    Specific user overrides (grants/revokes) take precedence over these defaults.
                </p>
            </div>
        </div>
    );
};

export default PermissionsPage;
