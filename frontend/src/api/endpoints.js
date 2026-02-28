/**
 * API Endpoint Definitions — all backend URL paths in one place.
 * Grouped by domain/epic for readability.
 */

export const endpoints = {
    // ── Authentication & Accounts ────────────────────────────
    login: '/accounts/login/',
    logout: '/accounts/logout/',
    refreshToken: '/accounts/token/refresh/',
    profile: '/accounts/me/',
    changePassword: '/accounts/change-password/',
    passwordRequestReset: '/accounts/password/request-reset/',
    passwordValidateToken: '/accounts/password/validate-token/',
    passwordReset: '/accounts/password/reset/',
    requestPasswordReset: '/accounts/password/request-reset/',
    validateResetToken: '/accounts/password/validate-token/',
    resetPassword: '/accounts/password/reset/',
    tokenRefresh: '/accounts/token/refresh/',

    // ── Epic 1: Admissions ───────────────────────────────────
    enrollmentStatus: '/admissions/system/enrollment-status/',
    checkStudentId: (id) => `/admissions/check-student-id/?student_id=${encodeURIComponent(id)}`,
    generateStudentId: '/accounts/generate-student-id/',
    programs: '/admissions/programs/',
    enroll: '/admissions/enroll/',
    applicants: '/admissions/applicants/',
    nextStudentNumber: '/admissions/next-student-number/',
    applicantUpdate: (id) => `/admissions/applicants/${id}/`,
    uploadDocument: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/documents/`,
    verifyDocument: (documentId) => `/admissions/documents/${documentId}/verify/`,

    // ── Epic 2: Academics — Programs (Public) ────────────────
    academicPrograms: '/academics/programs/',
    academicProgram: (id) => `/academics/programs/${id}/`,
    academicSubjects: '/academics/subjects/',

    // ── Epic 2: Academics — Program Management (Admin/Registrar)
    managePrograms: '/academics/manage/programs/',
    manageProgram: (id) => `/academics/manage/programs/${id}/`,
    programSnapshot: (id) => `/academics/manage/programs/${id}/snapshot/`,
    programVersions: (id) => `/academics/manage/programs/${id}/versions/`,

    // ── Epic 2: Academics — Subject Management ───────────────
    manageSubjects: '/academics/manage/subjects/',
    manageSubject: (id) => `/academics/manage/subjects/${id}/`,
    subjectPrereqTree: (id) => `/academics/manage/subjects/${id}/prerequisite-tree/`,
    subjectPrereqs: (id) => `/academics/manage/subjects/${id}/prerequisites/`,
    removeSubjectPrereq: (id, prereqId) => `/academics/manage/subjects/${id}/prerequisites/${prereqId}/`,

    // ── Epic 2: Academics — Sections ─────────────────────────
    sections: '/academics/sections/',
    section: (id) => `/academics/sections/${id}/`,
    sectionSubjects: '/academics/section-subjects/',
    sectionSubject: (id) => `/academics/section-subjects/${id}/`,

    // ── Epic 2: Academics — Schedule ─────────────────────────
    scheduleSlots: '/academics/schedule-slots/',
    scheduleSlot: (id) => `/academics/schedule-slots/${id}/`,
    checkProfessorConflict: '/academics/check-professor-conflict/',
    checkRoomConflict: '/academics/check-room-conflict/',
    checkSectionConflict: '/academics/check-section-conflict/',
    checkAvailability: '/academics/availability/',
    professorSchedule: (profId, semId) => `/academics/professor/${profId}/schedule/${semId}/`,

    // ── Epic 2 & 8: Semesters ────────────────────────────────
    semesters: '/academics/semesters/',
    semesterDetail: (id) => `/academics/semesters/${id}/`,
    activeSemester: '/academics/semesters/active/',
    activateTerm: (id) => `/academics/semesters/${id}/activate/`,

    // ── Epic 2: Professors ───────────────────────────────────
    professors: '/academics/professors/',
    professorDetail: (id) => `/academics/professors/${id}/`,
    professorWorkload: (id) => `/academics/professors/${id}/workload/`,

    // ── Rooms Management ─────────────────────────────────────
    rooms: '/academics/rooms/',
    room: (id) => `/academics/rooms/${id}/`,
    roomAvailability: '/academics/rooms/availability/',

    // ── Epic 3: Subject Enrollment ───────────────────────────
    recommendedSubjects: '/admissions/subjects/recommended/',
    availableSubjects: '/admissions/subjects/available/',
    myEnrollments: '/admissions/subjects/my-enrollments/',
    mySchedule: '/admissions/my-schedule/',
    enrollSubject: '/admissions/subjects/enroll/',
    bulkEnrollSubject: '/admissions/subjects/bulk-enroll/',
    dropSubject: (id) => `/admissions/subjects/${id}/drop/`,
    overrideEnroll: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/override-enroll/`,

    // ── My Enrollment ────────────────────────────────────────
    myEnrollment: '/admissions/my-enrollment/',
    myPayments: '/admissions/my-enrollment/payments/',
    myGrades: '/admissions/my-enrollment/grades/',
    myTranscript: '/admissions/my-enrollment/transcript/',

    // ── INC Management (Registrar) ───────────────────────────
    incReport: '/admissions/grades/inc-report/',
    processExpiredIncs: '/admissions/grades/process-expired-incs/',

    // ── Cashier ──────────────────────────────────────────────
    cashierStudentSearch: '/admissions/cashier/students/search/',
    cashierPendingPayments: '/admissions/cashier/students/pending-payments/',
    cashierTodayTransactions: '/admissions/cashier/today-transactions/',
    cashierRecordPayment: '/admissions/payments/record/',
    cashierPaymentAdjust: '/admissions/payments/adjust/',
    paymentTransactions: '/admissions/payments/transactions/',
    cashierStudentPayments: (enrollmentId) => `/admissions/payments/student/${enrollmentId}/`,

    // ── Registrar ────────────────────────────────────────────
    registrarStudentSearch: '/admissions/cashier/students/search/',
    registrarAllStudents: '/admissions/applicants/',
    allStudents: (status = 'all') => `/admissions/applicants/?status=${status}`,

    // ── Registrar Student Management (EPIC 7) ────────────────
    registrarStudents: '/accounts/students/',
    registrarStudentDetail: (id) => `/accounts/students/${id}/`,
    updateStudentStanding: (id) => `/admissions/students/${id}/standing/`,

    // ── Registrar Transferee & COR ───────────────────────────
    transfereeCreate: '/admissions/transferee/',
    transfereeCredits: (id) => `/admissions/transferee/${id}/credits/`,
    subjectEnrollments: '/admissions/enrollment/',
    generateCor: (id) => `/admissions/enrollment/${id}/cor/`,

    // ── Head/Department Head ─────────────────────────────────
    headPendingEnrollments: '/admissions/head/pending-enrollments/',
    headApprove: (id) => `/admissions/head/approve/${id}/`,
    headReject: (id) => `/admissions/head/reject/${id}/`,
    headBulkApprove: '/admissions/head/bulk-approve/',
    reports: '/admissions/reports/',

    // ── Document Release (EPIC 6) ────────────────────────────
    createDocumentRelease: '/admissions/documents/release/',
    myReleases: '/admissions/documents/my-releases/',
    allReleases: '/admissions/documents/all/',
    documentStats: '/admissions/documents/stats/',
    studentDocuments: (studentId) => `/admissions/documents/student/${studentId}/`,
    documentDetail: (code) => `/admissions/documents/${code}/`,
    revokeDocument: (code) => `/admissions/documents/${code}/revoke/`,
    reissueDocument: (code) => `/admissions/documents/${code}/reissue/`,
    studentEnrollmentStatus: (studentId) => `/admissions/students/${studentId}/enrollment-status/`,

    // ── Curriculum Management (EPIC 7) ───────────────────────
    curricula: '/academics/curricula/',
    curriculum: (id) => `/academics/curricula/${id}/`,
    curriculumSubjects: '/academics/curriculum-subjects/',
    curriculumStructure: (id) => `/academics/curricula/${id}/structure/`,
    curriculumAssignSubjects: (id) => `/academics/curricula/${id}/assign_subjects/`,
    curriculumRemoveSubject: (id, subjectId) => `/academics/curricula/${id}/subjects/${subjectId}/`,
    studentCurriculum: '/admissions/my-curriculum/',

    // ── Permission Management ────────────────────────────────
    users: '/accounts/users/',
    staff: '/accounts/staff/',
    permissionCategories: '/accounts/permissions/',
    permissionToggle: (id) => `/accounts/permissions/${id}/toggle/`,

    // ── Audit Logs ───────────────────────────────────────────
    auditLogs: '/audit/logs/',
    auditLogFilters: '/audit/logs/filters/',
    auditLogDetail: (id) => `/audit/logs/${id}/`,

    // ── System Configuration (Core) ──────────────────────────
    systemConfig: '/core/config/',
    systemConfigDetail: (key) => `/core/config/${key}/`,

    // ── Exam Permits ─────────────────────────────────────────
    myExamPermits: '/admissions/my-exam-permits/',
    generateExamPermit: '/admissions/generate-exam-permit/',
    printExamPermit: (id) => `/admissions/print-exam-permit/${id}/`,
    examMappings: '/admissions/exam-mappings/',
    examMappingDetail: (id) => `/admissions/exam-mappings/${id}/`,
    examPermitList: '/admissions/exam-permits/',

    // ── Notifications ────────────────────────────────────────
    notifications: {
        list: '/core/notifications/',
        unreadCount: '/core/notifications/unread-count/',
        markRead: (id) => `/core/notifications/${id}/mark-read/`,
        markAllRead: '/core/notifications/mark-all-read/',
        delete: (id) => `/core/notifications/${id}/`,
    },

    // ── Grade Resolution (Phase 4) ──────────────────────────
    gradeResolutions: '/admissions/grade-resolutions/',
    gradeResolution: (id) => `/admissions/grade-resolutions/${id}/`,
    gradeResolutionApprove: (id) => `/admissions/grade-resolutions/${id}/approve/`,
    gradeResolutionReject: (id) => `/admissions/grade-resolutions/${id}/reject/`,
    pendingResolutions: '/admissions/grade-resolutions/pending/',

    // ── Professor Grading (EPIC 5) ──────────────────────────
    grading: {
        sections: '/admissions/grading/sections/',
        students: '/admissions/grading/students/',
        submit: '/admissions/grading/submit/',
        bulk: '/admissions/grading/bulk/',
        history: (id) => `/admissions/grading/history/${id}/`,
    },

    // ── Registrar Grade Finalization ─────────────────────────
    sectionsForFinalization: '/admissions/grades/sections/',
    finalizeSection: (id) => `/admissions/grades/section/${id}/finalize/`,

    // ── Data Exports ─────────────────────────────────────────
    exportStudents: '/admissions/export/students/',
    exportEnrollments: '/admissions/export/enrollments/',
    exportPayments: '/admissions/export/payments/',

    // ── Legacy ───────────────────────────────────────────────
    me: '/accounts/me/',
};
