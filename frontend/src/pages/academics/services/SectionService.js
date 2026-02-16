import { api, endpoints } from '../../../api';

export const SectionService = {
    /**
     * Fetch all sections with optional filtering
     */
    async getSections(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `${endpoints.sections}?${query}` : endpoints.sections;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch sections', e);
            throw e;
        }
    },

    /**
     * Create a new section
     */
    async createSection(data) {
        try {
            return await api.post(endpoints.sections, data);
        } catch (e) {
            console.error('Failed to create section', e);
            throw e;
        }
    },

    /**
     * Bulk create sections
     */
    async bulkCreateSections(data) {
        try {
            return await api.post(`${endpoints.sections}bulk-create/`, data);
        } catch (e) {
            console.error('Failed to bulk create sections', e);
            throw e;
        }
    },

    /**
     * Update an existing section
     */
    async updateSection(id, data) {
        try {
            return await api.patch(endpoints.section(id), data);
        } catch (e) {
            console.error('Failed to update section', e);
            throw e;
        }
    },

    /**
     * Delete a section (soft delete)
     */
    async deleteSection(id) {
        try {
            return await api.delete(endpoints.section(id));
        } catch (e) {
            console.error('Failed to delete section', e);
            throw e;
        }
    },

    /**
     * Fetch all semesters
     */
    async getSemesters() {
        try {
            const resp = await api.get(endpoints.semesters);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch semesters', e);
            return [];
        }
    },

    /**
     * Fetch all active curricula for a program
     */
    async getProgramCurricula(programId) {
        try {
            const resp = await api.get(`${endpoints.curricula}?program=${programId}&is_active=true`);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch curricula', e);
            return [];
        }
    }
};
