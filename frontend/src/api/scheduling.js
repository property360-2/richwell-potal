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
};
