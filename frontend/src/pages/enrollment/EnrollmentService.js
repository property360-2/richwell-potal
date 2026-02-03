import { api, endpoints } from '../../api.js';

/**
 * Enrollment Service for Student
 * Handles all data fetching related to subject enrollment
 */
export const EnrollmentService = {
    async loadEnrollmentData() {
        try {
            const [me, activeSem, student, enrollmentStatus, fees] = await Promise.all([
                api.get(endpoints.me),
                api.get(`${endpoints.manageSemesters}active/`),
                api.get(`${endpoints.students}me/`),
                api.get(`${endpoints.enrollments}my-enrollment-status/`),
                api.get(`${endpoints.studentFees}my-balances/`)
            ]);

            const semesterId = activeSem?.id;
            const curriculumId = student?.curriculum?.id;

            // Load subjects and sections once we have the necessary IDs
            const [recommended, available, enrolled] = await Promise.all([
                curriculumId ? api.get(`${endpoints.curricula}${curriculumId}/recommended-subjects/?semester=${semesterId}`) : Promise.resolve([]),
                api.get(`${endpoints.subjects}available/?semester=${semesterId}`),
                api.get(`${endpoints.enrollments}my-subjects/?semester=${semesterId}`)
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
        return api.post(`${endpoints.enrollments}bulk-enroll/`, payload);
    },

    async unenrollSubject(enrollmentId) {
        return api.delete(`${endpoints.enrollments}${enrollmentId}/`);
    },

    async getSubjectSections(subjectId, semesterId) {
        const resp = await api.get(`${endpoints.sections}available/?subject=${subjectId}&semester=${semesterId}`);
        return resp.results || resp || [];
    }
};
