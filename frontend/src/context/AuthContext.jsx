import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('vemu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (role, username, password) => {
    const result = await authAPI.login(role, username, password);
    sessionStorage.setItem('vemu_user', JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('vemu_user');
    setUser(null);
  }, []);

  const refreshSession = useCallback((updatedUser) => {
    sessionStorage.setItem('vemu_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be inside AuthProvider');
  }

  return context;
}