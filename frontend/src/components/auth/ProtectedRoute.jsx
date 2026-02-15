import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login but save the attempted location
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    const getDashboardPath = (role) => {
        const routes = {
            'STUDENT': '/dashboard',
            'ADMISSION_STAFF': '/admission/dashboard',
            'ADMIN': '/admin/dashboard',
            'REGISTRAR': '/registrar/dashboard',
            'HEAD_REGISTRAR': '/registrar/dashboard',
            'DEPARTMENT_HEAD': '/head/dashboard',
            'CASHIER': '/cashier/dashboard',
            'PROFESSOR': '/professor/dashboard'
        };
        return routes[role] || '/dashboard';
    };

    if (roles && !roles.includes(user.role)) {
        // Role not authorized - redirect to THEIR dashboard
        return <Navigate to={getDashboardPath(user.role)} replace />;
    }

    return children;
};

export default ProtectedRoute;
