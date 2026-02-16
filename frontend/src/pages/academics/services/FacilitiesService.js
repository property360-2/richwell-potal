import { api, endpoints } from '../../../api';

export const FacilitiesService = {
    /**
     * Fetch all rooms with optional filtering
     */
    async getRooms(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `${endpoints.rooms}?${query}` : endpoints.rooms;
            const resp = await api.get(url);
            return resp.results || resp || [];
        } catch (e) {
            console.error('Failed to fetch rooms', e);
            throw e;
        }
    },

    /**
     * Create a new room
     */
    async createRoom(data) {
        try {
            return await api.post(endpoints.rooms, data);
        } catch (e) {
            console.error('Failed to create room', e);
            throw e;
        }
    },

    /**
     * Update an existing room
     */
    async updateRoom(id, data) {
        try {
            return await api.patch(`${endpoints.rooms}${id}/`, data);
        } catch (e) {
            console.error('Failed to update room', e);
            throw e;
        }
    },

    /**
     * Delete a room (soft delete/archive by setting is_active=false)
     */
    async deleteRoom(id) {
        try {
            // Check if backend supports hard delete or we should use is_active toggle
            return await api.delete(`${endpoints.rooms}${id}/`);
        } catch (e) {
            console.error('Failed to delete room', e);
            throw e;
        }
    },

    /**
     * Toggle room active status
     */
    async toggleRoomStatus(id, isActive) {
        try {
            return await api.patch(`${endpoints.rooms}${id}/`, { is_active: isActive });
        } catch (e) {
            console.error('Failed to toggle room status', e);
            throw e;
        }
    }
};
