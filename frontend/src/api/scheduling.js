import axios from './axios';

export const schedulingApi = {
    getSchedules: (params) => axios.get(`/api/scheduling/`, { params }),
    assign: (data) => axios.post(`/api/scheduling/assign/`, data),
    pickRegular: (data) => axios.post(`/api/scheduling/pick-regular/`, data),
    pickIrregular: (data) => axios.post(`/api/scheduling/pick-irregular/`, data),
    getStatusMatrix: (params) => axios.get(`/api/scheduling/status_matrix/`, { params }),
};
