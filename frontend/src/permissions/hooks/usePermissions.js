import { useAuth } from '../context/AuthContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './constants';

/**
 * Hook to check if the current user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether the user has the permission
 */
export const usePermission = (permission) => {
    const { user } = useAuth();

    if (!user || !user.role) {
        return false;
    }

    return hasPermission(user.role, permission);
};

/**
 * Hook to check if the current user has any of the given permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the user has any of the permissions
 */
export const useAnyPermission = (permissions) => {
    const { user } = useAuth();

    if (!user || !user.role) {
        return false;
    }

    return hasAnyPermission(user.role, permissions);
};

/**
 * Hook to check if the current user has all of the given permissions
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the user has all of the permissions
 */
export const useAllPermissions = (permissions) => {
    const { user } = useAuth();

    if (!user || !user.role) {
        return false;
    }

    return hasAllPermissions(user.role, permissions);
};

/**
 * Hook to get all permissions for the current user
 * @returns {string[]} - Array of permissions
 */
export const useUserPermissions = () => {
    const { user } = useAuth();

    if (!user || !user.role) {
        return [];
    }

    return ROLE_PERMISSIONS[user.role] || [];
};
