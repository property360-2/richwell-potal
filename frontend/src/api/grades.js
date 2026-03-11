import api from './axios';

export const gradesApi = {
    getHistory: () => api.get('grades/advising/'),
};

export default gradesApi;
