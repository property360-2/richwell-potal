import api from './axios';

export const academicsApi = {
    // Programs
    getPrograms: (params) => api.get('academics/programs/', { params }),
    getProgram: (id) => api.get(`academics/programs/${id}/`),
    createProgram: (data) => api.post('academics/programs/', data),
    updateProgram: (id, data) => api.patch(`academics/programs/${id}/`, data),
    deleteProgram: (id) => api.delete(`academics/programs/${id}/`),

    // Curriculums
    getCurriculums: (params) => api.get('academics/curriculums/', { params }),
    getCurriculum: (id) => api.get(`academics/curriculums/${id}/`),
    createCurriculum: (data) => api.post('academics/curriculums/', data),
    updateCurriculum: (id, data) => api.patch(`academics/curriculums/${id}/`, data),
    setActiveCurriculum: (id) => api.post(`academics/curriculums/${id}/set_active/`),

    // Subjects
    getSubjects: (params) => api.get('academics/subjects/', { params }),
    getSubject: (id) => api.get(`academics/subjects/${id}/`),
    createSubject: (data) => api.post('academics/subjects/', data),
    updateSubject: (id, data) => api.patch(`academics/subjects/${id}/`, data),
    deleteSubject: (id) => api.delete(`academics/subjects/${id}/`),
    bulkUploadSubjects: (formData) => api.post('academics/subjects/bulk_upload/', formData),

    // Prerequisites
    getPrerequisites: (params) => api.get('academics/prerequisites/', { params }),
    createPrerequisite: (data) => api.post('academics/prerequisites/', data),
    deletePrerequisite: (id) => api.delete(`academics/prerequisites/${id}/`),

    // Locations
    getLocations: () => api.get('locations/'),
};

export default academicsApi;
