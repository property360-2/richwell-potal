import { api, endpoints } from '../../../api';

const CashierService = {
    getTodayTransactions: async () => {
        try {
            return await api.get(endpoints.cashierTodayTransactions);
        } catch (err) {
            return [];
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
    }
};

export default CashierService;
