import { api, endpoints } from '../../api';

const CashierService = {
    getTodayTransactions: async () => {
        const res = await fetch(endpoints.cashierTodayTransactions);
        if (res.ok) {
            const data = await res.json();
            return data.data?.transactions || [];
        }
        return [];
    },

    getPendingPayments: async () => {
        const res = await fetch(endpoints.cashierPendingPayments);
        if (res.ok) {
            const data = await res.json();
            return data.results || data.data?.results || [];
        }
        return [];
    },

    searchStudent: async (query) => {
        const res = await fetch(`${endpoints.cashierStudentSearch}?q=${encodeURIComponent(query)}`);
        if (res.ok) {
            const data = await res.json();
            return data.results || [];
        }
        return [];
    },

    recordPayment: async (payload) => {
        const res = await fetch(endpoints.cashierRecordPayment, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok ? res.json() : null;
    },

    getMyPayments: async () => {
        const res = await fetch(endpoints.myPayments);
        if (res.ok) {
            const data = await res.json();
            return data.data || data;
        }
        return null;
    }
};

export default CashierService;
