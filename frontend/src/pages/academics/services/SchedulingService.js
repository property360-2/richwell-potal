import { api } from '../../../api';

export const SchedulingService = {
    /**
     * Get all sections with their scheduling progress for a specific semester.
     */
    getSectionsProgress: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = query ? `/academics/sections/detailed-view/?${query}` : '/academics/sections/detailed-view/';
        const response = await api.get(url);
        return response;
    },

    /**
     * Update a section subject (e.g. assign professor).
     */
    updateSectionSubject: async (id, data) => {
        const response = await api.patch(`/academics/section-subjects/${id}/`, data);
        return response;
    },

    /**
     * Create a section subject.
     */
    createSectionSubject: async (data) => {
        const response = await api.post('/academics/section-subjects/', data);
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
        const response = await api.post('/academics/check-professor-conflict/', data);
        return response;
    },

    /**
     * Check for room conflicts.
     */
    checkRoomConflict: async (data) => {
        const response = await api.post('/academics/check-room-conflict/', data);
        return response;
    },

    /**
     * Check for section conflicts.
     */
    checkSectionConflict: async (data) => {
        const response = await api.post('/academics/check-section-conflict/', data);
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
    },

    /**
     * Fetch all semesters.
     */
    getSemesters: async () => {
        const response = await api.get('/academics/semesters/');
        return response.results || response || [];
    },

    /**
     * Get all rooms for autocomplete.
     */
    getRooms: async () => {
        const response = await api.get('/academics/rooms/');
        // Handle pagination if present, or just return results
        return response.results || response || [];
    }
};
