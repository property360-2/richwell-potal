import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

// Error Pages
import NotFound from '../pages/errors/NotFound';
import Forbidden from '../pages/errors/Forbidden';
import ServerError from '../pages/errors/ServerError';

// Demo Page (Temporary for verification)
import UIDemo from '../pages/demo/UIDemo'; // Placeholder for now

// Placeholder Pages (Will be created in later phases)
const Login = () => <div className="p-8">Login Page (Phase 2)</div>;
const Dashboard = () => <div className="p-8">Dashboard</div>;

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/demo" element={<UIDemo />} />

      {/* Error Routes */}
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />

      {/* Protected Routes - Base (Requires Auth) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PageWrapper title="Dashboard" />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Role-Specific Protected Routes Example */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR']} />}>
        <Route element={<PageWrapper title="User Management" />}>
          <Route path="/users" element={<div className="p-8">Users Page (Phase 2)</div>} />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
