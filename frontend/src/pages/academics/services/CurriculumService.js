import { api, endpoints } from '../../../api';

export const CurriculumService = {
    /**
     * Fetch all curricula for a program
     */
    async getCurricula(programId) {
        try {
            const url = programId
                ? `${endpoints.curricula}?program=${programId}`
                : endpoints.curricula;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch curricula', e);
            throw e;
        }
    },

    /**
     * Get curriculum details
     */
    async getCurriculumDetail(id) {
        try {
            return await api.get(endpoints.curriculum(id));
        } catch (e) {
            console.error('Failed to fetch curriculum detail', e);
            throw e;
        }
    },

    /**
     * Get curriculum structure (Year/Sem grouping)
     */
    async getCurriculumStructure(id) {
        try {
            return await api.get(endpoints.curriculumStructure(id));
        } catch (e) {
            console.error('Failed to fetch curriculum structure', e);
            throw e;
        }
    },

    /**
     * Create a new curriculum revision
     */
    async createCurriculum(data) {
        try {
            return await api.post(endpoints.curricula, data);
        } catch (e) {
            console.error('Failed to create curriculum', e);
            throw e;
        }
    },

    /**
     * Bulk assign subjects to curriculum slots
     */
    async assignSubjects(id, assignments) {
        try {
            return await api.post(endpoints.curriculumAssignSubjects(id), { assignments });
        } catch (e) {
            console.error('Failed to assign subjects', e);
            throw e;
        }
    },

    /**
     * Delete a curriculum (soft delete)
     */
    async deleteCurriculum(id) {
        try {
            return await api.delete(endpoints.curriculum(id));
        } catch (e) {
            console.error('Failed to delete curriculum', e);
            throw e;
        }
    },

    /**
     * Remove a subject from a curriculum
     */
    async deleteCurriculumSubject(curriculumId, subjectId) {
        try {
            return await api.delete(endpoints.curriculumRemoveSubject(curriculumId, subjectId));
        } catch (e) {
            console.error('Failed to remove subject from curriculum', e);
            throw e;
        }
    }
};
