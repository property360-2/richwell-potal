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
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Header from './components/layout/Header'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NotFound from './components/shared/NotFound';

import LoginPage from './pages/auth/Login';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import ResetPasswordPage from './pages/auth/ResetPassword';
import EnrollmentPage from './pages/enrollment'
import EnrollmentSuccess from './pages/enrollment/Success'
import SubjectEnrollmentPage from './pages/enrollment/SubjectEnrollment'

// Registrar
import RegistrarDashboard from './pages/registrar'
import RegistrarStudentMasterlist from './pages/registrar/students/Masterlist'
import RegistrarStudentDetail from './pages/registrar/students/Detail'
import RegistrarSubjectMasterlist from './pages/registrar/curriculum/SubjectMasterlist'
import RegistrarSemesterManagement from './pages/registrar/curriculum/SemesterManagement'
import RegistrarExamMappings from './pages/registrar/curriculum/ExamMappings'
import RegistrarExamPermitsPage from './pages/registrar/ExamPermits'
import RegistrarSectionManager from './pages/registrar/sections/Manager'
import RegistrarSectionDetail from './pages/registrar/sections/Detail'
import RegistrarCORManagement from './pages/registrar/enrollment/CORManagement'
import RegistrarINCManagement from './pages/registrar/grades/INCManagement'
import RegistrarGradeMonitoring from './pages/registrar/grades/Monitoring'
import RegistrarGradeFinalization from './pages/registrar/grades/Finalization'
import RegistrarDocumentRelease from './pages/registrar/documents/DocumentRelease'

// Student
import StudentDashboard from './pages/student/index'
import StudentSchedulePage from './pages/student/Schedule'
import StudentExamPermitsPage from './pages/student/ExamPermits'
import StudentGradesPage from './pages/student/Grades'
import StudentSOA from './pages/student/StudentSOA'

// Professor
import ProfessorDashboard from './pages/professor'
import ProfessorSchedule from './pages/professor/Schedule'
import ProfessorGrades from './pages/professor/Grades'

// Admission
import AdmissionDashboard from './pages/admission'

// Head Oversight
import HeadDashboard from './pages/head'
import HeadReports from './pages/head/Reports'
import HeadResolutions from './pages/head/Resolutions'

// Cashier
import CashierDashboard from './pages/cashier'

// Superadmin
import AdminUserManagement from './pages/admin/UserManagement'
import AdminSystemConfig from './pages/admin/SystemConfig'
import AuditLogsPage from './pages/admin/AuditLogs';
import PermissionsPage from './pages/admin/Permissions';
import AdminTermManagement from './pages/admin/TermManagement'
import AdminTransactionLog from './pages/admin/TransactionLog'

// Academics
import AcademicsPage from './pages/academics/AcademicsPage'
import ProgramDetailPage from './pages/academics/ProgramDetailPage'

// Layout wrapper component
function Layout({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const shouldShowHeader = !hideHeaderPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {shouldShowHeader && <Header />}
      <main className="flex-grow">
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
                <Route path="/registrar/exam-mappings" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarExamMappings /></ProtectedRoute>} />
                <Route path="/registrar/exam-permits" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarExamPermitsPage /></ProtectedRoute>} />
                <Route path="/registrar/sections" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSectionManager /></ProtectedRoute>} />
                <Route path="/registrar/sections/:id" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarSectionDetail /></ProtectedRoute>} />
                <Route path="/registrar/cor" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarCORManagement /></ProtectedRoute>} />
                <Route path="/registrar/inc" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarINCManagement /></ProtectedRoute>} />
                <Route path="/registrar/grades" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarGradeMonitoring /></ProtectedRoute>} />
                <Route path="/registrar/grade-finalization" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarGradeFinalization /></ProtectedRoute>} />
                <Route path="/registrar/documents" element={<ProtectedRoute roles={['REGISTRAR', 'ADMIN']}><RegistrarDocumentRelease /></ProtectedRoute>} />

                {/* Professor Routes */}
                <Route path="/professor" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorDashboard /></ProtectedRoute>} />
                <Route path="/professor/schedule" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorSchedule /></ProtectedRoute>} />
                <Route path="/professor/grades" element={<ProtectedRoute roles={['PROFESSOR', 'ADMIN']}><ProfessorGrades /></ProtectedRoute>} />

                {/* Admission Routes */}
                <Route path="/admission" element={<ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}><AdmissionDashboard /></ProtectedRoute>} />
                <Route path="/admission/dashboard" element={<ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}><AdmissionDashboard /></ProtectedRoute>} />

                {/* Head Routes */}
                <Route path="/head" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadDashboard /></ProtectedRoute>} />
                <Route path="/head/dashboard" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadDashboard /></ProtectedRoute>} />
                <Route path="/head/reports" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadReports /></ProtectedRoute>} />
                <Route path="/head/resolutions" element={<ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}><HeadResolutions /></ProtectedRoute>} />

                {/* Cashier Routes */}
                <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierDashboard /></ProtectedRoute>} />
                <Route path="/cashier/dashboard" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierDashboard /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><AdminUserManagement /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUserManagement /></ProtectedRoute>} />
                <Route path="/admin/config" element={<ProtectedRoute roles={['ADMIN']}><AdminSystemConfig /></ProtectedRoute>} />
                <Route path="/admin/audit-logs" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/permissions" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <PermissionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/terms" element={<ProtectedRoute roles={['ADMIN']}><AdminTermManagement /></ProtectedRoute>} />
                <Route path="/admin/transactions" element={<ProtectedRoute roles={['ADMIN']}><AdminTransactionLog /></ProtectedRoute>} />

                {/* Academics Routes */}
                <Route path="/academics" element={<ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR']}><AcademicsPage /></ProtectedRoute>} />
                <Route path="/academics/programs/:id" element={<ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR']}><ProgramDetailPage /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
