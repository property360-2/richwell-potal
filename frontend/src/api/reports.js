import api from './axios';

export const reportsApi = {
    getMasterlist: (params) => api.get('reports/masterlist/', {
        params,
        responseType: 'blob'
    }),
    getCOR: (params) => api.get('reports/cor/', {
        params,
        responseType: 'blob'
    }),
    checkGraduation: (student_id) => api.get('reports/graduation_check/', {
        params: { student_id }
    }),
    getStats: () => api.get('reports/stats/'),
    getAcademicSummary: (params) => api.get('reports/academic-summary/', { params }),
};
