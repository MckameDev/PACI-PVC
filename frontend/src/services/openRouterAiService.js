import api from '../api/axios';

export const generarPaciCompletoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-paci-completo', data);

export const generarOaAdaptadoOpenRouter = (data) =>
  api.post('/ai-openrouter/generar-oa-adaptado', data);
