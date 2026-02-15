import React from 'react';
import { usePermission, useAnyPermission, useAllPermissions } from '../hooks/usePermissions';

/**
 * Component that conditionally renders children based on permission
 * @param {string} permission - Required permission
 * @param {React.ReactNode} children - Content to render if permission is granted
 * @param {React.ReactNode} fallback - Content to render if permission is denied
 */
export const PermissionGate = ({ permission, children, fallback = null }) => {
    const hasAccess = usePermission(permission);
    
    return hasAccess ? children : fallback;
};

/**
 * Component that renders children if user has ANY of the given permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @param {React.ReactNode} children - Content to render if permission is granted
 * @param {React.ReactNode} fallback - Content to render if permission is denied
 */
export const AnyPermissionGate = ({ permissions, children, fallback = null }) => {
    const hasAccess = useAnyPermission(permissions);
    
    return hasAccess ? children : fallback;
};

/**
 * Component that renders children if user has ALL of the given permissions
 * @param {string[]} permissions - Array of permissions (user needs all)
 * @param {React.ReactNode} children - Content to render if permission is granted
 * @param {React.ReactNode} fallback - Content to render if permission is denied
 */
export const AllPermissionsGate = ({ permissions, children, fallback = null }) => {
    const hasAccess = useAllPermissions(permissions);
    
    return hasAccess ? children : fallback;
};

/**
 * Higher-order component that wraps a component with permission checking
 * @param {React.Component} Component - Component to wrap
 * @param {string} permission - Required permission
 * @param {React.ReactNode} fallback - Component to render if permission is denied
 */
export const withPermission = (Component, permission, fallback = null) => {
    return (props) => (
        <PermissionGate permission={permission} fallback={fallback}>
            <Component {...props} />
        </PermissionGate>
    );
};
