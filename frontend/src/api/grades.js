import api from './axios';

export const gradesApi = {
    getGrades: (params) => api.get('grades/advising/', { params }),
    getHistory: (params) => api.get('grades/advising/', { params }),
    getProfessorSections: () => api.get('sections/my-sections/'),
    getProfessorSchedule: () => api.get('sections/my-schedule/'),
    getSectionStudents: (sectionId, subjectId) => api.get('grades/submission/roster/', {
        params: { section_id: sectionId, subject_id: subjectId }
    }),
    submitMidterm: (gradeId, value, isInc = false, override = false) => api.post(`grades/submission/${gradeId}/submit-midterm/`, { value, is_inc: isInc, override_grading_window: override }),
    submitFinal: (gradeId, value, isInc = false, override = false) => api.post(`grades/submission/${gradeId}/submit-final/`, { value, is_inc: isInc, override_grading_window: override }),
    requestResolution: (gradeId, reason) => api.post(`grades/resolution/${gradeId}/request-resolution/`, { reason }),
    finalizeSection: (data) => api.post('grades/submission/finalize-section/', {
        term_id: data.term,
        subject_id: data.subject,
        section_id: data.section
    }),
    finalizeTerm: (termId) => api.post('grades/submission/finalize-term/', { term_id: termId }),
    closeGradingPeriod: (termId, periodType) => api.post('grades/submission/close-grading-period/', { term_id: termId, period_type: periodType }),
    registrarApproveResolution: (gradeId) => api.post(`grades/resolution/${gradeId}/registrar-approve/`),
    registrarRejectResolution: (gradeId, reason) => api.post(`grades/resolution/${gradeId}/registrar-reject/`, { reason }),
    submitResolvedGrade: (gradeId, newGrade) => api.post(`grades/resolution/${gradeId}/submit-grade/`, { new_grade: newGrade }),
    headApproveResolution: (gradeId) => api.post(`grades/resolution/${gradeId}/head-approve/`),
    headRejectResolution: (gradeId, reason) => api.post(`grades/resolution/${gradeId}/head-reject/`, { reason }),
    registrarFinalizeResolution: (gradeId) => api.post(`grades/resolution/${gradeId}/registrar-finalize/`),
    bulkHistoricalEncode: (studentId, creditData, source) => api.post('grades/crediting/bulk-historical-encode/', {
        student_id: studentId,
        credit_data: creditData,
        source: source
    }),
};

export default gradesApi;
