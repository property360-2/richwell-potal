import { api, endpoints } from '../../../api';

const AdmissionService = {
    getApplicants: async (status = 'PENDING') => {
        try {
            return await api.get(endpoints.applicants, { status });
        } catch (err) {
            console.error("Fetch Applicants Error:", err);
            return [];
        }
    },

    checkIdAvailability: async (studentId) => {
        try {
            const res = await api.get(endpoints.checkStudentId(studentId));
            return res;
        } catch (err) {
            return { available: false };
        }
    },

    generateStudentId: async () => {
        try {
            const res = await api.get(endpoints.generateStudentId);
            return res;
        } catch (err) {
            console.error("Generate ID Error:", err);
            return null;
        }
    },

    approveApplicant: async (applicantId, studentId) => {
        return await api.patch(endpoints.applicantUpdate(applicantId), { 
            action: 'accept', 
            student_number: studentId 
        });
    },

    rejectApplicant: async (applicantId, reason = '') => {
        return await api.patch(endpoints.applicantUpdate(applicantId), { 
            action: 'reject', 
            reason 
        });
    }
};

export default AdmissionService;
