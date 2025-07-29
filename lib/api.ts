import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = 'http://localhost:8002';

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
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/token', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.access_token) {
      Cookies.set('token', response.data.access_token);
    }
    
    return response.data;
  },

  logout: () => {
    Cookies.remove('token');
  },

  getMe: async () => {
    const response = await api.get('/me');
    return response.data;
  },
};

export const chatApi = {
  sendMessage: async (message: string) => {
    const response = await api.post('/chat', { message });
    return response.data;
  },
};

export default api;