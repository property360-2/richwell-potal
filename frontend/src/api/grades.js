import api from './axios';

export const gradesApi = {
    getGrades: (params) => api.get('grades/advising/', { params }),
    getHistory: (params) => api.get('grades/advising/', { params }),
    getProfessorSections: () => api.get('sections/my-sections/'),
    getProfessorSchedule: () => api.get('sections/my-schedule/'),
    getSectionStudents: (sectionId, subjectId) => api.get('grades/submission/roster/', {
        params: { section_id: sectionId, subject_id: subjectId }
    }),
    submitMidterm: (gradeId, value) => api.post(`grades/submission/${gradeId}/submit-midterm/`, { value }),
    submitFinal: (gradeId, value, isInc = false) => api.post(`grades/submission/${gradeId}/submit-final/`, { value, is_inc: isInc }),
    requestResolution: (gradeId, reason) => api.post(`grades/resolution/${gradeId}/request-resolution/`, { reason }),
    finalizeGrades: (data) => api.post('grades/submission/finalize/', {
        term_id: data.term,
        subject_id: data.subject,
        section_id: data.section
    }),
    registrarApproveResolution: (gradeId) => api.post(`grades/resolution/${gradeId}/registrar-approve/`),
};

export default gradesApi;
