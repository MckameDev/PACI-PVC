import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,

  get isAuthenticated() {
    return !!get().token;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    set({ token, user });
    return user;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      return user;
    } catch (err) {
      // Solo hacer logout si el servidor responde 401 (token expirado/inválido)
      // El interceptor de axios ya maneja el redirect en ese caso
      // Para cualquier otro error (red, proxy) NO se debe hacer logout
      if (err.response?.status === 401) {
        get().logout();
      }
      return get().user; // Devolver el user del store como fallback
    }
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
      set({ token, user });
      return true;
    }
    return false;
  },
}));

export default useAuthStore;
