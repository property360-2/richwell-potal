import api from './axios';

export const auditingApi = {
    getLogs: (params) => api.get('auditing/', { params }),
    exportCsv: (params) => api.get('auditing/export-csv/', { params, responseType: 'blob' }),
};
