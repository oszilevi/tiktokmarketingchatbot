import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: async (username: string, password: string) => {
    const response = await api.post('/register', { username, password });
    return response.data;
  },

  login: async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await api.post('/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      Cookies.set('token', response.data.access_token);
    }
    
    return response.data;
  },

  logout: () => {
    Cookies.remove('token');
    // Also remove from all paths to ensure complete logout
    Cookies.remove('token', { path: '/' });
  },

  getMe: async () => {
    const response = await api.get('/me');
    return response.data;
  },
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
    const token = Cookies.get('token');
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