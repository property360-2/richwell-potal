import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Standard loading screen for lazy routes
const LazyLoader = () => (
    <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
    </div>
);

// Auth Pages
const Login = lazy(() => import('../pages/auth/Login'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));

// Error Pages
const NotFound = lazy(() => import('../pages/errors/NotFound'));
const Forbidden = lazy(() => import('../pages/errors/Forbidden'));
const ServerError = lazy(() => import('../pages/errors/ServerError'));

// Demo Page
const UIDemo = lazy(() => import('../pages/demo/UIDemo'));

// Admin Pages
const StaffManagement = lazy(() => import('../pages/admin/staff-management/StaffManagement'));
const AcademicManagement = lazy(() => import('../pages/admin/academic-management/AcademicManagement'));
const TermManagement = lazy(() => import('../pages/admin/term-management/TermManagement'));
const RoomManagement = lazy(() => import('../pages/admin/room-management/RoomManagement'));
const StudentManagement = lazy(() => import('../pages/admin/student-management/StudentManagement'));
const FacultyManagement = lazy(() => import('../pages/admin/faculty-management/FacultyManagement'));
const AuditLogManagement = lazy(() => import('../pages/admin/audit-log-management/AuditLogManagement'));
const AdminDashboard = lazy(() => import('../pages/admin/admin-dashboard/AdminDashboard'));

// Admission Pages
const AdmissionDashboard = lazy(() => import('../pages/admission/AdmissionDashboard'));
const ApplicantManagement = lazy(() => import('../pages/admission/ApplicantManagement'));
const EnrollmentMonitoring = lazy(() => import('../pages/admission/EnrollmentMonitoring'));
const PublicApplication = lazy(() => import('../pages/PublicApplication'));

// Registrar Pages
const RegistrarDashboard = lazy(() => import('../pages/registrar/RegistrarDashboard'));
const DocumentVerification = lazy(() => import('../pages/registrar/DocumentVerification'));
const SubjectCrediting = lazy(() => import('../pages/registrar/SubjectCrediting'));
const SectioningDashboard = lazy(() => import('../pages/registrar/SectioningDashboard/index'));
const GradeFinalization = lazy(() => import('../pages/registrar/GradeFinalization'));
const GradeReviewPage = lazy(() => import('../pages/registrar/GradeReviewPage/index'));
const HistoricalEncoding = lazy(() => import('../pages/registrar/HistoricalEncoding'));
const GraduationAudit = lazy(() => import('../pages/registrar/reports/GraduationAudit'));
const SummaryOfGrades = lazy(() => import('../pages/registrar/SummaryOfGrades'));
const RegistrarActionHistory = lazy(() => import('../pages/registrar/RegistrarActionHistory'));

// Dean Pages
const DeanDashboard = lazy(() => import('../pages/dean/dean-dashboard/DeanDashboard'));
const SchedulingPage = lazy(() => import('../pages/dean/scheduling-page/SchedulingPage'));

// Program Head Pages
const ProgramHeadDashboard = lazy(() => import('../pages/program-head/ProgramHeadDashboard'));
const AdvisingApproval = lazy(() => import('../pages/program-head/AdvisingApproval'));
const ResolutionApproval = lazy(() => import('../pages/program-head/ResolutionApproval'));
const SectionManagement = lazy(() => import('../pages/program-head/SectionManagement'));
const CreditingRequests = lazy(() => import('../pages/program-head/CreditingRequests'));

// Faculty Pages
const ProfessorDashboard = lazy(() => import('../pages/faculty/ProfessorDashboard'));
const GradeEntry = lazy(() => import('../pages/faculty/GradeEntry'));
const ProfessorSchedule = lazy(() => import('../pages/faculty/ProfessorSchedule'));
const ProfessorResolutions = lazy(() => import('../pages/faculty/ProfessorResolutions'));

// Cashier Pages
const CashierDashboard = lazy(() => import('../pages/cashier/CashierDashboard'));
const PaymentProcessing = lazy(() => import('../pages/cashier/PaymentProcessing'));

// Student Pages
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const StudentAdvising = lazy(() => import('../pages/student/StudentAdvising'));
const SchedulePicking = lazy(() => import('../pages/student/SchedulePicking'));
const Timetable = lazy(() => import('../pages/student/Timetable'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));
const FinancialSummary = lazy(() => import('../pages/student/FinancialSummary'));
const MyGrades = lazy(() => import('../pages/student/MyGrades'));

