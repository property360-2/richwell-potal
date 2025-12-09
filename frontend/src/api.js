/**
 * API Configuration and HTTP Client
 * Handles all API requests to the Django backend
 */

const API_BASE_URL = '/api/v1';

/**
 * Token Manager - Handles JWT token storage and retrieval
 */
export const TokenManager = {
    getAccessToken() {
        return localStorage.getItem('access_token');
    },

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },

    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    }
};

/**
 * API Client - Makes HTTP requests with automatic token handling
 */
export const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 - try to refresh token
            if (response.status === 401 && token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${TokenManager.getAccessToken()}`;
                    response = await fetch(url, { ...options, headers });
                } else {
                    TokenManager.clearTokens();
                    window.location.href = '/login.html';
                    return;
                }
            }

            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async refreshToken() {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                TokenManager.setTokens(data.access, data.refresh || refreshToken);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    async get(endpoint) {
        const response = await this.request(endpoint, { method: 'GET' });
        if (!response) return null;
        return response.json();
    },

    async post(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response;
    },

    async patch(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response;
    },

    async delete(endpoint) {
        const response = await this.request(endpoint, { method: 'DELETE' });
        return response;
    },

    async postFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {};

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });
    }
};

/**
 * API Endpoints for Epic 1
 */
export const endpoints = {
    // Authentication
    login: '/accounts/login/',
    logout: '/accounts/logout/',
    me: '/accounts/me/',
    tokenRefresh: '/accounts/token/refresh/',

    // Admissions
    enrollmentStatus: '/admissions/system/enrollment-status/',
    programs: '/admissions/programs/',
    enroll: '/admissions/enroll/',
    applicants: '/admissions/applicants/',
    uploadDocument: (enrollmentId) => `/admissions/enrollment/${enrollmentId}/documents/`,
    verifyDocument: (documentId) => `/admissions/documents/${documentId}/verify/`
};
