import { api, endpoints } from '../../../api';

const ProfessorService = {
    getProfile: async () => {
        const res = await fetch(endpoints.me);
        return res.ok ? res.json() : null;
    },

    getActiveSemester: async () => {
        const res = await fetch(endpoints.semesters);
        if (res.ok) {
            const data = await res.json();
            const semesters = data.results || data || [];
            return semesters.find(s => s.is_current) || semesters[0];
        }
        return null;
    },

    getDashboardData: async (professorId, semesterId) => {
        const res = await fetch(`/api/v1/academic/professor/${professorId}/schedule/${semesterId}/`);
        return res.ok ? res.json() : null;
    },

    getGradingSections: async (semesterId) => {
        const url = `/api/v1/grading/sections/?semester=${semesterId}`;
        const res = await fetch(url);
        return res.ok ? res.json() : null;
    },

    getGradingStudents: async (sectionSubjectId, query = '', ordering = '') => {
        let url = `/api/v1/grading/students/?section_subject=${sectionSubjectId}`;
        if (query) url += `&search=${encodeURIComponent(query)}`;
        if (ordering) url += `&ordering=${ordering}`;
        const res = await fetch(url);
        return res.ok ? res.json() : null;
    },

    submitGrade: async (payload) => {
        const res = await fetch('/api/v1/grading/submit-grade/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok ? res.json() : null;
    },

    getGradeHistory: async (subjectEnrollmentId) => {
        const res = await fetch(`/api/v1/grading/history/${subjectEnrollmentId}/`);
        return res.ok ? res.json() : null;
    }
};

export default ProfessorService;
