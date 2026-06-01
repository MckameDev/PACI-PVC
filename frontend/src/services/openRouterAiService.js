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

// Human-in-the-Loop: notas breves -> JSON { texto_generado, confianza_datos, sugerencia_mejora }
export const redactarTextoPaciOpenRouter = ({ notas, campo, contexto, applyPAEC, tono, maxPalabras }) =>
  api.post('/ai-openrouter/redactar-texto', {
    notas,
    campo,
    contexto: contexto || {},
    applyPAEC: !!applyPAEC,
    tono: tono || 'técnico-pedagógico',
    max_palabras: maxPalabras || 220,
  });

// Asistente conversacional PACI (consejos + redacción + preguntas)
export const asistentePaciChatOpenRouter = ({ messages, contexto, applyPAEC, campoObjetivo, intencion, useKnowledge, maxPalabras }) =>
  api.post('/ai-openrouter/asistente-paci', {
    messages: Array.isArray(messages) ? messages : [],
    contexto: contexto || {},
    applyPAEC: !!applyPAEC,
    campo_objetivo: campoObjetivo || '',
    intencion: intencion || '',
    use_knowledge: useKnowledge !== false,
    max_palabras: maxPalabras || 240,
  });
