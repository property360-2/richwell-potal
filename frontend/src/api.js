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
        return response.json();
    },

    async post(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response;
    },

    async patch(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response) return null;
        return response.json();
    },

    async delete(endpoint) {
        const response = await this.request(endpoint, { method: 'DELETE' });
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
    }
};

/**
 * API Endpoints for Epic 1 & Epic 2
 */
export const endpoints = {
    // Authentication
    login: '/accounts/login/',
    logout: '/accounts/logout/',
    me: '/accounts/me/',
    tokenRefresh: '/accounts/token/refresh/',
    changePassword: '/accounts/change-password/',

    // Epic 1: Admissions
    enrollmentStatus: '/admissions/system/enrollment-status/',
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
    professorSchedule: (profId, semId) => `/academics/professor/${profId}/schedule/${semId}/`,

    // Epic 2: Semesters
    semesters: '/academics/semesters/',
    activeSemester: '/academics/semesters/active/',

    // Epic 2: Professors
    professors: '/accounts/professors/',

    // Epic 3: Subject Enrollment (under /admissions/)
    recommendedSubjects: '/admissions/subjects/recommended/',
    availableSubjects: '/admissions/subjects/available/',
    myEnrollments: '/admissions/subjects/my-enrollments/',
    enrollSubject: '/admissions/subjects/enroll/',
    dropSubject: (id) => `/admissions/subjects/${id}/drop/`,
    overrideEnroll: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/override-enroll/`,

    // My Enrollment (enrollment URLs are under /admissions/)
    myEnrollment: '/admissions/my-enrollment/',
    myPayments: '/admissions/my-enrollment/payments/',

    // Cashier endpoints (enrollment URLs are under /admissions/)
    cashierStudentSearch: '/admissions/cashier/students/search/',
    cashierPendingPayments: '/admissions/cashier/students/pending-payments/',
    cashierRecordPayment: '/admissions/payments/record/',
    cashierStudentPayments: (enrollmentId) => `/admissions/payments/student/${enrollmentId}/`,

    // Registrar endpoints
    registrarStudentSearch: '/admissions/cashier/students/search/',  // Reuse cashier search
    registrarAllStudents: '/admissions/applicants/',  // Get all enrolled students

    // Head/Department Head endpoints
    headPendingEnrollments: '/admissions/head/pending-enrollments/',
    headApprove: (id) => `/admissions/head/approve/${id}/`,
    headReject: (id) => `/admissions/head/reject/${id}/`,
    headBulkApprove: '/admissions/head/bulk-approve/',

    // COR Generation
    generateCOR: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/cor/`,
};

