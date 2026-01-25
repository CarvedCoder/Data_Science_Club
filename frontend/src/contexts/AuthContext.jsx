import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authApi.getMe();
        setUser(response.data);
        setApprovalStatus(response.data.approval_status);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    const { access_token, refresh_token, user: userData } = response.data;
    
    // Store both tokens
    localStorage.setItem('token', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    
    setUser(userData);
    return userData;
  };

  const signup = async (data) => {
    const response = await authApi.signup(data);
    // Return the full response so we can show approval info
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setApprovalStatus(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      setApprovalStatus(response.data.approval_status);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      loading, 
      approvalStatus,
      refreshUser,
      isAdmin: user?.role === 'admin' || user?.role === 'ADMIN',
      isStudent: user?.role === 'student' || user?.role === 'STUDENT',
      isApproved: user?.is_active && user?.role
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);