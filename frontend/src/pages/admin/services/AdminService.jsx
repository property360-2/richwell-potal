import { api, endpoints } from '../../../api';

export const AdminService = {
    // User Management
    getUsers: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.role) params.append('role', filters.role);
        if (filters.include_students) params.append('include_students', 'true');

        const queryString = params.toString();
        const url = queryString ? `${endpoints.users}?${queryString}` : endpoints.users;
        return await api.get(url);
    },

    createUser: async (userData) => {
        const url = userData.role === 'STUDENT' ? endpoints.registrarStudents : endpoints.staff;
        return await api.post(url, userData);
    },

    generateStudentId: async () => {
        return await api.get(endpoints.generateStudentId);
    },

    getUserPermissions: async (userId) => {
        return await api.get(endpoints.userPermissions(userId));
    },

    updatePermission: async (userId, permissionCode, granted) => {
        return await api.post(endpoints.updateUserPermission(userId), {
            permission_code: permissionCode,
            granted: granted
        });
    },

    bulkUpdatePermissions: async (userId, permissions) => {
        return await api.post(endpoints.bulkUpdatePermissions(userId), { permissions });
    },

    // System Configuration
    getConfigs: async () => {
        return await api.get(endpoints.systemConfig);
    },

    saveConfig: async (configData) => {
        return await api.post(endpoints.systemConfig, configData);
    },

    updateConfig: async (key, configData) => {
        return await api.put(endpoints.systemConfigDetail(key), configData);
    },

    deleteConfig: async (key) => {
        return await api.delete(endpoints.systemConfigDetail(key));
    },

    // Audit Logs
    getAuditLogs: async (filters = {}, page = 1) => {
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.target_model) params.append('target_model', filters.target_model);
        if (filters.search) params.append('search', filters.search);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (page > 1) params.append('page', page);

        const queryString = params.toString();
        const url = queryString ? `${endpoints.auditLogs}?${queryString}` : endpoints.auditLogs;
        return await api.get(url);
    },

    getAuditLogFilters: async () => {
        return await api.get(endpoints.auditLogFilters);
    },

    getAuditLogDetail: async (id) => {
        return await api.get(endpoints.auditLogDetail(id));
    },

    // Permission Categories (for discovery)
    getPermissionCategories: async () => {
        return await api.get(endpoints.permissionCategories);
    },

    // Term Management
    getSemesters: async () => {
        return await api.get(endpoints.semesters);
    },

    createSemester: async (data) => {
        return await api.post(endpoints.semesters, data);
    },

    updateSemester: async (id, data) => {
        return await api.patch(endpoints.semesterDetail(id), data);
    },

    deleteSemester: async (id) => {
        return await api.delete(endpoints.semesterDetail(id));
    },

    activateSemester: async (id) => {
        return await api.post(endpoints.activateTerm(id));
    }
};
