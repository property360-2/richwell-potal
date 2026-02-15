import { api, endpoints } from '../../../api';

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

    async loadSubjects(params = {}) {
        try {
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v != null && v !== '' && v !== 'undefined')
            );
            const query = new URLSearchParams(cleanParams).toString();
            const url = query ? `${endpoints.manageSubjects}?${query}` : endpoints.manageSubjects;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load subjects failed', e); return []; }
    },

    async checkSubjectCodeDuplicate(code) {
        try {
            const resp = await api.get(`${endpoints.manageSubjects}check-duplicate/?code=${encodeURIComponent(code)}`);
            return resp.duplicate;
        } catch (e) { console.error(e); return false; }
    },

    async loadProfessors(search = '') {
        try {
            const url = search
                ? `${endpoints.professors}?search=${encodeURIComponent(search)}`
                : endpoints.professors;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Load professors failed', e); return []; }
    },

    async checkProfessorEmailDuplicate(email) {
        try {
            const resp = await api.get(`${endpoints.professors}check-duplicate/?email=${encodeURIComponent(email)}`);
            return resp.duplicate;
        } catch (e) { console.error(e); return false; }
    },

    async checkProfessorNameDuplicate(firstName, lastName) {
        try {
            const resp = await api.get(`${endpoints.professors}check-duplicate/?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`);
            return resp.duplicate;
        } catch (e) { console.error(e); return false; }
    },

    async loadProfessorDetail(id) {
        try {
            return await api.get(endpoints.professorDetail(id));
        } catch (e) { console.error('Load professor detail failed', e); throw e; }
    },

    async loadProfessorSchedule(profId, semesterId) {
        try {
            return await api.get(endpoints.professorSchedule(profId, semesterId));
        } catch (e) { console.error('Load professor schedule failed', e); return []; }
    },

    async loadCurricula(programId = null) {
        try {
            const url = programId ? `${endpoints.curricula}?program=${programId}` : endpoints.curricula;
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
            const resp = await api.get(endpoints.semesters);
            return resp.results || resp || [];
        } catch (e) { console.error('Load semesters failed', e); return []; }
    },

    async loadSections(params = {}) {
        try {
            let url = endpoints.sections;
            // Clean up params: remove null/undefined/empty string
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v != null && v !== '' && v !== 'undefined')
            );
            const query = new URLSearchParams(cleanParams).toString();
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
    },

    async loadAllScheduleSlots(semesterId) {
        try {
            const resp = await api.get(`${endpoints.scheduleSlots}?semester=${semesterId}&limit=1000`);
            return resp.results || resp || [];
        } catch (e) { console.error('Load all schedule slots failed', e); return []; }
    },

    async loadCurriculumStructure(curriculumId) {
        try {
            return await api.get(`${endpoints.curriculum(curriculumId)}structure/`);
        } catch (e) { console.error('Load curriculum structure failed', e); throw e; }
    },

    async assignCurriculumSubjects(curriculumId, assignments) {
        try {
            return await api.post(`${endpoints.curriculum(curriculumId)}assign_subjects/`, { assignments });
        } catch (e) { console.error('Assign curriculum subjects failed', e); throw e; }
    },

    async removeCurriculumSubject(curriculumId, subjectId) {
        try {
            return await api.delete(`${endpoints.curriculum(curriculumId)}subjects/${subjectId}/`);
        } catch (e) { console.error('Remove curriculum subject failed', e); throw e; }
    }
};
