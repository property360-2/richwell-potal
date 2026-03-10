import axios from './axios';

export const sectionsApi = {
    getStats: (termId) => axios.get(`/api/sections/stats/`, { params: { term_id: termId } }),
    generate: (data) => axios.post(`/api/sections/generate/`, data),
    getSections: (params) => axios.get(`/api/sections/`, { params }),
    getSectionRoster: (id) => axios.get(`/api/sections/${id}/roster/`),
    transferStudent: (id, data) => axios.post(`/api/sections/${id}/transfer/`, data),
};
