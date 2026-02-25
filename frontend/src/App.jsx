import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Header from './components/layout/Header'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NotFound from './components/shared/NotFound';
import DashboardSkeleton from './components/skeletons/DashboardSkeleton';

const LoginPage = lazy(() => import('./pages/auth/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPassword'));
const EnrollmentPage = lazy(() => import('./pages/enrollment'));
const EnrollmentSuccess = lazy(() => import('./pages/enrollment/Success'));
const SubjectEnrollmentPage = lazy(() => import('./pages/enrollment/SubjectEnrollment'));

// Registrar
const RegistrarDashboard = lazy(() => import('./pages/registrar'));
const RegistrarStudentMasterlist = lazy(() => import('./pages/registrar/students/Masterlist'));
const RegistrarStudentDetail = lazy(() => import('./pages/registrar/students/Detail'));
const RegistrarSubjectMasterlist = lazy(() => import('./pages/registrar/curriculum/SubjectMasterlist'));
const RegistrarSemesterManagement = lazy(() => import('./pages/registrar/curriculum/SemesterManagement'));
// const RegistrarExamMappings = lazy(() => import('./pages/registrar/curriculum/ExamMappings'));
// const RegistrarExamPermitsPage = lazy(() => import('./pages/registrar/ExamPermits'));
const RegistrarSectionManager = lazy(() => import('./pages/registrar/sections/Manager'));
const RegistrarSectionDetail = lazy(() => import('./pages/registrar/sections/Detail'));
const RegistrarCORManagement = lazy(() => import('./pages/registrar/enrollment/CORManagement'));
const RegistrarINCManagement = lazy(() => import('./pages/registrar/grades/INCManagement'));
const RegistrarGradeMonitoring = lazy(() => import('./pages/registrar/grades/Monitoring'));
const RegistrarGradeFinalization = lazy(() => import('./pages/registrar/grades/Finalization'));
const RegistrarDocumentRelease = lazy(() => import('./pages/registrar/documents/DocumentRelease'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/index'));
const StudentSchedulePage = lazy(() => import('./pages/student/Schedule'));
const StudentExamPermitsPage = lazy(() => import('./pages/student/ExamPermits'));
const StudentGradesPage = lazy(() => import('./pages/student/Grades'));
const StudentSOA = lazy(() => import('./pages/student/StudentSOA'));

// Professor
const ProfessorDashboard = lazy(() => import('./pages/professor'));
const ProfessorSchedule = lazy(() => import('./pages/professor/Schedule'));
const ProfessorGrades = lazy(() => import('./pages/professor/Grades'));

// Admission
const AdmissionDashboard = lazy(() => import('./pages/admission'));

// Head Oversight
const HeadDashboard = lazy(() => import('./pages/head'));
const HeadStudents = lazy(() => import('./pages/head/Students'));
const HeadReports = lazy(() => import('./pages/head/Reports'));
const HeadResolutions = lazy(() => import('./pages/head/Resolutions'));

// Cashier
const CashierDashboard = lazy(() => import('./pages/cashier'));
const CashierPaymentHistory = lazy(() => import('./pages/cashier/PaymentHistory'));

// Superadmin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUserManagement = lazy(() => import('./pages/admin/UserManagement'));
// const AdminSystemConfig = lazy(() => import('./pages/admin/SystemConfig'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogs'));
const AdminTermManagement = lazy(() => import('./pages/admin/TermManagement'));
const AdminTransactionLog = lazy(() => import('./pages/admin/TransactionLog'));

// Academics
const AcademicsPage = lazy(() => import('./pages/academics/AcademicsPage'));
const ProgramDetailPage = lazy(() => import('./pages/academics/ProgramDetailPage'));

// Layout wrapper component
function Layout({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/enrollment', '/enrollment/success'];
  const shouldShowHeader = !hideHeaderPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {shouldShowHeader && <Header />}
      <main id="main-content" className="flex-grow">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Layout>
                <Suspense fallback={<DashboardSkeleton />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Navigate to="/auth/login" replace />} />
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                    
                    {/* Enrollment */}
                    <Route path="/enrollment" element={<EnrollmentPage />} />
                    <Route path="/enrollment/success" element={<EnrollmentSuccess />} />
                    <Route path="/enrollment/subjects" element={<ProtectedRoute><SubjectEnrollmentPage /></ProtectedRoute>} />
                    
                    {/* Student Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/student/dashboard" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/student/schedule" element={<ProtectedRoute roles={['STUDENT']}><StudentSchedulePage /></ProtectedRoute>} />
                    <Route path="/student/exam-permits" element={<ProtectedRoute roles={['STUDENT']}><StudentExamPermitsPage /></ProtectedRoute>} />
                    <Route path="/student/grades" element={<ProtectedRoute roles={['STUDENT']}><StudentGradesPage /></ProtectedRoute>} />
                    <Route path="/student/soa" element={<ProtectedRoute roles={['STUDENT']}><StudentSOA /></ProtectedRoute>} />

                    {/* Registrar Routes */}
                    <Route path="/registrar/dashboard" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarDashboard /></ProtectedRoute>} />
                    <Route path="/registrar/students" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarStudentMasterlist /></ProtectedRoute>} />
                    <Route path="/registrar/students/:id" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarStudentDetail /></ProtectedRoute>} />
                    <Route path="/registrar/subjects" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSubjectMasterlist /></ProtectedRoute>} />
                    <Route path="/registrar/semesters" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSemesterManagement /></ProtectedRoute>} />
                    {/* <Route path="/registrar/exam-mappings" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarExamMappings /></ProtectedRoute>} /> */}
                    {/* <Route path="/registrar/exam-permits" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarExamPermitsPage /></ProtectedRoute>} /> */}
                    <Route path="/registrar/sections" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSectionManager /></ProtectedRoute>} />
                    <Route path="/registrar/sections/:id" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSectionDetail /></ProtectedRoute>} />
                    <Route path="/registrar/cor" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarCORManagement /></ProtectedRoute>} />
                    <Route path="/registrar/inc" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarINCManagement /></ProtectedRoute>} />
                    <Route path="/registrar/grades" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarGradeMonitoring /></ProtectedRoute>} />
                    <Route path="/registrar/grade-finalization" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarGradeFinalization /></ProtectedRoute>} />
                    <Route path="/registrar/documents" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarDocumentRelease /></ProtectedRoute>} />

                    {/* Professor Routes */}
                    <Route path="/professor" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorDashboard /></ProtectedRoute>} />
                    <Route path="/professor/dashboard" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorDashboard /></ProtectedRoute>} />
                    <Route path="/professor/schedule" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorSchedule /></ProtectedRoute>} />
                    <Route path="/professor/grades" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorGrades /></ProtectedRoute>} />

                    {/* Admission Routes */}
                    <Route path="/admission" element={<ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}><AdmissionDashboard /></ProtectedRoute>} />
                    <Route path="/admission/dashboard" element={<ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}><AdmissionDashboard /></ProtectedRoute>} />

                    {/* Head Routes */}
                    <Route path="/head" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadDashboard /></ProtectedRoute>} />
                    <Route path="/head/dashboard" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadDashboard /></ProtectedRoute>} />
                    <Route path="/head/students" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadStudents /></ProtectedRoute>} />
                    <Route path="/head/reports" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadReports /></ProtectedRoute>} />
                    <Route path="/head/resolutions" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN', 'REGISTRAR']}><HeadResolutions /></ProtectedRoute>} />

                    {/* Cashier Routes */}
                    <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierDashboard /></ProtectedRoute>} />
                    <Route path="/cashier/dashboard" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierDashboard /></ProtectedRoute>} />
                    <Route path="/cashier/payments" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierPaymentHistory /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUserManagement /></ProtectedRoute>} />
                    {/* <Route path="/admin/config" element={<ProtectedRoute roles={['ADMIN']}><AdminSystemConfig /></ProtectedRoute>} /> */}
                    <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['ADMIN']}><AuditLogsPage /></ProtectedRoute>} />
                    <Route path="/admin/terms" element={<ProtectedRoute roles={['ADMIN']}><AdminTermManagement /></ProtectedRoute>} />
                    <Route path="/admin/transactions" element={<ProtectedRoute roles={['ADMIN']}><AdminTransactionLog /></ProtectedRoute>} />

                    {/* Academics Routes */}
                    <Route path="/academics" element={<ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']}><AcademicsPage /></ProtectedRoute>} />
                    <Route path="/academics/programs/:id" element={<ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']}><ProgramDetailPage /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
            </Layout>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
