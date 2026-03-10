import axios from './axios';

export const sectionsApi = {
    getStats: (termId) => axios.get(`sections/stats/`, { params: { term_id: termId } }),
    generate: (data) => axios.post(`sections/generate/`, data),
    getSections: (params) => axios.get(`sections/`, { params }),
    getSectionRoster: (id) => axios.get(`sections/${id}/roster/`),
    transferStudent: (id, data) => axios.post(`sections/${id}/transfer/`, data),
};
