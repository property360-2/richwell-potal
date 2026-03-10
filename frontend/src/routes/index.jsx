import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
import { useAuth } from '../hooks/useAuth';

// UI Components
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { BookOpen, ArrowRight } from 'lucide-react';


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
import SubjectCrediting from '../pages/registrar/SubjectCrediting';
import SectioningDashboard from '../pages/registrar/SectioningDashboard';
import FacultyManagement from '../pages/admin/FacultyManagement';
import AdvisingApproval from '../pages/program-head/AdvisingApproval';
import StudentManagement from '../pages/admin/StudentManagement';
import SchedulingPage from '../pages/dean/SchedulingPage';
import SchedulePicking from '../pages/student/SchedulePicking';

// Placeholder Phase 2+ Pages
const AdminDashboard = () => <div className="p-8">Admin Dashboard</div>;
const RegistrarDashboard = () => <div className="p-8">Registrar Dashboard</div>;
const AdmissionDashboard = () => <div className="p-8">Admission Dashboard</div>;
const CashierDashboard = () => <div className="p-8">Cashier Dashboard</div>;
const DeanDashboard = () => <div className="p-8">Dean Dashboard</div>;
// Program Head Dashboard Component
const ProgramHeadDashboard = () => {
  const { user } = useAuth();
  const programs = user?.headed_programs || [];

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Program Head Dashboard</h1>
          <p className="text-slate-500">Welcome, {user?.first_name}! Managing {programs.length} program(s).</p>
        </div>
      </div>

      {programs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => (
            <Card key={program.id} className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{program.code}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{program.name}</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600 font-medium">Status</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <Button 
                   variant="ghost" 
                   className="w-full justify-between"
                   icon={<ArrowRight size={16} />}
                   onClick={() => window.location.href = '/program-head/advising'}
                >
                   Pending Advising
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Programs Assigned</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            You are not currently assigned as a Program Head for any academic programs. 
            Please contact the Administrator to update your assignments.
          </p>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Total Programs</div>
           <div className="text-2xl font-bold text-slate-800">{programs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Pending Advising</div>
           <div className="text-2xl font-bold text-blue-600">--</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Faculty Under Program</div>
           <div className="text-2xl font-bold text-slate-800">--</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Active Students</div>
           <div className="text-2xl font-bold text-slate-800">--</div>
        </div>
      </div>
    </div>
  );
};

const ProfessorDashboard = () => <div className="p-8">Professor Dashboard</div>;

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentAdvising from '../pages/student/StudentAdvising';
import MyGrades from '../pages/student/MyGrades';

// Component to handle root redirect based on role
const RootRedirect = () => {
  const { role, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading || (isAuthenticated && !role)) {
    return (
      <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const normalizedRole = role?.toUpperCase();
  
  switch (normalizedRole) {
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

      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION']} />}>
        <Route element={<PageWrapper title="Student Management" />}>
          <Route path="/students" element={<StudentManagement />} />
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
        </Route>
        <Route element={<PageWrapper title="Document Verification" />}>
           <Route path="/registrar/verification" element={<DocumentVerification />} />
        </Route>
        <Route element={<PageWrapper title="Subject Crediting" />}>
           <Route path="/registrar/crediting" element={<SubjectCrediting />} />
        </Route>
        <Route element={<PageWrapper title="Sectioning" />}>
           <Route path="/registrar/sectioning" element={<SectioningDashboard />} />
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
        <Route element={<PageWrapper title="Scheduling" />}>
           <Route path="/dean/scheduling" element={<SchedulingPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PROGRAM_HEAD', 'DEAN', 'ADMIN']} />}>
        <Route element={<PageWrapper title="Faculty Teaching Load" />}>
           <Route path="/faculty/load" element={<div className="p-8">Teaching Load Report (Coming Soon)</div>} />
        </Route>
        <Route element={<PageWrapper title="Program Head Dashboard" />}>
           <Route path="/program-head" element={<ProgramHeadDashboard />} />
           <Route path="/program-head/advising" element={<AdvisingApproval />} />
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
        <Route element={<PageWrapper title="Subject Advising" />}>
          <Route path="/student/advising" element={<StudentAdvising />} />
        </Route>
        <Route element={<PageWrapper title="Schedule Picking" />}>
          <Route path="/student/picking" element={<SchedulePicking />} />
        </Route>
        <Route element={<PageWrapper title="My Grades" />}>
          <Route path="/student/grades" element={<MyGrades />} />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
