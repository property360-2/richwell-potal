import api from './axios';

export const studentsApi = {
    getStudents: (params) => api.get('students/', { params }),
    getStudent: (id) => api.get(`students/${id}/`),
    updateStudent: (id, data) => api.patch(`students/${id}/`, data),
    apply: (data) => api.post('students/apply/', data),
    approve: (id) => api.post(`students/${id}/approve/`),

    // Enrollments
    getEnrollments: (params) => api.get('students/enrollments/', { params }),
    getEnrollment: (id) => api.get(`students/enrollments/${id}/`),
    createEnrollment: (data) => api.post('students/enrollments/', data),
};

export default studentsApi;
