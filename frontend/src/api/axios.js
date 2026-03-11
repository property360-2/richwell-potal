import axios from 'axios';
import NProgress from 'nprogress';

// Configure NProgress (optional, e.g., turn off spinner)
NProgress.configure({ showSpinner: false });

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
    withCredentials: true, // Crucial for sending cookies
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
});

// Request interceptor to start NProgress
api.interceptors.request.use(
    (config) => {
        NProgress.start();
        return config;
    },
    (error) => {
        NProgress.done();
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401s and token refresh
api.interceptors.response.use(
    (response) => {
        NProgress.done();
        return response;
    },
    async (error) => {
        NProgress.done();
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry &&
            !originalRequest.url.includes('accounts/auth/login') &&
            !originalRequest.url.includes('accounts/auth/refresh')) {
            originalRequest._retry = true;

            try {
                // Post to refresh. Since withCredentials is true, the refresh cookie is sent.
                const res = await api.post('accounts/auth/refresh/');

                if (res.status === 200) {
                    // Success! The backend just set a new access cookie. Retry original request.
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Token refresh failed, meaning session is truly expired
                // AuthContext will handle state cleanup on next check
                window.dispatchEvent(new Event('auth-expired'));
            }
        } else if (error.response?.status >= 500) {
            // Global catching for 500 Internal Server Errors
            window.dispatchEvent(new CustomEvent('api-error', {
                detail: { message: `Server error: ${error.response.status}. Please try again later.` }
            }));
        } else if (!error.response) {
            // Network error / CORS / Server down
            window.dispatchEvent(new CustomEvent('api-error', {
                detail: { message: 'Network error. Please check your connection or try again later.' }
            }));
        }

        return Promise.reject(error);
    }
);

export default api;
