import { api, endpoints } from '../../api.jsx';

/**
 * Academic Service for Admin
 * Handles all data fetching related to academic structure management
 */
export const AdminAcademicService = {
    async loadPrograms() {
        try {
            const resp = await api.get(endpoints.managePrograms);
            return resp.results || resp || [];
        } catch (e) { console.error('Load programs failed', e); return []; }
    },

    async loadSubjects(programId = null) {
        try {
            const url = programId ? `${endpoints.manageSubjects}?program=${programId}` : endpoints.manageSubjects;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load subjects failed', e); return []; }
    },

    async loadCurricula(programId = null) {
        try {
            const url = programId ? `${endpoints.manageCurricula}?program=${programId}` : endpoints.manageCurricula;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load curricula failed', e); return []; }
    },

    async loadSemesters() {
        try {
            const resp = await api.get(endpoints.manageSemesters);
            return resp.results || resp || [];
        } catch (e) { console.error('Load semesters failed', e); return []; }
    }
};
