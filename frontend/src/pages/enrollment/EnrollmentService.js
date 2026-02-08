import { api, endpoints } from '../../api.js';

/**
 * Enrollment Service for Student
 * Handles all data fetching related to subject enrollment
 */
export const EnrollmentService = {
    async loadEnrollmentData() {
        console.log('EnrollmentService.loadEnrollmentData called (v2)');
        try {
            const [me, activeSem, student, enrollmentStatus, fees] = await Promise.all([
                api.get(endpoints.accounts.profile),
                api.get(endpoints.activeSemester),
                api.get(endpoints.accounts.profile), // User profile contains curriculum info
                api.get(endpoints.myEnrollment),
                api.get(endpoints.myPayments)
            ]);

            const semesterId = activeSem?.id;
            const curriculumId = student?.curriculum?.id;

            // Load subjects and sections once we have the necessary IDs
            const [recommended, available, enrolled] = await Promise.all([
                api.get(endpoints.recommendedSubjects),
                api.get(endpoints.availableSubjects),
                api.get(endpoints.myEnrollments)
            ]);

            return {
                user: me,
                activeSemester: activeSem,
                student,
                enrollmentStatus,
                fees,
                recommendedSubjects: recommended || [],
                availableSubjects: available?.results || available || [],
                enrolledSubjects: enrolled?.results || enrolled || []
            };
        } catch (e) {
            console.error('Failed to load enrollment data', e);
            throw e;
        }
    },

    async enrollSubjects(payload) {
        // payload usually { subject_id, section_id }
        return api.post(endpoints.enrollSubject, payload);
    },

    async unenrollSubject(enrollmentId) {
        return api.post(endpoints.dropSubject(enrollmentId));
    },

    async getSubjectSections(subjectId, semesterId) {
        // Query sections for this subject and semester
        // Assuming standard list endpoint with filters
        return api.get(`${endpoints.sections}?subject=${subjectId}&semester=${semesterId}`);
    }
};
