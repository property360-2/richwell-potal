import { api, endpoints } from '../../../api';

const CashierService = {
    getTodayTransactions: async () => {
        try {
            const data = await api.get(endpoints.cashierTodayTransactions);
            return data;
        } catch (err) {
            return { results: [], stats: {} };
        }
    },

    getPendingPayments: async () => {
        try {
            const data = await api.get(endpoints.cashierPendingPayments);
            return data.results || data || [];
        } catch (err) {
            return [];
        }
    },

    searchStudent: async (query) => {
        try {
            const data = await api.get(endpoints.cashierStudentSearch, { q: query });
            return data.results || data || [];
        } catch (err) {
            return [];
        }
    },

    recordPayment: async (payload) => {
        return await api.post(endpoints.cashierRecordPayment, payload);
    },

    getMyPayments: async () => {
        try {
            return await api.get(endpoints.myPayments);
        } catch (err) {
            console.error("SOA Fetch Error:", err);
            return null;
        }
    },

    adjustPayment: async (payload) => {
        return await api.post(endpoints.cashierPaymentAdjust, payload);
    },

    // ── Promissory Notes ──
    getPromissoryNotes: async (status) => {
        try {
            const url = status ? `${endpoints.promissoryNotes}?status=${status}` : endpoints.promissoryNotes;
            const data = await api.get(url);
            return data.results || data || [];
        } catch (err) {
            return [];
        }
    },

    createPromissoryNote: async (payload) => {
        return await api.post(endpoints.promissoryNotes, payload);
    },

    recordPromissoryPayment: async (id, amount, reference, notes) => {
        return await api.post(endpoints.promissoryNoteRecordPayment(id), {
            amount: amount,
            reference_number: reference,
            notes: notes
        });
    },

    cancelPromissoryNote: async (id) => {
        return await api.post(endpoints.promissoryNoteCancel(id));
    }
};

export default CashierService;
