import { api } from '../../../api';

export const SchedulingService = {
    /**
     * Get all sections with their scheduling progress for a specific semester.
     */
    getSectionsProgress: async (params = {}) => {
        const response = await api.get('/academics/sections/detailed-view/', { params });
        return response;
    },

    /**
     * Get the full schedule for a specific section.
     */
    getSectionSchedule: async (sectionId) => {
        const response = await api.get(`/academics/sections/${sectionId}/detailed-view/`);
        return response;
    },

    /**
     * Create or update a schedule slot.
     */
    saveSlot: async (slotData) => {
        if (slotData.id) {
            const response = await api.patch(`/academics/schedule-slots/${slotData.id}/`, slotData);
            return response;
        } else {
            const response = await api.post('/academics/schedule-slots/', slotData);
            return response;
        }
    },

    /**
     * Delete a schedule slot.
     */
    deleteSlot: async (slotId) => {
        await api.delete(`/academics/schedule-slots/${slotId}/`);
    },

    /**
     * Check for professor conflicts.
     */
    checkProfessorConflict: async (data) => {
        const response = await api.post('/academics/conflict-check/professor/', data);
        return response;
    },

    /**
     * Check for room conflicts.
     */
    checkRoomConflict: async (data) => {
        const response = await api.post('/academics/conflict-check/room/', data);
        return response;
    },

    /**
     * Check for section conflicts.
     */
    checkSectionConflict: async (data) => {
        const response = await api.post('/academics/conflict-check/section/', data);
        return response;
    },

    /**
     * Get a professor's full schedule for a semester.
     */
    getProfessorSchedule: async (professorId, semesterId) => {
        const response = await api.get(`/accounts/users/${professorId}/schedule/`, {
            params: { semester_id: semesterId }
        });
        return response;
    }
};
