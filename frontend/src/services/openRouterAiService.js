import api from '../api/axios';

export const generarPaciCompletoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-paci-completo', data);

export const generarOaAdaptadoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-oa-adaptado', data);

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
