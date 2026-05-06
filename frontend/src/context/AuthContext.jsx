import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('quizmaster_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('quizmaster_token');
      const savedUser = localStorage.getItem('quizmaster_user');

      if (!savedToken) {
        setLoading(false);
        return;
      }

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('quizmaster_user');
        }
      }

      try {
        const { data } = await getMe();
        setUser(data.user);
        localStorage.setItem('quizmaster_user', JSON.stringify(data.user));
        setToken(savedToken);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('quizmaster_token');
        localStorage.removeItem('quizmaster_user');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('quizmaster_token', jwtToken);
    localStorage.setItem('quizmaster_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.clear();
    localStorage.removeItem('quizmaster_token');
    localStorage.removeItem('quizmaster_user');
  };

  const value = useMemo(() => ({ user, token, login, logout, loading }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
