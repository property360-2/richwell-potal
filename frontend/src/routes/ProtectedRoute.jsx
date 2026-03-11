import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role, isSuperUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but role is not yet loaded, wait
  if (isAuthenticated && !role) {
    return (
      <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (allowedRoles && role && !isSuperUser) {
    const normalizedRole = role.toUpperCase();
    const isAllowed = allowedRoles.some(r => r.toUpperCase() === normalizedRole);
    
    if (!isAllowed) {
      // User is logged in but doesn't have required role
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
