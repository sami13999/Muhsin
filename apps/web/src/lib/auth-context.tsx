'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('mushin_token');
    const userData = localStorage.getItem('mushin_user');
    if (token && userData) {
      api.setToken(token);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      const token = result.data.session.access_token;
      const userData = result.data.user;
      api.setToken(token);
      localStorage.setItem('mushin_token', token);
      localStorage.setItem('mushin_user', JSON.stringify(userData));
      setUser(userData);
    } catch (err: any) {
      throw new Error(err.message || 'Check your credentials.');
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const result = await api.signup(email, password, name);
      if (result.data?.session?.access_token) {
        const token = result.data.session.access_token;
        api.setToken(token);
        localStorage.setItem('mushin_token', token);
      }
      if (result.data?.user) {
        localStorage.setItem('mushin_user', JSON.stringify(result.data.user));
        setUser(result.data.user);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Unable to create account.');
    }
  };

  const logout = () => {
    api.setToken('');
    localStorage.removeItem('mushin_token');
    localStorage.removeItem('mushin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
