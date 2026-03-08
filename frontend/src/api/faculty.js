import api from './axios';

export const facultyApi = {
    // Get all professors
    getAll: (params) => api.get('/faculty/professors/', { params }),

    // Get single professor
    getOne: (id) => api.get(`/faculty/professors/${id}/`),

    // Create professor
    create: (data) => api.post('/faculty/professors/', data),

    // Update professor
    update: (id, data) => api.patch(`/faculty/professors/${id}/`, data),

    // Delete professor
    delete: (id) => api.delete(`/faculty/professors/${id}/`),

    // Get subjects for a professor
    getSubjects: (id) => api.get(`/faculty/professors/${id}/subjects/`),

    // Assign subjects to a professor
    assignSubjects: (id, subject_ids) => api.post(`/faculty/professors/${id}/assign_subjects/`, { subject_ids })
};
