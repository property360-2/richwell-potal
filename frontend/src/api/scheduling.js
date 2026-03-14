import axios from './axios';

export const schedulingApi = {
    getSchedules: (params) => axios.get(`scheduling/`, { params }),
    assign: (data) => axios.post(`scheduling/assign/`, data),
    publish: (data) => axios.post(`scheduling/publish/`, data),
    pickRegular: (data) => axios.post(`scheduling/pick-regular/`, data),
    pickIrregular: (data) => axios.post(`scheduling/pick-irregular/`, data),
    getStatusMatrix: (params) => axios.get(`scheduling/status-matrix/`, { params }),
    getAvailableSlots: (params) => axios.get(`scheduling/available-slots/`, { params }),
    randomize: (data) => axios.post(`scheduling/randomize/`, data),
    getProfessorInsights: (profId, termId) => axios.get(`scheduling/insights/professor/${profId}/?term_id=${termId}`),
    getRoomInsights: (roomId, termId) => axios.get(`scheduling/insights/room/${roomId}/?term_id=${termId}`),
    getSectionInsights: (sectionId) => axios.get(`scheduling/insights/section/${sectionId}/`),

    // Reports
    getPendingSlots: (termId) => axios.get(`scheduling/pending-slots/?term_id=${termId}`),
    getSectionCompletion: (termId) => axios.get(`scheduling/section-completion/?term_id=${termId}`),
    getFacultyLoadReport: (termId) => axios.get(`scheduling/faculty-load-report/?term_id=${termId}`),
    validateSlot: (data) => axios.post(`scheduling/validate-slot/`, data),
    getResourceAvailability: (data) => axios.post(`scheduling/resource-availability/`, data),
};
