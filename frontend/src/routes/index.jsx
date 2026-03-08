import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
import { useAuth } from '../hooks/useAuth';

// Auth Pages
import Login from '../pages/auth/Login';

// Error Pages
import NotFound from '../pages/errors/NotFound';
import Forbidden from '../pages/errors/Forbidden';
import ServerError from '../pages/errors/ServerError';

// Demo Page
import UIDemo from '../pages/demo/UIDemo';

// Admin Pages
import StaffManagement from '../pages/admin/StaffManagement';
import AcademicManagement from '../pages/admin/AcademicManagement';
import TermManagement from '../pages/admin/TermManagement';
import RoomManagement from '../pages/admin/RoomManagement';
import PublicApplication from '../pages/PublicApplication';
import ApplicantManagement from '../pages/admission/ApplicantManagement';
import DocumentVerification from '../pages/registrar/DocumentVerification';
import FacultyManagement from '../pages/admin/FacultyManagement';

// Placeholder Phase 2+ Pages
const AdminDashboard = () => <div className="p-8">Admin Dashboard</div>;
const RegistrarDashboard = () => <div className="p-8">Registrar Dashboard</div>;
const AdmissionDashboard = () => <div className="p-8">Admission Dashboard</div>;
const CashierDashboard = () => <div className="p-8">Cashier Dashboard</div>;
const DeanDashboard = () => <div className="p-8">Dean Dashboard</div>;
const ProgramHeadDashboard = () => <div className="p-8">Program Head Dashboard</div>;
const ProfessorDashboard = () => <div className="p-8">Professor Dashboard</div>;
const StudentDashboard = () => <div className="p-8">Student Dashboard</div>;

// Component to handle root redirect based on role
const RootRedirect = () => {
  const { role } = useAuth();
  
  switch (role) {
    case 'ADMIN': return <Navigate to="/admin" replace />;
    case 'REGISTRAR': return <Navigate to="/registrar" replace />;
    case 'HEAD_REGISTRAR': return <Navigate to="/head-registrar" replace />;
    case 'ADMISSION': return <Navigate to="/admission" replace />;
    case 'CASHIER': return <Navigate to="/cashier" replace />;
    case 'DEAN': return <Navigate to="/dean" replace />;
    case 'PROGRAM_HEAD': return <Navigate to="/program-head" replace />;
    case 'PROFESSOR': return <Navigate to="/professor" replace />;
    case 'STUDENT': return <Navigate to="/student" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/apply" element={<PublicApplication />} />
      <Route path="/demo" element={<UIDemo />} />


      {/* Error Routes */}
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />

      {/* Root Redirect */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RootRedirect />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<PageWrapper title="Staff Management" />}>
          <Route path="/admin/staff" element={<StaffManagement />} />
        </Route>
        <Route element={<PageWrapper title="Academic Management" />}>
          <Route path="/admin/academics" element={<AcademicManagement />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route element={<PageWrapper title="Term Management" />}>
          <Route path="/admin/terms" element={<TermManagement />} />
        </Route>
        <Route element={<PageWrapper title="Room Management" />}>
          <Route path="/admin/rooms" element={<RoomManagement />} />
        </Route>
        <Route element={<PageWrapper title="Faculty Management" />}>
          <Route path="/admin/faculty" element={<FacultyManagement />} />
        </Route>
      </Route>

      {/* Redirect /academics to /admin/academics for admins */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']} />}>
         <Route path="/academics" element={<Navigate to="/admin/academics" replace />} />
         <Route path="/users" element={<Navigate to="/admin/staff" replace />} />
      </Route>

      {/* Other Role Routes... */}
      <Route element={<ProtectedRoute allowedRoles={['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']} />}>
        <Route element={<PageWrapper title="Registrar Dashboard" />}>
          <Route path="/registrar" element={<RegistrarDashboard />} />
          <Route path="/head-registrar" element={<RegistrarDashboard />} />
          <Route path="/registrar/verification" element={<DocumentVerification />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMISSION', 'ADMIN']} />}>
        <Route element={<PageWrapper title="Admission Dashboard" />}>
          <Route path="/admission" element={<AdmissionDashboard />} />
          <Route path="/admission/applicants" element={<ApplicantManagement />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DEAN']} />}>
        <Route element={<PageWrapper title="Dean Dashboard" />}>
          <Route path="/dean" element={<DeanDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PROGRAM_HEAD']} />}>
        <Route element={<PageWrapper title="Program Head Dashboard" />}>
          <Route path="/program-head" element={<ProgramHeadDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['CASHIER']} />}>
        <Route element={<PageWrapper title="Cashier Dashboard" />}>
          <Route path="/cashier" element={<CashierDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
        <Route element={<PageWrapper title="Professor Dashboard" />}>
          <Route path="/professor" element={<ProfessorDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<PageWrapper title="Student Dashboard" />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
