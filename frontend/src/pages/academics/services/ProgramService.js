import { api, endpoints } from '../../../api';

export const ProgramService = {
    /**
     * Fetch all programs for management
     */
    async getPrograms(search = '') {
        try {
            const url = search
                ? `${endpoints.managePrograms}?search=${encodeURIComponent(search)}`
                : endpoints.managePrograms;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch programs', e);
            return [];
        }
    },

    /**
     * Check if a program code already exists
     */
    async checkDuplicate(code) {
        try {
            const resp = await api.get(`${endpoints.managePrograms}check-duplicate/?code=${encodeURIComponent(code)}`);
            return resp.duplicate;
        } catch (e) {
            console.error('Duplicate check failed', e);
            return false;
        }
    },

    /**
     * Create a new program
     */
    /**
     * Create a new program
     */
    async createProgram(data) {
        try {
            return await api.post(endpoints.managePrograms, data);
        } catch (e) {
            console.error('Failed to create program', e);
            throw e;
        }
    },

    /**
     * Update an existing program
     */
    async updateProgram(id, data) {
        try {
            return await api.patch(`${endpoints.managePrograms}${id}/`, data);
        } catch (e) {
            console.error('Failed to update program', e);
            throw e;
        }
    },

    /**
     * Fetch single program detail
     */
    async getProgramDetail(id) {
        try {
            return await api.get(`${endpoints.managePrograms}${id}/`);
        } catch (e) {
            console.error('Failed to fetch program detail', e);
            throw e;
        }
    },

    /**
     * Fetch subjects (with optional program filtering)
     */
    async getSubjects(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `${endpoints.manageSubjects}?${query}` : endpoints.manageSubjects;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch subjects', e);
            throw e;
        }
    },

    /**
     * Create a new subject
     */
    async createSubject(data) {
        try {
            return await api.post(endpoints.manageSubjects, data);
        } catch (e) {
            console.error('Failed to create subject', e);
            throw e;
        }
    },

    /**
     * Update an existing subject
     */
    async updateSubject(id, data) {
        try {
            return await api.patch(`${endpoints.manageSubjects}${id}/`, data);
        } catch (e) {
            console.error('Failed to update subject', e);
            throw e;
        }
    },

    /**
     * Delete a subject (soft delete)
     */
    async deleteSubject(id) {
        try {
            return await api.delete(`${endpoints.manageSubjects}${id}/`);
        } catch (e) {
            console.error('Failed to delete subject', e);
            throw e;
        }
    }
};
