import api from './axios';

export const studentsApi = {
    getStudents: (params) => api.get('students/', { params }),
    getStudent: (id) => api.get(`students/${id}/`),
    updateStudent: (id, data) => api.patch(`students/${id}/`, data),
    apply: (data) => api.post('students/apply/', data),
    admit: (id, data) => api.post(`students/${id}/admit/`, data),
    returningStudent: (id, data) => api.post(`students/${id}/returning-student/`, data),

    // Enrollments
    getEnrollments: (params) => api.get('students/enrollments/', { params }),
    getEnrollment: (id) => api.get(`students/enrollments/${id}/`),
    createEnrollment: (data) => api.post('students/enrollments/', data),
    manualAdd: (data) => api.post('students/manual-add/', data),
    getSchedule: (term_id) => api.get('students/enrollments/schedule/', { params: { term: term_id } }),
    checkEmail: (email) => api.get('students/check-email/', { params: { email } }),
    checkIdn: (idn) => api.get('students/check-idn/', { params: { idn } }),
};

export default studentsApi;
