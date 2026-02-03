import { api, endpoints } from '../../api.js';

/**
 * Academic Service for Registrar
 * Handles all data fetching related to academic structure
 */
export const AcademicService = {
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

    async loadProfessors() {
        try {
            const resp = await api.get(endpoints.professors);
            return resp.results || resp || [];
        } catch (e) { console.error('Load professors failed', e); return []; }
    },

    async loadCurricula(programId = null) {
        try {
            const url = programId ? `${endpoints.manageCurricula}?program=${programId}` : endpoints.manageCurricula;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load curricula failed', e); return []; }
    },

    async loadRooms() {
        try {
            const resp = await api.get(endpoints.rooms);
            return resp.results || resp || [];
        } catch (e) { console.error('Load rooms failed', e); return []; }
    },

    async loadSemesters() {
        try {
            const resp = await api.get(endpoints.manageSemesters);
            return resp.results || resp || [];
        } catch (e) { console.error('Load semesters failed', e); return []; }
    },

    async loadSections(params = {}) {
        try {
            let url = endpoints.sections;
            const query = new URLSearchParams(params).toString();
            if (query) url += `?${query}`;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load sections failed', e); return []; }
    },

    async loadSectionDetails(sectionId) {
        try {
            const [section, subjects, schedule] = await Promise.all([
                api.get(endpoints.section(sectionId)),
                api.get(`${endpoints.section(sectionId)}detailed-view/`),
                api.get(`${endpoints.scheduleSlots}?section=${sectionId}`)
            ]);
            return {
                section,
                detailedSubjects: subjects.subjects || [],
                schedule: schedule.results || schedule || []
            };
        } catch (e) { console.error('Load section details failed', e); throw e; }
    }
};
