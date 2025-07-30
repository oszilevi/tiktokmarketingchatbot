import axios from 'axios';
import Cookies from 'js-cookie';
import { supabase } from './supabase';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('sb-access-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: async (email: string, username: string, password: string) => {
    const response = await api.post('/register', { email, username, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);
    
    const response = await api.post('/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      // Store tokens in cookies
      Cookies.set('sb-access-token', response.data.access_token);
      if (response.data.refresh_token) {
        Cookies.set('sb-refresh-token', response.data.refresh_token);
      }
    }
    
    return response.data;
  },

  logout: async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear cookies
    Cookies.remove('sb-access-token');
    Cookies.remove('sb-refresh-token');
    Cookies.remove('token'); // Remove old token format if exists
    
    // Also remove from all paths to ensure complete logout
    Cookies.remove('sb-access-token', { path: '/' });
    Cookies.remove('sb-refresh-token', { path: '/' });
    Cookies.remove('token', { path: '/' });
  },

  getMe: async () => {
    const response = await api.get('/me');
    return response.data;
  },

  // Helper to get current session from Supabase
  getCurrentSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Helper to refresh session
  refreshSession: async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (session?.access_token) {
      Cookies.set('sb-access-token', session.access_token);
      if (session.refresh_token) {
        Cookies.set('sb-refresh-token', session.refresh_token);
      }
    }
    return { session, error };
  }
};

export const chatApi = {
  getMessages: async () => {
    const response = await api.get('/messages');
    return response.data;
  },
  
  getNotes: async () => {
    const response = await api.get('/notes');
    return response.data;
  },
  
  getMessageNotes: async (messageId: number) => {
    const response = await api.get(`/notes/${messageId}`);
    return response.data;
  },
  
  sendMessage: async (message: string) => {
    const response = await api.post('/chat', { message });
    return response.data;
  },
  
  sendMessageStream: async (message: string, onChunk: (chunk: string) => void) => {
    const token = Cookies.get('sb-access-token');
    const response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data.trim()) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    }
  },
};

export default api;