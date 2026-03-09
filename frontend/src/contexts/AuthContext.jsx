import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // We decode the JWT to get user info without an extra API call
  // This helps prevent UI flicker on refresh
  const parseJwt = (token) => {
    try {
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const loadUserFromToken = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const decoded = parseJwt(token);
    
    if (decoded && decoded.exp * 1000 > Date.now()) {
      setUser({
        id: decoded.user_id,
        username: decoded.username || '',
        email: decoded.email || ''
      });
      setRole(decoded.role || null);
    } else {
      setUser(null);
      setRole(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromToken();

    // Listen to cross-tab logout events
    const handleStorageChange = (e) => {
      if (e.key === 'access_token') {
        loadUserFromToken();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUserFromToken]);

  const login = async (credentials) => {
    try {
      // Clear old tokens first to ensure a clean session
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      const response = await api.post('accounts/auth/login/', credentials);
      const { access, refresh, user: userData } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Update state directly from response for immediate availability
      if (userData) {
        const newUser = {
          id: userData.id,
          username: userData.username,
          email: userData.email
        };
        const newRole = userData.role;
        
        // We set these together. React will batch these updates.
        setUser(newUser);
        setRole(newRole);
        setIsLoading(false);
        
        return { success: true, user: userData };
      } else {
        // Fallback to token parsing if user data isn't in response
        const token = localStorage.getItem('access_token');
        const decoded = parseJwt(token);
        if (decoded) {
          setUser({
            id: decoded.user_id,
            username: decoded.username || '',
            email: decoded.email || ''
          });
          setRole(decoded.role || null);
        }
        setIsLoading(false);
        return { success: true };
      }
    } catch (error) {
      setIsLoading(false);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setRole(null);
  };

  const value = {
    user,
    role,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
