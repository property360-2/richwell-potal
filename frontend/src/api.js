/**
 * API Configuration and HTTP Client
 * Handles all API requests to the Django backend
 */

const API_BASE_URL = '/api/v1';

/**
 * Token Manager - Handles JWT token storage and retrieval
 */
export const TokenManager = {
    getAccessToken() {
        return localStorage.getItem('access_token');
    },

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },

    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    }
};

/**
 * API Client - Makes HTTP requests with automatic token handling
 */
export const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 - try to refresh token
            if (response.status === 401 && token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${TokenManager.getAccessToken()}`;
                    response = await fetch(url, { ...options, headers });
                } else {
                    TokenManager.clearTokens();
                    window.location.href = '/login.html';
                    return;
                }
            }

            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async refreshToken() {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                TokenManager.setTokens(data.access, data.refresh || refreshToken);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    async get(endpoint) {
        const response = await this.request(endpoint, { method: 'GET' });
        if (!response) return null;

        // Handle non-JSON responses gracefully
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            return null;
        }

        return response.json();
    },

    async post(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response) return null;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = typeof errorData.detail === 'string' ? errorData.detail :
                (typeof errorData.error === 'string' ? errorData.error :
                    `Server error: ${response.status}`);
            const error = new Error(message);
            error.status = response.status;
            error.data = errorData;
            error.response = { status: response.status, data: errorData };
            throw error;
        }
        return response.json();
    },

    async put(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response) return null;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = typeof errorData.detail === 'string' ? errorData.detail :
                (typeof errorData.error === 'string' ? errorData.error :
                    `Server error: ${response.status}`);
            const error = new Error(message);
            error.status = response.status;
            error.data = errorData;
            error.response = { status: response.status, data: errorData };
            throw error;
        }
        return response.json();
    },

    async patch(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response) return null;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = typeof errorData.detail === 'string' ? errorData.detail :
                (typeof errorData.error === 'string' ? errorData.error :
                    `Server error: ${response.status}`);
            const error = new Error(message);
            error.status = response.status;
            error.data = errorData;
            error.response = { status: response.status, data: errorData };
            throw error;
        }
        return response.json();
    },

    async delete(endpoint) {
        const response = await this.request(endpoint, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || errorData.error || errorData.message || `Server error: ${response.status}`;
            const errorMessage = typeof detail === 'object' ? JSON.stringify(detail) : detail;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }
        return response;
    },

    async postFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {};

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });
    },

    async putFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {};

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            method: 'PUT',
            headers,
            body: formData
        });
    }
};

// API Endpoints
export const endpoints = {
    // Authentication & Accounts
    accounts: {
        login: '/api/v1/accounts/login/',
        logout: '/api/v1/accounts/logout/',
        profile: '/api/v1/accounts/me/',
        changePassword: '/api/v1/accounts/change-password/',
        requestPasswordReset: '/api/v1/accounts/password/request-reset/',
        validateResetToken: '/api/v1/accounts/password/validate-token/',
        resetPassword: '/api/v1/accounts/password/reset/',
    },
    tokenRefresh: '/accounts/token/refresh/', // Kept at top level as per instruction's implied scope

    // Epic 1: Admissions
    enrollmentStatus: '/admissions/system/enrollment-status/',
    checkStudentId: (id) => `/admissions/check-student-id/?student_id=${encodeURIComponent(id)}`,
    programs: '/admissions/programs/',
    enroll: '/admissions/enroll/',
    applicants: '/admissions/applicants/',
    nextStudentNumber: '/admissions/next-student-number/',
    applicantUpdate: (id) => `/admissions/applicants/${id}/`,
    uploadDocument: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/documents/`,
    verifyDocument: (documentId) => `/admissions/documents/${documentId}/verify/`,

    // Epic 2: Academics - Programs (Public)
    academicPrograms: '/academics/programs/',
    academicProgram: (id) => `/academics/programs/${id}/`,

    // Epic 2: Academics - Program Management (Admin/Registrar)
    managePrograms: '/academics/manage/programs/',
    manageProgram: (id) => `/academics/manage/programs/${id}/`,
    programSnapshot: (id) => `/academics/manage/programs/${id}/snapshot/`,
    programVersions: (id) => `/academics/manage/programs/${id}/versions/`,

    // Epic 2: Academics - Subject Management
    manageSubjects: '/academics/manage/subjects/',
    manageSubject: (id) => `/academics/manage/subjects/${id}/`,
    subjectPrereqTree: (id) => `/academics/manage/subjects/${id}/prerequisite-tree/`,
    subjectPrereqs: (id) => `/academics/manage/subjects/${id}/prerequisites/`,
    removeSubjectPrereq: (id, prereqId) => `/academics/manage/subjects/${id}/prerequisites/${prereqId}/`,

    // Epic 2: Academics - Sections
    sections: '/academics/sections/',
    section: (id) => `/academics/sections/${id}/`,
    sectionSubjects: '/academics/section-subjects/',
    sectionSubject: (id) => `/academics/section-subjects/${id}/`,

    // Epic 2: Academics - Schedule
    scheduleSlots: '/academics/schedule-slots/',
    scheduleSlot: (id) => `/academics/schedule-slots/${id}/`,
    checkProfessorConflict: '/academics/check-professor-conflict/',
    checkRoomConflict: '/academics/check-room-conflict/',
    checkSectionConflict: '/academics/check-section-conflict/',
    checkAvailability: '/academics/availability/',
    professorSchedule: (profId, semId) => `/academics/professor/${profId}/schedule/${semId}/`,

    // Epic 2 & 8: Semesters
    semesters: '/academics/semesters/',
    semesterDetail: (id) => `/academics/semesters/${id}/`,
    activeSemester: '/academics/semesters/active/',
    activateTerm: (id) => `/academics/semesters/${id}/activate/`,

    // Epic 2: Professors
    professors: '/academics/professors/',
    professorDetail: (id) => `/academics/professors/${id}/`,
    professorWorkload: (id) => `/academics/professors/${id}/workload/`,

    // Rooms Management
    rooms: '/academics/rooms/',
    room: (id) => `/academics/rooms/${id}/`,
    roomAvailability: '/academics/rooms/availability/',

    // Epic 3: Subject Enrollment (under /admissions/)
    recommendedSubjects: '/admissions/subjects/recommended/',
    availableSubjects: '/admissions/subjects/available/',
    myEnrollments: '/admissions/subjects/my-enrollments/',
    mySchedule: '/admissions/my-schedule/',
    enrollSubject: '/admissions/subjects/enroll/',
    dropSubject: (id) => `/admissions/subjects/${id}/drop/`,
    overrideEnroll: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/override-enroll/`,

    // My Enrollment (enrollment URLs are under /admissions/)
    myEnrollment: '/admissions/my-enrollment/',
    myPayments: '/admissions/my-enrollment/payments/',

    // Cashier endpoints (enrollment app is registered under /admissions/ prefix)
    cashierStudentSearch: '/admissions/cashier/students/search/',
    cashierPendingPayments: '/admissions/cashier/students/pending-payments/',
    cashierTodayTransactions: '/admissions/cashier/today-transactions/',
    cashierRecordPayment: '/admissions/payments/record/',
    cashierStudentPayments: (enrollmentId) => `/admissions/payments/student/${enrollmentId}/`,

    // Registrar endpoints
    registrarStudentSearch: '/admissions/cashier/students/search/',  // Reuse cashier search
    registrarAllStudents: '/admissions/applicants/',  // Get all enrolled students

    // Registrar Student Management (EPIC 7)
    registrarStudents: '/accounts/students/',
    registrarStudentDetail: (id) => `/accounts/students/${id}/`,

    // Head/Department Head endpoints
    headPendingEnrollments: '/admissions/head/pending-enrollments/',
    headApprove: (id) => `/admissions/head/approve/${id}/`,
    headReject: (id) => `/admissions/head/reject/${id}/`,
    headBulkApprove: '/admissions/head/bulk-approve/',

    // COR Generation
    generateCOR: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/cor/`,

    // Document Release
    createDocumentRelease: '/admissions/documents/release/',
    myReleases: '/admissions/documents/my-releases/',
    allReleases: '/admissions/documents/all/',
    studentEnrollmentStatus: (studentId) => `/admissions/students/${studentId}/enrollment-status/`,

    // Curriculum Management (EPIC 7)
    curricula: '/academics/curricula/',
    curriculum: (id) => `/academics/curricula/${id}/`,
    curriculumDetail: (id) => `/academics/curricula/${id}/`,
    curriculumSubjects: '/academics/curriculum-subjects/',
    curriculumStructure: (id) => `/academics/curricula/${id}/structure/`,
    curriculumAssignSubjects: (id) => `/academics/curricula/${id}/assign_subjects/`,
    curriculumRemoveSubject: (id, subjectId) => `/academics/curricula/${id}/subjects/${subjectId}/`,
    studentCurriculum: '/admissions/my-curriculum/',

    // Permission Management
    users: '/accounts/users/',
    userPermissions: (userId) => `/accounts/users/${userId}/permissions/`,
    updateUserPermission: (userId) => `/accounts/users/${userId}/permissions/update/`,
    bulkUpdatePermissions: (userId) => `/accounts/users/${userId}/permissions/bulk/`,
    permissionCategories: '/accounts/permissions/categories/',

    // Audit Logs
    auditLogs: '/audit/logs/',
    auditLogFilters: '/audit/logs/filters/',
    auditLogDetail: (id) => `/audit/logs/${id}/`,

    // System Configuration (Core)
    systemConfig: '/core/config/',
    systemConfigDetail: (key) => `/core/config/${key}/`,

    // Reports
    reports: '/admissions/reports/',

    // Notifications
    notifications: {
        list: '/core/notifications/',
        unreadCount: '/core/notifications/unread-count/',
        markRead: (id) => `/core/notifications/${id}/mark-read/`,
        markAllRead: '/core/notifications/mark-all-read/',
        delete: (id) => `/core/notifications/${id}/`,
    },

    // Grade Resolution (Phase 4)
    gradeResolutions: '/admissions/grade-resolutions/',
    gradeResolution: (id) => `/admissions/grade-resolutions/${id}/`,
    gradeResolutionApprove: (id) => `/admissions/grade-resolutions/${id}/approve/`,
    gradeResolutionReject: (id) => `/admissions/grade-resolutions/${id}/reject/`,
    pendingResolutions: '/admissions/grade-resolutions/pending/',

    // Legacy endpoints (for backwards compatibility)
    me: '/accounts/me/',
};

