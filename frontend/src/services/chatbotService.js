import api from '../api/axios';

// ── Public endpoints (authenticated users) ──────────────

export const getTemasPublic = () => api.get('/chatbot/temas');

export const getArbol = (temaId) => api.get(`/chatbot/temas/${temaId}/arbol`);

// ── Admin endpoints ─────────────────────────────────────

export const getTemasAdmin = (page = 1, limit = 100) =>
  api.get('/admin/chatbot/temas', { params: { page, limit } });

export const getTema = (id) => api.get(`/admin/chatbot/temas/${id}`);

export const createTema = (data) => api.post('/admin/chatbot/temas', data);

export const updateTema = (id, data) => api.put(`/admin/chatbot/temas/${id}`, data);

export const toggleTema = (id) => api.patch(`/admin/chatbot/temas/${id}`);

export const getOpciones = (temaId) =>
  api.get('/admin/chatbot/opciones', { params: { tema_id: temaId } });

export const getOpcion = (id) => api.get(`/admin/chatbot/opciones/${id}`);

export const createOpcion = (data) => api.post('/admin/chatbot/opciones', data);

export const updateOpcion = (id, data) => api.put(`/admin/chatbot/opciones/${id}`, data);

export const toggleOpcion = (id) => api.patch(`/admin/chatbot/opciones/${id}`);

export const importChatbotExcel = (rows) => api.post('/admin/chatbot/import', { rows });
