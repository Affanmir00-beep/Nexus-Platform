import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

let API_BASE = import.meta.env.VITE_API_URL || 'https://backend-pi-one-71.vercel.app/api';
API_BASE = API_BASE.replace(/\/$/, '');
if (!API_BASE.endsWith('/api')) {
  API_BASE = `${API_BASE}/api`;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'investor' | 'entrepreneur';
  bio?: string;
  preferences?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Create a shared axios instance with auth header
export const api = axios.create({ baseURL: API_BASE });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexus_token'));
  const [loading, setLoading] = useState(true);

  // Set auth header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('nexus_token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('nexus_token');
    }
  }, [token]);

  // Load user profile on mount if token exists
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.put('/auth/profile', data);
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
