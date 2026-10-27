import React, { createContext, useContext, useEffect, useState } from 'react';
import { client } from '../lib/api/client';
import { refreshClient } from '../lib/api/refreshClient';
import { tokenStore } from '../lib/api/tokenStore';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'reviewer' | 'admin';
  team?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role?: 'reviewer' | 'admin', team?: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap session on app load
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const { data: refreshRes } = await refreshClient.post('/auth/refresh');
        if (refreshRes.success && refreshRes.data?.accessToken) {
          tokenStore.set(refreshRes.data.accessToken);
          const { data: meRes } = await client.get('/users/me');
          if (mounted && meRes.success) {
            setUser(meRes.data);
          }
        }
      } catch {
        // No active session — stays unauthenticated
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { data } = await client.post('/auth/login', {
      email,
      password: pass,
    });
    if (data.success && data.data?.accessToken) {
      tokenStore.set(data.data.accessToken);
      setUser(data.data.user);
    }
  };

  const register = async (name: string, email: string, pass: string, role = 'reviewer', team = 'Claims Team') => {
    const { data } = await client.post('/auth/register', {
      name,
      email,
      password: pass,
      role,
      team,
    });
    if (data.success && data.data?.accessToken) {
      tokenStore.set(data.data.accessToken);
      setUser(data.data.user);
    }
  };

  const loginAsDemo = async () => {
    await login('reviewer@caresure.demo', 'CareSureDemo2026!');
  };

  const logout = async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const { data } = await client.get('/users/me');
      if (data.success) {
        setUser(data.data);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginAsDemo, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
