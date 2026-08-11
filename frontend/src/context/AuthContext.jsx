import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token') || localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          setRole(res.data.role);
          localStorage.setItem('user_role', res.data.role);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: userData } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user_role', userData.role);

    setToken(access_token);
    setUser(userData);
    setRole(userData.role);
    return userData;
  };

  const register = async (fullName, email, password, userRole = 'student', companyName = '') => {
    const payload = {
      full_name: fullName,
      email,
      password,
      role: userRole,
      company_name: companyName || undefined,
    };
    const res = await api.post('/auth/register', payload);
    const { access_token, refresh_token, user: userData } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user_role', userData.role);

    setToken(access_token);
    setUser(userData);
    setRole(userData.role);
    return userData;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    setRole('student');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
