import api from './axios';

export const gradesApi = {
    getGrades: () => api.get('grades/advising/'), // Student fetching their grades
    getHistory: () => api.get('grades/advising/'),
    getProfessorSections: () => api.get('sections/my-sections/'),
    getProfessorSchedule: () => api.get('sections/my-schedule/'),
    getSectionStudents: (sectionId, subjectId) => api.get('grades/submission/roster/', {
        params: { section_id: sectionId, subject_id: subjectId }
    }),
    submitMidterm: (gradeId, value) => api.post(`grades/submission/${gradeId}/submit-midterm/`, { value }),
    submitFinal: (gradeId, value, isInc = false) => api.post(`grades/submission/${gradeId}/submit-final/`, { value, is_inc: isInc }),
    requestResolution: (gradeId, reason) => api.post(`grades/resolution/${gradeId}/request-resolution/`, { reason }),
};

export default gradesApi;