// Component to handle root redirect based on role
const RootRedirect = () => {
  const { role, isSuperUser, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading || (isAuthenticated && !role && !isSuperUser)) {
    return (
      <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const normalizedRole = role?.toUpperCase() || (isSuperUser ? 'ADMIN' : '');
  
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
    <Suspense fallback={<LazyLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
        {/* Management Routes shared by Admin and Dean */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'DEAN']} />}>
          <Route element={<PageWrapper title="Academic Management" />}>
            <Route path="/admin/academics" element={<AcademicManagement />} />
          </Route>
          <Route element={<PageWrapper title="Faculty Management" />}>
            <Route path="/admin/faculty" element={<FacultyManagement />} />
          </Route>
          <Route element={<PageWrapper title="Room Management" />}>
            <Route path="/admin/rooms" element={<RoomManagement />} />
          </Route>
          <Route element={<PageWrapper title="Sectioning" />}>
            <Route path="/admin/sectioning" element={<SectioningDashboard />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']} />}>
          <Route element={<PageWrapper title="Staff Management" />}>
            <Route path="/admin/staff" element={<StaffManagement />} />
          </Route>
          
          <Route element={<PageWrapper title="Action History" />}>
            <Route path="/registrar/history" element={<RegistrarActionHistory />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<PageWrapper title="System Audit Trail" />}>
              <Route path="/admin/audit" element={<AuditLogManagement />} />
            </Route>
            <Route element={<PageWrapper title="Term Management" />}>
              <Route path="/admin/terms" element={<TermManagement />} />
            </Route>
            <Route element={<PageWrapper title="Admin Dashboard" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION']} />}>
          <Route element={<PageWrapper title="Student Management" />}>
            <Route path="/students" element={<StudentManagement />} />
          </Route>
        </Route>

        {/* Redirects to maintain consistency and handle legacy routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'DEAN']} />}>
          <Route path="/academics" element={<Navigate to="/admin/academics" replace />} />
          <Route path="/academics/programs" element={<Navigate to="/admin/academics" replace />} />
          <Route path="/users" element={<Navigate to="/admin/staff" replace />} />
          <Route path="/faculty/load" element={<Navigate to="/admin/faculty" replace />} />
          <Route path="/dean/faculty" element={<Navigate to="/admin/faculty" replace />} />
          <Route path="/registrar/sectioning" element={<Navigate to="/admin/sectioning" replace />} />
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
          <Route element={<PageWrapper title="Grade Management" />}>
            <Route path="/registrar/grades" element={<GradeFinalization />} />
            <Route path="/registrar/grades/review/:termId/:sectionId/:subjectId" element={<GradeReviewPage />} />
            <Route path="/registrar/historical-encode" element={<HistoricalEncoding />} />
            {/* Consolidated Reports - Redirecting to parent pages */}
            <Route path="/registrar/reports/cor" element={<Navigate to="/registrar/verification" replace />} />
            <Route path="/registrar/reports/masterlist" element={<Navigate to="/registrar/grades" replace />} />
            <Route path="/registrar/reports/graduation" element={<GraduationAudit />} />
            <Route path="/registrar/students/:studentId/summary" element={<SummaryOfGrades />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMISSION', 'ADMIN']} />}>
          <Route element={<PageWrapper title="Admission Dashboard" />}>
            <Route path="/admission" element={<AdmissionDashboard />} />
            <Route path="/admission/applicants" element={<ApplicantManagement />} />
            <Route path="/admission/monitoring" element={<EnrollmentMonitoring />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['DEAN', 'ADMIN']} />}>
          <Route element={<PageWrapper title="Dean Dashboard" />}>
            <Route path="/dean" element={<DeanDashboard />} />
          </Route>
          <Route element={<PageWrapper title="Scheduling" />}>
            <Route path="/dean/scheduling" element={<SchedulingPage />} />
          </Route>
          <Route element={<PageWrapper title="Academics" />}>
            <Route path="/admin/academics" element={<AcademicManagement />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['PROGRAM_HEAD', 'DEAN', 'ADMIN']} />}>
          <Route element={<PageWrapper title="Program Head Dashboard" />}>
            <Route path="/program-head" element={<ProgramHeadDashboard />} />
            <Route path="/program-head/advising" element={<AdvisingApproval />} />
            <Route path="/program-head/resolutions" element={<ResolutionApproval />} />
            <Route path="/program-head/sections" element={<SectionManagement />} />
            <Route path="/program-head/crediting" element={<CreditingRequests />} />
          </Route>

        </Route>

        <Route element={<ProtectedRoute allowedRoles={['CASHIER', 'ADMIN']} />}>
          <Route element={<PageWrapper title="Cashier Dashboard" />}>
            <Route path="/cashier" element={<CashierDashboard />} />
            <Route path="/cashier/processing" element={<PaymentProcessing />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
          <Route element={<PageWrapper title="Professor Dashboard" />}>
            <Route path="/professor" element={<ProfessorDashboard />} />
          </Route>
          <Route element={<PageWrapper title="My Classes" />}>
            <Route path="/professor/grading" element={<GradeEntry />} />
          </Route>
          <Route element={<PageWrapper title="My Schedule" />}>
            <Route path="/professor/schedule" element={<ProfessorSchedule />} />
          </Route>
          <Route element={<PageWrapper title="INC Resolutions" />}>
            <Route path="/professor/resolutions" element={<ProfessorResolutions />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route element={<PageWrapper title="Student Dashboard" />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>
          <Route element={<PageWrapper title="Subject Advising" />}>
            <Route path="/student/advising" element={<StudentAdvising />} />
          </Route>
          <Route element={<PageWrapper title="Weekly Timetable" />}>
            <Route path="/student/schedule" element={<Timetable />} />
          </Route>
          <Route element={<PageWrapper title="My Profile" />}>
            <Route path="/profile" element={<StudentProfile />} />
          </Route>
          <Route element={<PageWrapper title="Schedule Picking" />}>
            <Route path="/student/picking" element={<SchedulePicking />} />
          </Route>
          <Route element={<PageWrapper title="My Grades" />}>
            <Route path="/student/grades" element={<MyGrades />} />
          </Route>
          <Route element={<PageWrapper title="Financial Summary" />}>
            <Route path="/student/finance" element={<FinancialSummary />} />
          </Route>
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
