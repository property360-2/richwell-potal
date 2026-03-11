import api from './axios';

export const termsApi = {
    getTerms: (params) => api.get('terms/', { params }),
    getTerm: (id) => api.get(`terms/${id}/`),
    createTerm: (data) => api.post('terms/', data),
    updateTerm: (id, data) => api.patch(`terms/${id}/`, data),
    deleteTerm: (id) => api.delete(`terms/${id}/`),
    activateTerm: (id) => api.post(`terms/${id}/activate/`),
    getActiveTerm: () => api.get('terms/?is_active=true'),
};

export default termsApi;
