import { api, endpoints } from '../../../api';

/**
 * Service for managing Faculty (Professors)
 */
export const FacultyService = {
    /**
     * Get list of professors with optional filtering
     */
    async getProfessors(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `${endpoints.professors}?${query}` : endpoints.professors;
            const res = await api.get(url);
            return res.results || res || [];
        } catch (error) {
            console.error('Failed to fetch professors:', error);
            throw error;
        }
    },

    /**
     * Get details of a specific professor
     */
    async getProfessor(id) {
        try {
            return await api.get(endpoints.professorDetail(id));
        } catch (error) {
            console.error('Failed to fetch professor details:', error);
            throw error;
        }
    },

    /**
     * Create a new professor
     */
    async createProfessor(data) {
        try {
            return await api.post(endpoints.professors, data);
        } catch (error) {
            console.error('Failed to create professor:', error);
            throw error;
        }
    },

    /**
     * Update a professor
     */
    async updateProfessor(id, data) {
        try {
            return await api.patch(endpoints.professorDetail(id), data);
        } catch (error) {
            console.error('Failed to update professor:', error);
            throw error;
        }
    },

    /**
     * Search subjects for assignment
     */
    async searchSubjects(query, programIds = []) {
        try {
            let url = `${endpoints.academicSubjects}?search=${encodeURIComponent(query)}`;
            if (programIds && programIds.length > 0) {
                // Backend SubjectViewSet supports ?program=ID
                // If multiple programs, we might need to handle it. 
                // For now, let's use the first one or multiple if supported.
                programIds.forEach(id => {
                    url += `&program=${id}`;
                });
            }
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) { console.error('Subject search failed', e); return []; }
    },

    async getPrograms() {
        try {
            const resp = await api.get(endpoints.programs);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch programs', e);
            return [];
        }
    },

    /**
     * Check for duplicate professor name/email
     */
    async checkDuplicate(params) {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await api.get(`${endpoints.professors}check-duplicate/?${query}`);
            return res;
        } catch (error) {
            console.error('Failed to check duplicate:', error);
            return { duplicate: false };
        }
    }
};
