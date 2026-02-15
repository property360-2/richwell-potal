import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, TokenManager, endpoints } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(TokenManager.getUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (TokenManager.isAuthenticated()) {
                try {
                    // Refresh profile to ensure token is still valid and data is fresh
                    const userData = await api.get(endpoints.me);
                    setUser(userData);
                    TokenManager.setUser(userData);
                } catch (error) {
                    console.error('Failed to fetch profile during init:', error);
                    if (error.status === 401) {
                        logout();
                    }
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        const response = await api.post(endpoints.accounts.login, credentials);
        const { access, refresh, user: userData } = response;
        TokenManager.setTokens(access, refresh);
        TokenManager.setUser(userData);
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        try {
            await api.post(endpoints.accounts.logout);
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            TokenManager.clearTokens();
            setUser(null);
            window.location.href = '/'; // Simple redirect for now
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
