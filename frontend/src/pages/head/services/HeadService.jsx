import { api, endpoints } from '../../../api';

const HeadService = {
    getPendingEnrollments: async () => {
        const data = await api.get(endpoints.headPendingEnrollments);
        return data.pending_enrollments || data.results || data || [];
    },

    approveSubject: async (subjectEnrollmentId) => {
        return await api.post(endpoints.headApprove(subjectEnrollmentId), {});
    },

    rejectSubject: async (subjectEnrollmentId, reason) => {
        return await api.post(endpoints.headReject(subjectEnrollmentId), { reason });
    },

    bulkApprove: async (subjectEnrollmentIds) => {
        return await api.post(endpoints.headBulkApprove, { enrollment_ids: subjectEnrollmentIds });
    },

    getReports: async (params) => {
        const data = await api.get(endpoints.reports, params);
        if (data && !data.error) {
            return {
                success: true,
                results: data.results || data,
                count: Array.isArray(data.results || data) ? (data.results || data).length : 0
            };
        }
        return { success: false, results: [] };
    },

    getAdmissionStats: async (semesterId) => {
        const params = semesterId ? { semester: semesterId } : {};
        return await api.get(endpoints.admissionStats, { params });
    },

    getPaymentReport: async (semesterId) => {
        const params = semesterId ? { semester: semesterId } : {};
        return await api.get(endpoints.paymentReport, { params });
    },

    getPendingResolutions: async () => {
        const data = await api.get(`${endpoints.gradeResolutions}pending/`);
        return Array.isArray(data.results || data) ? (data.results || data) : [];
    },

    processResolution: async (id, action, data) => {
        return await api.post(`${endpoints.gradeResolutions}${id}/${action}/`, data);
    },

    getStudents: async (params) => {
        const data = await api.get(endpoints.registrarStudents, params);
        return data.results || data || [];
    },

    getPrograms: async () => {
        const data = await api.get(endpoints.academicPrograms);
        return data.results || data || [];
    }
};

export default HeadService;
