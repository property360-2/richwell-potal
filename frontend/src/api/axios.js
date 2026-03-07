import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401s and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Wait, let's avoid infinite loops. If the refresh endpoint fails, we log out.
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('accounts/auth/refresh')) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    const res = await axios.post(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/'}accounts/auth/refresh/`,
                        { refresh: refreshToken }
                    );

                    if (res.status === 200) {
                        localStorage.setItem('access_token', res.data.access);
                        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    // Token refresh failed, meaning session is truly expired
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login?expired=true';
                }
            } else {
                // No refresh token available
                localStorage.removeItem('access_token');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
