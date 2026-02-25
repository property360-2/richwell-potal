import { api, endpoints } from '../../../api';

const ProfessorService = {
    getProfile: async () => {
        return await api.get(endpoints.me);
    },

    getActiveSemester: async () => {
        try {
            const data = await api.get(endpoints.semesters);
            const semesters = data.results || data || [];
            return semesters.find(s => s.is_current) || semesters[0];
        } catch (err) {
            console.error("Failed to fetch semesters:", err);
            return null;
        }
    },

    getDashboardData: async (professorId, semesterId) => {
        return await api.get(`/academics/professor/${professorId}/schedule/${semesterId}/`);
    },

    getGradingSections: async (semesterId) => {
        return await api.get(`/admissions/grading/sections/?semester=${semesterId}`);
    },

    getGradingStudents: async (sectionSubjectId, query = '', ordering = '') => {
        let url = `/admissions/grading/students/?section_subject=${sectionSubjectId}`;
        if (query) url += `&search=${encodeURIComponent(query)}`;
        if (ordering) url += `&ordering=${ordering}`;
        return await api.get(url);
    },

    submitGrade: async (payload) => {
        return await api.post('/admissions/grading/submit/', payload);
    },

    getGradeHistory: async (subjectEnrollmentId) => {
        return await api.get(`/admissions/grading/history/${subjectEnrollmentId}/`);
    },

    // Grade Resolution methods
    getResolutions: async () => {
        return await api.get(endpoints.gradeResolutions);
    },

    createResolution: async (data) => {
        return await api.post(endpoints.gradeResolutions, data);
    },

    getSemesters: async () => {
        const data = await api.get(endpoints.semesters);
        return data.results || data || [];
    }
};

export default ProfessorService;
