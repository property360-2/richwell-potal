import { api, endpoints } from '../../../api';

const AdmissionService = {
    getApplicants: async () => {
        const res = await fetch(endpoints.applicants);
        if (res.ok) {
            const data = await res.json();
            return data.results || data || [];
        }
        return [];
    },

    checkIdAvailability: async (studentId) => {
        const res = await fetch(endpoints.checkStudentId(studentId));
        return res.ok ? res.json() : { available: false };
    },

    approveApplicant: async (applicantId, studentId) => {
        const res = await fetch(endpoints.applicantUpdate(applicantId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept', student_number: studentId })
        });
        return res.ok ? res.json() : null;
    },

    rejectApplicant: async (applicantId, reason = '') => {
        const res = await fetch(endpoints.applicantUpdate(applicantId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', reason })
        });
        return res.ok ? res.json() : null;
    }
};

export default AdmissionService;
