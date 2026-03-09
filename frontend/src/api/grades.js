import api from './axios';

export const gradesApi = {
    getGrades: () => api.get('grades/advising/'),
    getAdvising: (termId) => api.get(`grades/advising/?term=${termId}&is_credited=false`),
    submitAdvising: (data) => api.post('grades/advising/submit/', data),
    getPassedSubjects: () => api.get('grades/advising/?grade_status=PASSED&page_size=1000'),
};
