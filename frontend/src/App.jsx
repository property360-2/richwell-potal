import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Header from './components/layout/Header'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/auth/Login'
import EnrollmentPage from './pages/enrollment'
import EnrollmentSuccess from './pages/enrollment/Success'
import SubjectEnrollmentPage from './pages/enrollment/SubjectEnrollment'

// Registrar
import RegistrarDashboard from './pages/registrar'
import RegistrarStudentMasterlist from './pages/registrar/students/Masterlist'
import RegistrarStudentDetail from './pages/registrar/students/Detail'
import RegistrarSubjectMasterlist from './pages/registrar/curriculum/SubjectMasterlist'
import RegistrarSemesterManagement from './pages/registrar/curriculum/SemesterManagement'
import RegistrarSectionManager from './pages/registrar/sections/Manager'
import RegistrarSectionDetail from './pages/registrar/sections/Detail'
import RegistrarCORManagement from './pages/registrar/enrollment/CORManagement'
import RegistrarINCManagement from './pages/registrar/grades/INCManagement'
import RegistrarGradeMonitoring from './pages/registrar/grades/Monitoring'
import RegistrarGradeFinalization from './pages/registrar/grades/Finalization'

// Student
import StudentDashboard from './pages/student'
import StudentGrades from './pages/student/Grades'
import StudentSchedule from './pages/student/Schedule'

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

// Student Finance
import StudentSOA from './pages/student/StudentSOA'

// Superadmin
import AdminUserManagement from './pages/admin/UserManagement'
import AdminSystemConfig from './pages/admin/SystemConfig'
import AdminAuditLogs from './pages/admin/AuditLogs'

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
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
                {/* Public Routes */}
                {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/auth/login" replace />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/enrollment" element={<EnrollmentPage />} />
                <Route path="/enrollment/success" element={<EnrollmentSuccess />} />
                <Route path="/enrollment/subjects" element={<ProtectedRoute><SubjectEnrollmentPage /></ProtectedRoute>} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } />

                {/* Student Routes */}
                <Route path="/student/dashboard" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/student/grades" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentGrades />
                  </ProtectedRoute>
                } />
                <Route path="/student/schedule" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentSchedule />
                  </ProtectedRoute>
                } />

                {/* Registrar Routes */}
                <Route path="/registrar/dashboard" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/students" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarStudentMasterlist />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/students/:id" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarStudentDetail />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/subjects" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarSubjectMasterlist />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/semesters" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarSemesterManagement />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/sections" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarSectionManager />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/sections/:id" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarSectionDetail />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/cor" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarCORManagement />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/inc" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarINCManagement />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/grades" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarGradeMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/registrar/grade-finalization" element={
                  <ProtectedRoute roles={['REGISTRAR', 'ADMIN']}>
                    <RegistrarGradeFinalization />
                  </ProtectedRoute>
                } />

                {/* Professor */}
                <Route path="/professor" element={
                  <ProtectedRoute roles={['PROFESSOR', 'ADMIN']}>
                    <ProfessorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/professor/schedule" element={
                  <ProtectedRoute roles={['PROFESSOR', 'ADMIN']}>
                    <ProfessorSchedule />
                  </ProtectedRoute>
                } />
                <Route path="/professor/grades" element={
                  <ProtectedRoute roles={['PROFESSOR', 'ADMIN']}>
                    <ProfessorGrades />
                  </ProtectedRoute>
                } />

                {/* Admission */}
                <Route path="/admission" element={
                  <ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}>
                    <AdmissionDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admission/dashboard" element={
                  <ProtectedRoute roles={['ADMISSION_STAFF', 'ADMIN']}>
                    <AdmissionDashboard />
                  </ProtectedRoute>
                } />

                {/* Head Oversight */}
                <Route path="/head" element={
                  <ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}>
                    <HeadDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/head/dashboard" element={
                  <ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}>
                    <HeadDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/head/reports" element={
                  <ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}>
                    <HeadReports />
                  </ProtectedRoute>
                } />
                <Route path="/head/resolutions" element={
                  <ProtectedRoute roles={['DEPARTMENT_HEAD', 'ADMIN']}>
                    <HeadResolutions />
                  </ProtectedRoute>
                } />

                {/* Cashier */}
                <Route path="/cashier" element={
                  <ProtectedRoute roles={['CASHIER', 'ADMIN']}>
                    <CashierDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/cashier/dashboard" element={
                  <ProtectedRoute roles={['CASHIER', 'ADMIN']}>
                    <CashierDashboard />
                  </ProtectedRoute>
                } />

                {/* Student Finance */}
                <Route path="/student/soa" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentSOA />
                  </ProtectedRoute>
                } />

                {/* Superadmin */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminUserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminUserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/config" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminSystemConfig />
                  </ProtectedRoute>
                } />
                <Route path="/admin/audit-logs" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminAuditLogs />
                  </ProtectedRoute>
                } />

                {/* Academics (Admin & Head Registrar) */}
                <Route path="/academics" element={
                  <ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR']}>
                    <AcademicsPage />
                  </ProtectedRoute>
                } />
                <Route path="/academics/programs/:id" element={
                  <ProtectedRoute roles={['ADMIN', 'HEAD_REGISTRAR']}>
                    <ProgramDetailPage />
                  </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Router>
        </ToastProvider>
      </AuthProvider>
    )
  }


function WelcomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
        <span className="block text-blue-600">Richwell Portal</span>
        <span className="block">React Migration In Progress</span>
      </h1>
      <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
        We are upgrading our student management system to a modern React-based platform. Please stay tuned as we migrate each module.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <div className="rounded-md shadow">
          <Link to="/auth/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
            Sign In Now
          </Link>
        </div>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold text-gray-800">Page Not Found</h2>
      <p className="text-gray-600 mt-2">The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="mt-4 text-blue-600 hover:underline">Back to Home</Link>
    </div>
  )
}

export default App
