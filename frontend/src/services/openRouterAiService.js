import api from '../api/axios';

export const generarPaciCompletoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-paci-completo', data);

export const generarOaAdaptadoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-oa-adaptado', data);

export const autocompletarPaciDesdeDocumentoOpenRouter = (file, contextoJson = '') => {
  const formData = new FormData();
  formData.append('file', file);

  if (contextoJson) {
    formData.append('contexto_json', contextoJson);
  }

  return api.post('/ai-openrouter/autocompletar-paci-desde-documento', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const consultarPaciChatOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-paci-completo', {
    ...data,
    parametros: {
      ...(data?.parametros || {}),
      modo: 'asesor_paci_chat',
      salida_esperada: 'respuesta_texto',
      idioma: 'es-CL',
    },
  });
