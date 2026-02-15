import { api, endpoints } from '../../../api';

const HeadService = {
    getPendingEnrollments: async () => {
        const res = await fetch(endpoints.headPendingEnrollments);
        if (res.ok) {
            const data = await res.json();
            return data.results || data || [];
        }
        return [];
    },

    approveSubject: async (subjectEnrollmentId) => {
        const res = await fetch(endpoints.headApprove(subjectEnrollmentId), {
            method: 'POST'
        });
        return res.ok ? res.json() : null;
    },

    rejectSubject: async (subjectEnrollmentId, reason) => {
        const res = await fetch(endpoints.headReject(subjectEnrollmentId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        return res.ok ? res.json() : null;
    },

    bulkApprove: async (subjectEnrollmentIds) => {
        const res = await fetch(endpoints.headBulkApprove, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: subjectEnrollmentIds })
        });
        return res.ok ? res.json() : null;
    },

    getReports: async (params) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${endpoints.reports}?${query}`);
        return res.ok ? res.json() : null;
    },

    getPendingResolutions: async () => {
        const res = await fetch(`${endpoints.gradeResolutions}pending/`);
        return res.ok ? res.json() : [];
    },

    processResolution: async (id, action, data) => {
        const res = await fetch(`${endpoints.gradeResolutions}${id}/${action}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok ? res.json() : null;
    }
};

export default HeadService;
