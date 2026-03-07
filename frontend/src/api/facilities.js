import api from './axios';

export const facilitiesApi = {
    getRooms: (params) => api.get('facilities/', { params }),
    getRoom: (id) => api.get(`facilities/${id}/`),
    createRoom: (data) => api.post('facilities/', data),
    updateRoom: (id, data) => api.patch(`facilities/${id}/`, data),
    deleteRoom: (id) => api.delete(`facilities/${id}/`),
};

export default facilitiesApi;
