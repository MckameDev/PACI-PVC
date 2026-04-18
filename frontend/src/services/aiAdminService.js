import api from '../api/axios';

export const getIaConfigAdmin = () => api.get('/admin/ia/config');

export const saveIaConfigAdmin = (data) => api.put('/admin/ia/config', data);

export const createIaParametroAdmin = (data) => api.post('/admin/ia/parametros', data);

export const updateIaParametroAdmin = (id, data) =>
  api.put(`/admin/ia/parametros/${id}`, data);

export const toggleIaParametroAdmin = (id) =>
  api.patch(`/admin/ia/parametros/${id}`);

export const listIaKnowledgeBooksAdmin = (params = {}) =>
  api.get('/admin/ia/conocimiento/libros', { params });

export const createIaKnowledgeBookFromTextAdmin = (data) =>
  api.post('/admin/ia/conocimiento/libros/texto', data);

export const createIaKnowledgeBookFromFileAdmin = (formData) =>
  api.post('/admin/ia/conocimiento/libros/archivo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const toggleIaKnowledgeBookAdmin = (id) =>
  api.patch(`/admin/ia/conocimiento/libros/${id}`);
