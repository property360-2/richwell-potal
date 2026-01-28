// Navigation configuration for all user roles
// This is the single source of truth for navigation structure

export const NAV_CONFIG = {
  student: [
    { label: 'Dashboard', href: '/student-dashboard.html', page: 'student-dashboard' },
    { label: 'Subjects', href: '/subject-enrollment.html', page: 'subject-enrollment' },
    { label: 'My Schedule', href: '/student-schedule.html', page: 'student-schedule' },
    { label: 'Grades & Curriculum', href: '/grades.html', page: 'grades' },
    { label: 'Exam Permits', href: '/student-exam-permits.html', page: 'exam-permits' },
    { label: 'SOA', href: '/soa.html', page: 'soa' }
  ],

  registrar: [
    { label: 'Dashboard', href: '/registrar-dashboard.html', page: 'registrar-dashboard' },
    { label: 'Students', href: '/registrar-students.html', page: 'registrar-students' },
    { label: 'Resolutions', href: '/registrar-resolutions.html', page: 'registrar-resolutions' },
    { label: 'Academic Sections', href: '/registrar-sections.html', page: 'registrar-sections' },
    { label: 'Grade Finalization', href: '/registrar-grade-finalization.html', page: 'grade-finalization' },
    { label: 'Document Release', href: '/registrar-documents.html', page: 'registrar-documents' },
    { label: 'INC Management', href: '/registrar-inc.html', page: 'registrar-inc' },
    { label: 'Academic', href: '/registrar-academic.html', page: 'registrar-academic' },
    { label: 'Override', href: '/registrar-enrollment.html', page: 'registrar-enrollment' },
    { label: 'Data Archives', href: '/registrar-archives.html', page: 'registrar-archives' }
  ],

  professor: [
    { label: 'My Schedule', href: '/professor-schedule.html', page: 'professor-schedule' },
    { label: 'Grades', href: '/professor-grades.html', page: 'grades' }
  ],

  head: [
    { label: 'Dashboard', href: '/head-dashboard.html', page: 'head-dashboard' },
    { label: 'Reports', href: '/head-reports.html', page: 'head-reports' }
  ],

  cashier: [
    { label: 'Dashboard', href: '/cashier-dashboard.html', page: 'cashier-dashboard' }
  ],

  admission: [
    { label: 'Dashboard', href: '/admission-dashboard.html', page: 'admission-dashboard' },
    { label: 'Applicants', href: '/applicant-approval.html', page: 'applicant-approval' }
  ],

  admin: [
    { label: 'Dashboard', href: '/admin-dashboard.html', page: 'admin-dashboard' },
    { label: 'Users', href: '/admin-users.html', page: 'admin-users' },
    { label: 'Academic', href: '/admin-academic.html', page: 'admin-academic' },
    { label: 'System Config', href: '/admin-system-config.html', page: 'admin-system-config' },
    // { label: 'Audit Logs', href: '/admin-audit-logs.html', page: 'admin-audit-logs' }
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
