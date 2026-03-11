import api from './axios';

export const financeApi = {
    // Payments
    getPayments: (params) => api.get('finance/payments/', { params }),
    recordPayment: (data) => api.post('finance/payments/', data),
    recordAdjustment: (data) => api.post('finance/payments/adjust/', data),

    // Permits
    getPermitStatus: (studentId, termId) => api.get(`finance/permits/status/?student_id=${studentId}&term_id=${termId}`),
    getMyPermits: (termId) => api.get(`finance/permits/my-permits/?term_id=${termId}`),
};
