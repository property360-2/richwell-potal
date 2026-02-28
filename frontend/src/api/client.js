/**
 * API Client — TokenManager, HTTP methods, and download helper.
 * Core infrastructure shared by all API consumers.
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
        let url = `${API_BASE_URL}${endpoint}`;

        // Append query parameters if present
        if (options.params && Object.keys(options.params).length > 0) {
            const queryString = new URLSearchParams(options.params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            // Remove params from options before passing to fetch
            const { params, ...fetchOptions } = options;
            let response = await fetch(url, {
                ...fetchOptions,
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
                    const error = new Error('Session expired');
                    error.status = 401;
                    throw error;
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

    async get(endpoint, params = {}) {
        try {
            const response = await this.request(endpoint, { method: 'GET', params });
            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    },

    async post(endpoint, data) {
        try {
            const response = await this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    },

    async handleResponse(response) {
        if (!response) return null;

        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            let message = `Server error: ${response.status}`;
            if (data) {
                if (typeof data === 'string') message = data;
                else if (data.detail && typeof data.detail === 'string') message = data.detail;
                else if (data.error && typeof data.error === 'string') message = data.error;
                else if (data.message && typeof data.message === 'string') message = data.message;
            }

            const error = new Error(message);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        // Standardize: always return the payload
        if (data && data.success === true && data.data !== undefined) return data.data;
        if (data && data.results !== undefined && data.count === undefined) return data.results;
        return data;
    },

    handleError(error) {
        console.error('Handled API Error:', error);
        throw error;
    },

    async put(endpoint, data) {
        try {
            const response = await this.request(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    },

    async patch(endpoint, data) {
        try {
            const response = await this.request(endpoint, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    },

    async delete(endpoint) {
        try {
            const response = await this.request(endpoint, { method: 'DELETE' });
            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
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
    },

    async putFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {};

        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            method: 'PUT',
            headers,
            body: formData
        });
    }
};

/**
 * Binary file download helper for export endpoints.
 * Handles JWT auth, blob response, and triggers browser download.
 * Usage: await downloadFile(endpoints.exportStudents, { format: 'excel' });
 */
export const downloadFile = async (endpointUrl, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const fullUrl = `${API_BASE_URL}${endpointUrl}${query ? '?' + query : ''}`;

    const token = TokenManager.getAccessToken();
    const res = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
        const errorText = await res.text().catch(() => 'Download failed');
        throw new Error(errorText || `Export failed (${res.status})`);
    }

    // Extract filename from Content-Disposition header
    const disposition = res.headers.get('Content-Disposition');
    const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'export.xlsx';

    // Trigger browser download via temporary anchor
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
};
