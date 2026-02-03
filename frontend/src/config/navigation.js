// Navigation configuration for all user roles
// Updated with organized page structure

export const NAV_CONFIG = {
  student: [
    { label: 'Dashboard', href: '/pages/student/student-dashboard.html', page: 'student-dashboard' },
    { label: 'Subjects', href: '/pages/student/subject-enrollment.html', page: 'subject-enrollment' },
    { label: 'My Schedule', href: '/pages/student/student-schedule.html', page: 'student-schedule' },
    { label: 'Grades & Curriculum', href: '/pages/student/grades.html', page: 'grades' },
    { label: 'SOA', href: '/pages/student/soa.html', page: 'soa' }
  ],

  registrar: [
    { label: 'Dashboard', href: '/pages/registrar/registrar-dashboard.html', page: 'registrar-dashboard' },
    { label: 'Students', href: '/pages/registrar/registrar-students.html', page: 'registrar-students' },
    { label: 'All Students', href: '/pages/admission/all-students.html', page: 'all-students' },
    { label: 'Academic', href: '/pages/registrar/registrar-academic.html', page: 'registrar-academic' },
    { label: 'Resolutions', href: '/pages/registrar/registrar-resolutions.html', page: 'registrar-resolutions' },
    { label: 'Grades', href: '/pages/registrar/registrar-grades.html', page: 'grades' },
    { label: 'Data Archives', href: '/pages/registrar/registrar-archives.html', page: 'registrar-archives' }
  ],

  professor: [
    { label: 'Dashboard', href: '/pages/professor/professor-dashboard.html', page: 'professor-dashboard' },
    { label: 'My Schedule', href: '/pages/professor/professor-schedule.html', page: 'professor-schedule' },
    { label: 'Sections', href: '/pages/professor/professor-grades.html', page: 'grades' }
  ],

  head: [
    { label: 'Dashboard', href: '/pages/head/head-dashboard.html', page: 'head-dashboard' },
    { label: 'Resolutions', href: '/pages/head/head-resolutions.html', page: 'head-resolutions' },
    { label: 'Reports', href: '/pages/head/head-reports.html', page: 'head-reports' }
  ],

  cashier: [
    { label: 'Dashboard', href: '/pages/cashier/cashier-dashboard.html', page: 'cashier-dashboard' }
  ],

  admission: [
    { label: 'Dashboard', href: '/pages/admission/admission-dashboard.html', page: 'admission-dashboard' },
    { label: 'Applicants', href: '/pages/admission/applicant-approval.html', page: 'applicant-approval' },
    { label: 'All Students', href: '/pages/admission/all-students.html', page: 'all-students' }
  ],

  admin: [
    { label: 'Dashboard', href: '/pages/admin/admin-dashboard.html', page: 'admin-dashboard' },
    { label: 'Users', href: '/pages/admin/admin-users.html', page: 'admin-users' },
    { label: 'Academic', href: '/pages/admin/admin-academic.html', page: 'admin-academic' },
    { label: 'System Config', href: '/pages/admin/admin-system-config.html', page: 'admin-system-config' }
  ]
};

/**
 * Convert user role to navigation config key
 * @param {string} userRole - User role from backend (STUDENT, REGISTRAR, etc.)
 * @returns {string} Navigation config key
 */
export function getRoleKey(userRole) {
  const roleMap = {
    'STUDENT': 'student',
    'REGISTRAR': 'registrar',
    'HEAD_REGISTRAR': 'registrar',
    'PROFESSOR': 'professor',
    'DEPARTMENT_HEAD': 'head',
    'CASHIER': 'cashier',
    'ADMISSION': 'admission',
    'ADMISSION_STAFF': 'admission',
    'ADMIN': 'admin'
  };
  return roleMap[userRole] || 'student';
}

/**
 * Get navigation items for a specific role
 * @param {string} role - User role (can be backend format or config key)
 * @returns {Array} Array of navigation items
 */
export function getNavigationForRole(role) {
  const roleKey = getRoleKey(role);
  return NAV_CONFIG[roleKey] || NAV_CONFIG.student;
}
