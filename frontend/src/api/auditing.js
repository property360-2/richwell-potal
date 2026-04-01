import api from './axios';

export const auditingApi = {
    getLogs: (params) => api.get('auditing/', { params }),
    exportCsv: (params) => api.get('auditing/export-csv/', { params, responseType: 'blob' }),
    getRegistrarHistory: (params) => api.get('auditing/registrar-history/', { params }),
    exportRegistrarCsv: (params) => api.get('auditing/registrar-history/export_csv/', { params, responseType: 'blob' }),
};
