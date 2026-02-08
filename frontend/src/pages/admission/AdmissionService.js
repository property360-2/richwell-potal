import { api, endpoints } from '../../api.js';

/**
 * Admission Service
 * Handles applicant management and ID assignment
 */
export const AdmissionService = {
    async loadApplicants() {
        try {
            const resp = await api.get(endpoints.applicants);
            return resp.results || resp || [];
        } catch (e) { console.error('Load applicants failed', e); return []; }
    },

    async checkIdAvailability(id) {
        return api.get(endpoints.checkStudentId(id));
    },

    async assignId(applicantId, studentId) {
        return api.patch(endpoints.applicantUpdate(applicantId), { action: 'accept', student_number: studentId });
    },

    async rejectApplicant(applicantId, reason = '') {
        return api.patch(endpoints.applicantUpdate(applicantId), { action: 'reject', reason });
    },

    async verifyDocument(documentId) {
        return api.post(endpoints.verifyDocument(documentId));
    }
};
