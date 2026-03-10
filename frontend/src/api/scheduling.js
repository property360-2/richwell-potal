import axios from './axios';

export const schedulingApi = {
    getSchedules: (params) => axios.get(`scheduling/`, { params }),
    assign: (data) => axios.post(`scheduling/assign/`, data),
    pickRegular: (data) => axios.post(`scheduling/pick-regular/`, data),
    pickIrregular: (data) => axios.post(`scheduling/pick-irregular/`, data),
    getStatusMatrix: (params) => axios.get(`scheduling/status_matrix/`, { params }),
    getAvailableSlots: (params) => axios.get(`scheduling/available_slots/`, { params }),
};
