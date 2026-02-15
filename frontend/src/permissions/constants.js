/**
 * Permission Constants
 * Centralized permission definitions for role-based access control
 */

// Role definitions
export const ROLES = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    REGISTRAR: 'registrar',
    CASHIER: 'cashier',
    ADMISSION: 'admission',
    PROFESSOR: 'professor',
    HEAD: 'head',
    STUDENT: 'student',
};

// Permission definitions by feature
export const PERMISSIONS = {
    // User Management
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',

    // Student Management
    STUDENTS_VIEW: 'students.view',
    STUDENTS_CREATE: 'students.create',
    STUDENTS_EDIT: 'students.edit',
    STUDENTS_DELETE: 'students.delete',

    // Academic Management
    SUBJECTS_MANAGE: 'subjects.manage',
    SECTIONS_MANAGE: 'sections.manage',
    SEMESTERS_MANAGE: 'semesters.manage',

    // Grade Management
    GRADES_VIEW: 'grades.view',
    GRADES_SUBMIT: 'grades.submit',
    GRADES_APPROVE: 'grades.approve',
    GRADES_FINALIZE: 'grades.finalize',

    // Financial Management
    PAYMENTS_VIEW: 'payments.view',
    PAYMENTS_RECORD: 'payments.record',

    // Enrollment Management
    ENROLLMENT_VIEW: 'enrollment.view',
    ENROLLMENT_APPROVE: 'enrollment.approve',

    // Admission Management
    ADMISSION_VIEW: 'admission.view',
    ADMISSION_APPROVE: 'admission.approve',

    // System Configuration
    SYSTEM_CONFIG: 'system.config',
    AUDIT_LOGS: 'audit.logs',
};

// Role-Permission mapping
export const ROLE_PERMISSIONS = {
    [ROLES.SUPERADMIN]: Object.values(PERMISSIONS), // All permissions

    [ROLES.ADMIN]: [
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.USERS_CREATE,
        PERMISSIONS.USERS_EDIT,
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.SUBJECTS_MANAGE,
        PERMISSIONS.SECTIONS_MANAGE,
        PERMISSIONS.SEMESTERS_MANAGE,
        PERMISSIONS.GRADES_VIEW,
        PERMISSIONS.SYSTEM_CONFIG,
    ],

    [ROLES.REGISTRAR]: [
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.STUDENTS_CREATE,
        PERMISSIONS.STUDENTS_EDIT,
        PERMISSIONS.SUBJECTS_MANAGE,
        PERMISSIONS.SECTIONS_MANAGE,
        PERMISSIONS.SEMESTERS_MANAGE,
        PERMISSIONS.GRADES_VIEW,
        PERMISSIONS.GRADES_FINALIZE,
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.ENROLLMENT_APPROVE,
    ],

    [ROLES.CASHIER]: [
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_RECORD,
    ],

    [ROLES.ADMISSION]: [
        PERMISSIONS.ADMISSION_VIEW,
        PERMISSIONS.ADMISSION_APPROVE,
    ],

    [ROLES.PROFESSOR]: [
        PERMISSIONS.GRADES_VIEW,
        PERMISSIONS.GRADES_SUBMIT,
    ],

    [ROLES.HEAD]: [
        PERMISSIONS.GRADES_VIEW,
        PERMISSIONS.GRADES_APPROVE,
    ],

    [ROLES.STUDENT]: [
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.GRADES_VIEW,
    ],
};

// Helper function to check if a role has a permission
export const hasPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

// Helper function to check if a role has any of the given permissions
export const hasAnyPermission = (role, permissionsArray) => {
    return permissionsArray.some(permission => hasPermission(role, permission));
};

// Helper function to check if a role has all of the given permissions
export const hasAllPermissions = (role, permissionsArray) => {
    return permissionsArray.every(permission => hasPermission(role, permission));
};
