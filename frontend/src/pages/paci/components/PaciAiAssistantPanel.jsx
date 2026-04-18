import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, FileUp, RotateCcw, Search, Send, Sparkles } from 'lucide-react';
import Button from '../../../components/ui/Button';
import api from '../../../api/axios';
import { autocompletarPaciDesdeDocumentoOpenRouter, consultarPaciChatOpenRouter, generarPaciCompletoOpenRouter } from '../../../services/openRouterAiService';

const INITIAL_CONTEXT = {
  clave_busqueda: '',
  establecimiento: '',
  curso_estudiante: '',
  tipo_nee: '',
  estudiante_id: '',
  estudiante_iniciales: '',
  apoderado: '',
  diagnostico_nee: '',
  asignatura: '',
  asignatura_id: '',
  profesor_jefe: '',
  profesor_asignatura: '',
  educador_diferencial: '',
  eje: '',
  nivel_trabajo_id: '',
  oa_id: '',
  unidad: '',
  meta_especifica: '',
  meta_integradora: '',
  estrategias_oa: '',
  habilidades_oa: '',
  seguimiento_oa: '',
};

const QUESTIONS = [
  { key: 'clave_busqueda', label: 'Clave inicial (RUT del estudiante)', required: false },
  { key: 'asignatura', label: 'Asignatura (nombre o código)', required: true },
  { key: 'profesor_jefe', label: 'Docente profesor/a jefe (correo o nombre)', required: false },
  { key: 'profesor_asignatura', label: 'Docente de la asignatura (correo o nombre)', required: false },
  { key: 'educador_diferencial', label: 'Educador diferencial (opcional)', required: false },
  { key: 'eje', label: 'Eje del OA (desde catálogo)', required: true },
  { key: 'nivel_trabajo_id', label: 'Nivel de trabajo (desde catálogo)', required: true },
  { key: 'oa_id', label: 'Objetivo de aprendizaje (desde listado)', required: true },
  { key: 'unidad', label: 'Unidad (sugerida desde OA)', required: false },
  { key: 'meta_especifica', label: 'Meta específica (opcional)', required: false },
  { key: 'meta_integradora', label: 'Meta integradora (opcional)', required: false },
  { key: 'estrategias_oa', label: 'Estrategias OA (opcional)', required: false },
  { key: 'habilidades_oa', label: 'Habilidades (opcional)', required: false },
  { key: 'seguimiento_oa', label: 'Seguimiento (opcional)', required: false },
  { key: 'agregar_otro_oa', label: '¿Desea agregar otro OA? (si/no)', required: true },
  { key: 'apoderado', label: 'Nombre de apoderado (se usa al cierre del documento)', required: false },
];

const OA_BLOCK_START_KEY = 'eje';
const ASSISTANT_FLOW_VERSION = 3;
const OA_CHAT_PAGE_SIZE = 10;

const getQuestionPrompt = (question, context = {}, formSnapshot = {}) => {
  const isFilled = isFieldFilled(question.key, context, formSnapshot);
  const filledNote = isFilled ? ' (ya tengo datos, confirma o cambia)' : '';
  
  if (question.key === 'meta_especifica') {
    return `Meta específica (opcional): responde en un solo mensaje${filledNote}. Puedes escribir /omitir.`;
  }
  if (question.key === 'meta_integradora') {
    return `Meta integradora (opcional): responde en un solo mensaje${filledNote}. Si quieres, te puedo sugerir una según Eje + Nivel + Unidad. Puedes escribir /omitir.`;
  }
  return `${question.label}${question.required ? ' *' : ''}${filledNote}: responde en un solo mensaje.${question.required ? '' : ' Puedes escribir /omitir.'}`;
};

const buildEmptyOaDraft = () => ({
  eje: '',
  nivel_trabajo_id: '',
  oa_id: '',
  unidad: '',
  meta_especifica: '',
  meta_integradora: '',
  estrategias_oa: '',
  habilidades_oa: '',
  seguimiento_oa: '',
});

const hasOaDraftData = (draft) => {
  if (!draft || typeof draft !== 'object') return false;
  return !!String(draft.eje || draft.nivel_trabajo_id || draft.oa_id || draft.unidad || draft.meta_especifica || draft.meta_integradora || draft.estrategias_oa || draft.habilidades_oa || draft.seguimiento_oa || '').trim();
};

const normalizeUnidadValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = normalizeText(raw);
  const matchNum = normalized.match(/(?:unidad\s*)?(\d+)/);
  if (matchNum?.[1]) {
    return `Unidad ${matchNum[1]}`;
  }
  if (normalized === 'u1') return 'Unidad 1';
  if (normalized === 'u2') return 'Unidad 2';
  if (normalized === 'u3') return 'Unidad 3';
  if (normalized === 'u4') return 'Unidad 4';
  if (normalized === 'u5') return 'Unidad 5';
  if (normalized === 'u6') return 'Unidad 6';
  if (normalized === 'u7') return 'Unidad 7';
  if (normalized === 'u8') return 'Unidad 8';
  return raw;
};

const toYesNo = (value) => {
  const text = normalizeText(value);
  if (!text) return null;
  if (['si', 'sí', 's', 'yes', 'y', 'ok', 'dale'].includes(text)) return true;
  if (['no', 'n', 'nop'].includes(text)) return false;
  return null;
};

const INITIAL_CHAT = [
  {
    role: 'assistant',
    text: 'Asistente PACI listo. Te ayudaré por chat y rellenaré el formulario en paralelo con claves como RUT o correo.',
  },
  { role: 'assistant', text: getQuestionPrompt(QUESTIONS[0], INITIAL_CONTEXT, {}) },
];

const clampQuestionIndex = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), QUESTIONS.length);
};

const normalizeAssistantState = (state) => {
  if (state?.flowVersion !== ASSISTANT_FLOW_VERSION) {
    return {
      chat: INITIAL_CHAT,
      context: INITIAL_CONTEXT,
      notes: '',
      ultimoResultado: null,
      questionIndex: 0,
      oaDraft: buildEmptyOaDraft(),
      oaDrafts: [],
    };
  }

  if (!state || typeof state !== 'object') {
    return {
      chat: INITIAL_CHAT,
      context: INITIAL_CONTEXT,
      notes: '',
      ultimoResultado: null,
      questionIndex: 0,
      oaDraft: buildEmptyOaDraft(),
      oaDrafts: [],
    };
  }

  const normalizedChat = Array.isArray(state.chat) && state.chat.length > 0
    ? state.chat.filter((m) => m && typeof m.text === 'string' && (m.role === 'assistant' || m.role === 'user'))
    : INITIAL_CHAT;

  return {
    chat: normalizedChat,
    context: {
      ...INITIAL_CONTEXT,
      ...(state.context && typeof state.context === 'object' ? state.context : {}),
    },
    notes: typeof state.notes === 'string' ? state.notes : '',
    ultimoResultado: state.ultimoResultado && typeof state.ultimoResultado === 'object' ? state.ultimoResultado : null,
    questionIndex: clampQuestionIndex(state.questionIndex),
    oaDraft: {
      ...buildEmptyOaDraft(),
      ...(state.oaDraft && typeof state.oaDraft === 'object' ? state.oaDraft : {}),
    },
    oaDrafts: Array.isArray(state.oaDrafts) ? state.oaDrafts.filter((d) => d && typeof d === 'object') : [],
  };
};

const currentDate = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear().toString();

const toInitials = (fullName) => {
  if (!fullName) return '';
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
};

const normalizeRut = (value) => String(value || '').toLowerCase().replace(/[^0-9k]/g, '');

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const findBestMatch = (items, value, fields = ['nombre']) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;

  const normalizedItems = (items || []).map((item) => ({
    item,
    text: fields.map((field) => normalizeText(item?.[field])).filter(Boolean).join(' '),
  }));

  return normalizedItems.find(({ text }) => text === normalizedValue)?.item
    || normalizedItems.find(({ text }) => text.includes(normalizedValue))?.item
    || normalizedItems.find(({ text }) => normalizedValue.includes(text))?.item
    || null;
};

const looksLikeRut = (value) => {
  const normalized = normalizeRut(value);
  return normalized.length >= 8 && /\d/.test(normalized);
};

const looksLikeEmail = (value) => String(value || '').includes('@');

function isFieldFilled(fieldKey, context = {}, formSnapshot = {}) {
  if (fieldKey in context) {
    const contextVal = String(context[fieldKey] || '').trim();
    if (contextVal) return true;
  }
  
  if (fieldKey in formSnapshot) {
    const formVal = formSnapshot[fieldKey];
    if (fieldKey === 'estudiante_id' || fieldKey === 'asignatura_id') {
      return !!formVal;
    }
    if (Array.isArray(formVal)) {
      return formVal.length > 0;
    }
    return !!String(formVal || '').trim();
  }
  
  return false;
}

const extractFormSuggestion = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.validation_error || payload.validation_errors) {
    return null;
  }

  if (payload.form_data_sugerida && typeof payload.form_data_sugerida === 'object') {
    return payload.form_data_sugerida;
  }

  if (payload.paci && typeof payload.paci === 'object') {
    if (payload.paci.form_data_sugerida && typeof payload.paci.form_data_sugerida === 'object') {
      return payload.paci.form_data_sugerida;
    }
    return payload.paci;
  }

  if (payload.data && typeof payload.data === 'object') {
    return extractFormSuggestion(payload.data);
  }

  return payload;
};

const extractStructuredAutocompleteSuggestion = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.resultado_ia && typeof payload.resultado_ia === 'object') {
    return extractFormSuggestion(payload.resultado_ia);
  }

  if (payload.data && typeof payload.data === 'object' && payload.data.resultado_ia) {
    return extractStructuredAutocompleteSuggestion(payload.data);
  }

  return extractFormSuggestion(payload);
};

const buildFieldHelpMessage = (helpRequest) => {
  if (!helpRequest) return '';

  return [
    `Campo: ${helpRequest.title}`,
    helpRequest.description,
    helpRequest.meaning ? `En simple: ${helpRequest.meaning}` : '',
  ].filter(Boolean).join('\n\n');
};

const isProgressQuestion = (value) => {
  const text = normalizeText(value);
  if (!text) return false;

  const hints = [
    'recuerdas el paso',
    'recuerdas hasta donde llegamos',
    'recuerdas donde vamos',
    'en que paso',
    'en que vamos',
    'hasta donde vamos',
    'hasta donde llegamos',
    'que llevamos',
    'estado del paci',
    'estado del borrador',
    'borrador',
    'casillas',
    'resumen',
  ];

  if (hints.some((hint) => text.includes(hint))) return true;

  const hasProgressVerb = /(recuerd|avance|progreso|estado|retom|continu)/.test(text);
  const hasProgressObject = /(paso|flujo|borrador|casilla|donde|llegamos|vamos)/.test(text);
  return hasProgressVerb && hasProgressObject;
};

const buildProgressResponse = ({ activeStepMeta, context, formSnapshot, questionIndex }) => {
  const total = Number(activeStepMeta?.totalSteps || 0);
  const current = Number(activeStepMeta?.currentStep || 0);
  const stepLabel = activeStepMeta?.currentStepLabel ? String(activeStepMeta.currentStepLabel) : `Paso ${current || '-'}`;

  // Check all fields for filled data using isFieldFilled
  const fields = {
    estudiante: isFieldFilled('estudiante_id', context, formSnapshot),
    asignatura: isFieldFilled('asignatura_id', context, formSnapshot),
    profesor_jefe: isFieldFilled('profesor_jefe', context, formSnapshot),
    profesor_asignatura: isFieldFilled('profesor_asignatura', context, formSnapshot),
    educador_diferencial: isFieldFilled('educador_diferencial', context, formSnapshot),
    eje: isFieldFilled('eje', context, formSnapshot),
    nivel: isFieldFilled('nivel_trabajo_id', context, formSnapshot),
    oa_id: isFieldFilled('oa_id', context, formSnapshot),
    unidad: isFieldFilled('unidad', context, formSnapshot),
  };

  const fortalezas = Array.isArray(formSnapshot?.fortaleza_ids) ? formSnapshot.fortaleza_ids.length : 0;
  const barreras = Array.isArray(formSnapshot?.barrera_ids) ? formSnapshot.barrera_ids.length : 0;
  const estrategiasDua = Array.isArray(formSnapshot?.estrategia_dua_ids) ? formSnapshot.estrategia_dua_ids.length : 0;
  const accesos = Array.isArray(formSnapshot?.acceso_curricular_ids) ? formSnapshot.acceso_curricular_ids.length : 0;
  const habilidades = Array.isArray(formSnapshot?.habilidad_base_ids) ? formSnapshot.habilidad_base_ids.length : 0;
  const trayectorias = Array.isArray(formSnapshot?.trayectoria) ? formSnapshot.trayectoria.length : 0;

  const filledCount = Object.values(fields).filter(Boolean).length;
  const filledList = Object.entries(fields).filter(([, v]) => v).map(([k]) => k).join(', ');

  const preguntasPendientes = Math.max(QUESTIONS.length - clampQuestionIndex(questionIndex), 0);

  return [
    `Sí, recuerdo todo. Vamos en ${stepLabel} (${current || '-'} de ${total || '-'}).`,
    `✅ Campos rellenados: ${filledCount}/9 (${filledList || 'ninguno aún'}).`,
    `📊 Matrices: fortalezas ${fortalezas}, barreras ${barreras}, estrategias DUA ${estrategiasDua}, acceso curricular ${accesos}, habilidades base ${habilidades}.`,
    `📚 Trayectorias: ${trayectorias}. Preguntas pendientes en chat: ${preguntasPendientes}.`,
  ].join(' ');
};

const PACI_QA_KEYWORDS = [
  'paci',
  'dua',
  'pie',
  'meta integradora',
  'meta especifica',
  'barreras',
  'fortalezas',
  'adecuacion',
  'adaptacion',
  'trayectoria',
  'oa',
  'objetivo de aprendizaje',
  'evaluacion diferenciada',
  'paec',
  'seguimiento',
];

const isPaciKnowledgeQuestion = (value) => {
  const raw = String(value || '').trim();
  const text = normalizeText(raw);
  if (!text) return false;

  if (text.startsWith('/pregunta') || text.startsWith('/paci')) return true;

  const hasQuestionShape = raw.includes('?') || /^(como|que|cual|cuando|donde|por que|porque|ayuda|explic|diferencia|ejemplo|suger)/.test(text);
  const hasPaciScope = PACI_QA_KEYWORDS.some((keyword) => text.includes(keyword));

  return hasQuestionShape && hasPaciScope;
};

const isQuestionLikeMessage = (value) => {
  const raw = String(value || '').trim();
  const text = normalizeText(raw);
  if (!text) return false;

  if (raw.includes('?')) return true;
  if (/^(como|que|cual|cuando|donde|por que|porque|ayuda|explic|puedes|podrias|podr[ií]as|me puedes|me ayudas)/.test(text)) return true;
  return false;
};

const isLikelyCurrentStepAnswer = (value, currentQuestion) => {
  if (!currentQuestion) return false;
  const raw = String(value || '').trim();
  const text = normalizeText(raw);
  if (!text) return false;

  if (text === '/omitir') return true;

  switch (currentQuestion.key) {
    case 'clave_busqueda':
      return looksLikeRut(raw);
    case 'agregar_otro_oa':
      return toYesNo(raw) !== null;
    case 'profesor_jefe':
    case 'profesor_asignatura':
      return looksLikeEmail(raw) || raw.length >= 3;
    case 'oa_id':
      return isShowMoreCommand(raw)
        || isShowPreviousCommand(raw)
        || parseOaPageCommand(raw) !== null
        || /^\d+$/.test(raw)
        || raw.length >= 2;
    default:
      return raw.length >= 2;
  }
};

const isConversationalInterruption = (value, currentQuestion) => {
  if (!currentQuestion) return false;
  if (!isQuestionLikeMessage(value)) return false;
  if (isLikelyCurrentStepAnswer(value, currentQuestion)) return false;
  return true;
};

const isShowMoreCommand = (value) => {
  const text = normalizeText(value);
  if (!text) return false;
  return text === 'ver mas'
    || text === 'ver más'
    || text === 'mas'
    || text === 'mas oa'
    || text === 'siguiente'
    || text === 'siguiente pagina'
    || text === 'siguiente página';
};

const isShowPreviousCommand = (value) => {
  const text = normalizeText(value);
  if (!text) return false;
  return text === 'anterior'
    || text === 'pagina anterior'
    || text === 'página anterior'
    || text === 'atras'
    || text === 'atrás'
    || text === 'retroceder';
};

const parseOaPageCommand = (value) => {
  const text = normalizeText(value);
  if (!text) return null;
  const match = text.match(/^(?:pagina|página)\s*(\d{1,3})$/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
};

const extractReasoningAnswerText = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    return payload.map(extractReasoningAnswerText).find((t) => String(t || '').trim()) || '';
  }
  if (typeof payload !== 'object') return '';

  const directKeys = ['respuesta', 'answer', 'mensaje', 'text', 'contenido', 'output_text'];
  for (const key of directKeys) {
    const candidate = extractReasoningAnswerText(payload[key]);
    if (String(candidate || '').trim()) return candidate;
  }

  if (payload.data) {
    const nested = extractReasoningAnswerText(payload.data);
    if (String(nested || '').trim()) return nested;
  }

  if (payload.paci) {
    const nested = extractReasoningAnswerText(payload.paci);
    if (String(nested || '').trim()) return nested;
  }

  return '';
};

const buildLocalPaciReasoningResponse = (question, { context, formSnapshot, activeStepMeta }) => {
  const q = normalizeText(question);
  const stepLabel = activeStepMeta?.currentStepLabel || 'el flujo guiado';
  const hasOa = isFieldFilled('oa_id', context, formSnapshot);
  const hasEje = isFieldFilled('eje', context, formSnapshot);
  const hasNivel = isFieldFilled('nivel_trabajo_id', context, formSnapshot);

  if (q.includes('meta integradora') || q.includes('meta especifica')) {
    return [
      'Buena pregunta. En PACI, la meta especifica y la meta integradora cumplen funciones distintas:',
      '1) Meta especifica: logro acotado al OA priorizado (observable y evaluable en corto plazo).',
      '2) Meta integradora: articulacion de aprendizajes entre OA/areas para el periodo completo.',
      'Sugerencia practica: redacta la meta especifica con verbo + contenido + criterio de logro, y luego formula la integradora conectando continuidad y transferencia.',
    ].join('\n');
  }

  if (q.includes('perfil dua') || q.includes('fortalezas') || q.includes('barreras')) {
    return [
      'Para Perfil DUA, usa primero las matrices/checklists y despues ajusta texto breve de respaldo.',
      'Prioriza: 1) barreras de acceso, 2) fortalezas funcionales, 3) estrategias DUA aplicables en clase.',
      'Regla util: cada barrera relevante deberia quedar cubierta por al menos una estrategia concreta y medible.',
    ].join('\n');
  }

  if (q.includes('oa') || q.includes('objetivo de aprendizaje')) {
    return [
      'Para trabajar OA en este PACI, manten el orden pedagogico: Eje -> Nivel -> OA -> Unidad -> Metas.',
      `Estado actual: Eje ${hasEje ? 'completo' : 'pendiente'}, Nivel ${hasNivel ? 'completo' : 'pendiente'}, OA ${hasOa ? 'completo' : 'pendiente'}.`,
      'Recomendacion: evita definir Meta Integradora antes de seleccionar OA desde catalogo BD.',
    ].join('\n');
  }

  return [
    'Puedo ayudarte a razonar preguntas PACI en formato practico.',
    `Estamos en ${stepLabel}. Si quieres, te respondo con: contexto, criterio tecnico, ejemplo aplicado y siguiente accion.`,
    'Hazme la pregunta directa (por ejemplo: "como redacto una meta integradora para este OA?").',
  ].join('\n');
};

const summarizeSuggestionCompleteness = (suggestion, currentForm = {}) => {
  const merged = {
    ...(currentForm && typeof currentForm === 'object' ? currentForm : {}),
    ...(suggestion && typeof suggestion === 'object' ? suggestion : {}),
  };

  const requiredTop = [
    { key: 'estudiante_id', label: 'Estudiante' },
    { key: 'asignatura_id', label: 'Asignatura' },
    { key: 'fecha_emision', label: 'Fecha emisión' },
    { key: 'formato_generado', label: 'Formato generado' },
  ];

  const missingTop = requiredTop
    .filter((field) => !String(merged?.[field.key] || '').trim())
    .map((field) => field.label);

  const trayectoria = Array.isArray(merged?.trayectoria) ? merged.trayectoria : [];
  const invalidRows = trayectoria
    .map((row, idx) => {
      const missing = [];
      if (!String(row?.oa_id || '').trim()) missing.push('oa_id');
      if (!String(row?.nivel_trabajo_id || '').trim()) missing.push('nivel_trabajo_id');
      const hasMeta = String(row?.adecuacion_oa?.meta_integradora || row?.meta_especifica || '').trim();
      if (!hasMeta) missing.push('meta (integradora o específica)');
      return { idx: idx + 1, missing };
    })
    .filter((row) => row.missing.length > 0);

  const hasPerfilDuaText = !!String(
    merged?.perfil_dua?.fortalezas
    || merged?.perfil_dua?.barreras
    || merged?.perfil_dua?.habilidades_base
    || ''
  ).trim();

  const lines = [];
  lines.push(`Chequeo rápido del formulario sugerido: identificación ${missingTop.length === 0 ? 'ok' : 'incompleta'}, trayectoria ${trayectoria.length > 0 ? `${trayectoria.length} fila(s)` : 'vacía'}.`);

  if (missingTop.length > 0) {
    lines.push(`Faltan campos clave: ${missingTop.join(', ')}.`);
  }

  if (trayectoria.length === 0) {
    lines.push('Falta agregar al menos una fila en Trayectoria OA.');
  } else if (invalidRows.length > 0) {
    const detail = invalidRows
      .slice(0, 3)
      .map((row) => `OA #${row.idx}: ${row.missing.join(', ')}`)
      .join(' | ');
    lines.push(`Hay filas de trayectoria incompletas: ${detail}.`);
  }

  if (!hasPerfilDuaText) {
    lines.push('Sugerencia: reforzar Perfil DUA (fortalezas/barreras/habilidades base) para personalizar mejor las estrategias.');
  }

  return {
    ok: missingTop.length === 0 && trayectoria.length > 0 && invalidRows.length === 0,
    message: lines.join(' '),
  };
};

const buildCurrentStudentSignals = (context, formSnapshot) => {
  const perfil = formSnapshot?.perfil_dua || {};
  return {
    diagnostico: formSnapshot?.paec_activadores || context?.diagnostico_nee || '',
    fortalezas: perfil?.fortalezas || '',
    barreras: perfil?.barreras || perfil?.barreras_personalizadas || '',
    habilidades_base: perfil?.habilidades_base || '',
    preferencias_representacion: perfil?.preferencias_representacion || '',
    preferencias_expresion: perfil?.preferencias_expresion || '',
    preferencias_motivacion: perfil?.preferencias_motivacion || '',
    estrategias_dua_actuales: formSnapshot?.trayectoria?.[0]?.estrategias_dua || context?.estrategias_oa || '',
  };
};

const buildLocalSuggestion = (context, notes, oaEntries = []) => {
  const barreras = '';
  const fortalezas = '';
  const diagnostico = (context.diagnostico_nee || '').trim();
  const eje = (context.eje || '').trim();
  const unidad = (context.unidad || '').trim();

  const normalizedOaEntries = (Array.isArray(oaEntries) && oaEntries.length > 0 ? oaEntries : [{
    eje,
    nivel_trabajo_id: context.nivel_trabajo_id || '',
    oa_id: context.oa_id || '',
    unidad: normalizeUnidadValue(unidad),
    meta_especifica: context.meta_especifica || '',
    meta_integradora: context.meta_integradora || '',
    estrategias_oa: context.estrategias_oa || '',
    habilidades_oa: context.habilidades_oa || '',
    seguimiento_oa: context.seguimiento_oa || '',
  }]).filter(hasOaDraftData);

  return {
    estudiante_id: context.estudiante_id || '',
    formato_generado: 'Completo',
    fecha_emision: currentDate(),
    anio_escolar: currentYear(),
    profesor_jefe: context.profesor_jefe || '',
    profesor_asignatura: context.profesor_asignatura || context.asignatura || '',
    educador_diferencial: context.educador_diferencial || '',
    asignatura_id: context.asignatura_id || '',
    nivel_trabajo_id: context.nivel_trabajo_id || '',
    perfil_dua: {
      fortalezas,
      barreras,
      barreras_personalizadas: barreras,
      acceso_curricular: eje ? `Eje priorizado: ${eje}` : '',
      preferencias_representacion: '',
      preferencias_expresion: '',
      preferencias_motivacion: fortalezas,
      habilidades_base: diagnostico,
    },
    aplica_paec: diagnostico ? 1 : 0,
    paec_activadores: diagnostico,
    paec_estrategias: notes || '',
    paec_desregulacion: 'Definir protocolo de contención y seguimiento en coordinación con equipo PIE.',
    paec_variables: diagnostico ? [
      {
        tipo: 'Activador',
        descripcion: diagnostico,
        estrategia: 'Anticipación de rutina y apoyos visuales antes de actividad exigente.',
        orden: 1,
      },
      {
        tipo: 'Estrategia',
        descripcion: fortalezas || 'Fortalecer autorregulación en contexto de aula.',
        estrategia: 'Pausas activas breves, instrucciones segmentadas y refuerzo positivo.',
        orden: 1,
      },
    ] : [],
    horario_apoyo: {
      columnas: [
        { key: 'hora', titulo: 'Hora', orden: 1, es_fija: 1 },
        { key: 'lunes', titulo: 'Lunes', orden: 2, es_fija: 1 },
        { key: 'martes', titulo: 'Martes', orden: 3, es_fija: 1 },
        { key: 'miercoles', titulo: 'Miercoles', orden: 4, es_fija: 1 },
        { key: 'jueves', titulo: 'Jueves', orden: 5, es_fija: 1 },
        { key: 'viernes', titulo: 'Viernes', orden: 6, es_fija: 1 },
      ],
      filas: [
        {
          id: 'ai_row_1',
          orden: 1,
          hora: '08:00 - 08:45',
          celdas: {
            lunes: eje ? `Trabajo de ${eje} (${unidad || 'Unidad en curso'})` : 'Apoyo focalizado en habilidades base',
            martes: 'Refuerzo guiado con apoyos visuales',
            miercoles: 'Actividad progresiva con mediación docente',
            jueves: 'Evaluación formativa adaptada',
            viernes: 'Retroalimentación y ajuste de estrategias',
          },
        },
      ],
    },
    trayectoria: normalizedOaEntries.map((oaItem) => ({
        _asignatura_id: context.asignatura_id || '',
        _eje: oaItem.eje || '',
        _unidad: normalizeUnidadValue(oaItem.unidad || ''),
        oa_id: oaItem.oa_id || '',
        nivel_trabajo_id: oaItem.nivel_trabajo_id || context.nivel_trabajo_id || '',
        diferencia_calculada: 0,
        tipo_adecuacion: 'Acceso',
        justificacion_tecnica: '',
        meta_especifica: oaItem.meta_especifica || '',
        estrategias_dua: oaItem.estrategias_oa || '',
        habilidades: oaItem.habilidades_oa || '',
        seguimiento_registro: oaItem.seguimiento_oa || notes || 'Registrar avances semanales y ajustar apoyos según evidencia.',
        adecuacion_oa: {
          meta_integradora: oaItem.meta_integradora || '',
          estrategias: oaItem.estrategias_oa || '',
          indicadores_nivelados: '',
          adecuaciones: '',
          actividades_graduales: '',
          lectura_complementaria: '',
          instrumento_evaluacion: '',
          justificacion: '',
          criterios_evaluacion: '',
          observaciones: '',
        },
      })),
  };
};

export default function PaciAiAssistantPanel({
  onApplySuggestion,
  onToggle,
  isOpen,
  helpRequest,
  onHelpRequestHandled,
  assistantState,
  onAssistantStateChange,
  activeStepMeta,
  formSnapshot,
}) {
  const hydratedState = normalizeAssistantState(assistantState);
  const [catalogos, setCatalogos] = useState({ asignaturas: [], cursosNiveles: [] });
  const [ejesPorAsignatura, setEjesPorAsignatura] = useState({});
  const [oaByContext, setOaByContext] = useState({});
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [chat, setChat] = useState(hydratedState.chat);
  const [context, setContext] = useState(hydratedState.context);
  const [composer, setComposer] = useState('');
  const [notes, setNotes] = useState(hydratedState.notes);
  const [ultimoResultado, setUltimoResultado] = useState(hydratedState.ultimoResultado);
  const [questionIndex, setQuestionIndex] = useState(hydratedState.questionIndex);
  const [oaDraft, setOaDraft] = useState(hydratedState.oaDraft || buildEmptyOaDraft());
  const [oaDrafts, setOaDrafts] = useState(hydratedState.oaDrafts || []);
  const [oaChatPageByContext, setOaChatPageByContext] = useState({});
  const [structuredFile, setStructuredFile] = useState(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredResult, setStructuredResult] = useState(null);
  const [oaDetailsById, setOaDetailsById] = useState({});
  const lastHelpRequestId = useRef(null);
  const chatViewportRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalogos = async () => {
      try {
        const [asigRes, nivelRes] = await Promise.all([
          api.get('/asignaturas', { params: { limit: 200 } }),
          api.get('/cursos-niveles', { params: { limit: 100 } }),
        ]);

        if (!cancelled) {
          const asignaturas = asigRes.data?.data?.items || [];
          setCatalogos({
            asignaturas,
            cursosNiveles: nivelRes.data?.data?.items || [],
          });

          // Preload ejes for all asignaturas improves lookup for guided OA flow.
          const ejeResponses = await Promise.all(
            asignaturas.map((a) => api.get('/oa/ejes', { params: { asignatura_id: a.id } }).catch(() => null))
          );
          if (!cancelled) {
            const nextEjes = {};
            asignaturas.forEach((a, idx) => {
              nextEjes[a.id] = ejeResponses[idx]?.data?.data || [];
            });
            setEjesPorAsignatura(nextEjes);
          }
        }
      } catch {
        if (!cancelled) {
          setCatalogos({ asignaturas: [], cursosNiveles: [] });
          setEjesPorAsignatura({});
        }
      }
    };

    loadCatalogos();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!helpRequest?.id || helpRequest.id === lastHelpRequestId.current) return;
    lastHelpRequestId.current = helpRequest.id;

    const helpText = buildFieldHelpMessage(helpRequest);
    if (helpText) {
      setChat((prev) => [...prev, { role: 'assistant', text: helpText }]);
    }

    if (onHelpRequestHandled) {
      onHelpRequestHandled(helpRequest.id);
    }
  }, [helpRequest, onHelpRequestHandled]);

  useEffect(() => {
    if (!onAssistantStateChange) return;
    onAssistantStateChange({
      flowVersion: ASSISTANT_FLOW_VERSION,
      chat,
      context,
      notes,
      ultimoResultado,
      questionIndex,
      oaDraft,
      oaDrafts,
    });
  }, [chat, context, notes, ultimoResultado, questionIndex, oaDraft, oaDrafts, onAssistantStateChange]);

  useEffect(() => {
    const node = chatViewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [chat, lookingUp]);

  const canGenerate = useMemo(() => {
    return !!(
      context.estudiante_id.trim() &&
      context.asignatura_id.trim()
    );
  }, [context]);

  const clearChatKeepingProgress = () => {
    const currentQuestion = QUESTIONS[getNextQuestionIndex(questionIndex, context, formSnapshot)] || null;
    setComposer('');
    setChat([
      { role: 'assistant', text: 'Limpié el historial visible, mantuve el contexto capturado para seguir donde quedamos.' },
      currentQuestion
        ? { role: 'assistant', text: getQuestionPrompt(currentQuestion, context, formSnapshot) }
        : { role: 'assistant', text: 'Seguimos en modo notas libres. Puedes pedirme generar propuesta cuando quieras.' },
    ]);
  };

  const resetConversation = () => {
    setContext(INITIAL_CONTEXT);
    setNotes('');
    setComposer('');
    setQuestionIndex(0);
    setOaDraft(buildEmptyOaDraft());
    setOaDrafts([]);
    setOaChatPageByContext({});
    setUltimoResultado(null);
    setChat([
      { role: 'assistant', text: 'Reinicié la conversación. Vamos de nuevo en modo guiado.' },
      ...INITIAL_CHAT.slice(1),
    ]);
  };

  const buildOaContextKey = (ctx) => [
    ctx?.asignatura_id || '-',
    ctx?.nivel_trabajo_id || '-',
    ctx?.eje || '-',
  ].join('|');

  const getOaChatPage = (ctx) => {
    const key = buildOaContextKey(ctx);
    return Number(oaChatPageByContext[key] || 1);
  };

  const setOaChatPage = (ctx, page) => {
    const key = buildOaContextKey(ctx);
    const safePage = Math.max(1, Number(page || 1));
    setOaChatPageByContext((prev) => ({
      ...prev,
      [key]: safePage,
    }));
  };

  const applySilent = (nextContext, nextNotes = notes) => {
    const effectiveOaEntries = [
      ...oaDrafts,
      ...(hasOaDraftData(oaDraft) ? [oaDraft] : []),
    ];
    onApplySuggestion(buildLocalSuggestion(nextContext, nextNotes, effectiveOaEntries), { silent: true });
  };

  const resolveAsignaturaByText = (value) => {
    if (String(value || '').trim().length < 3) return null;
    const match = findBestMatch(catalogos.asignaturas, value, ['nombre', 'codigo']);
    if (!match) return null;

    return {
      type: 'subject',
      patch: {
        asignatura: match.nombre || value,
        asignatura_id: match.id || '',
      },
      message: `Encontré la asignatura ${match.nombre}. La dejé vinculada al catálogo para que el select quede consistente.`,
    };
  };

  const resolveCursoNivelByText = (value) => {
    if (String(value || '').trim().length < 2) return null;
    const match = findBestMatch(catalogos.cursosNiveles, value, ['nombre', 'valor_numerico']);
    if (!match) return null;

    return {
      type: 'level',
      patch: {
        nivel_trabajo_id: match.id || '',
      },
      message: `Encontré el curso/nivel ${match.nombre}. Quedó disponible como valor de catálogo para los pasos de trayectoria.`,
    };
  };

  const ensureOaDataset = async (asignaturaId, nivelId = '', eje = '') => {
    if (!asignaturaId) return [];

    const key = [asignaturaId, nivelId || '-', eje || '-'].join('|');
    if (oaByContext[key]) return oaByContext[key];

    const res = await api.get('/oa', {
      params: {
        asignatura_id: asignaturaId,
        ...(nivelId ? { nivel_trabajo_id: nivelId } : {}),
        ...(eje ? { eje } : {}),
        limit: 500,
      },
    });

    const items = res.data?.data?.items || [];
    setOaByContext((prev) => ({ ...prev, [key]: items }));
    return items;
  };

  const buildOaListMessage = (items = [], page = 1) => {
    if (!items.length) {
      return 'No encontré OA para ese eje/nivel. Revisa el eje o el nivel y probamos de nuevo.';
    }

    const totalPages = Math.max(1, Math.ceil(items.length / OA_CHAT_PAGE_SIZE));
    const safePage = Math.min(Math.max(Number(page || 1), 1), totalPages);
    const startIndex = (safePage - 1) * OA_CHAT_PAGE_SIZE;
    const visibleItems = items.slice(startIndex, startIndex + OA_CHAT_PAGE_SIZE);

    const lines = visibleItems.map((o, idx) => {
      const codigo = o.codigo_oa || o.id_oa || o.id;
      const texto = String(o.texto_oa || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      return `${idx + 1}) ${codigo} - ${texto}`;
    });

    return [
      `OA cargados para el eje y nivel seleccionados (página ${safePage}/${totalPages}):`,
      ...lines,
      'Responde con número de lista, código OA o texto aproximado para seleccionarlo.',
      ...(safePage < totalPages ? ['Escribe "ver más" para mostrar la siguiente página.'] : []),
      ...(safePage > 1 ? ['Escribe "anterior" para volver a la página previa.'] : []),
      'También puedes escribir "página N" para ir directo (por ejemplo: "página 2").',
    ].join('\n');
  };

  const resolveOaByText = async (value, ctx, page = 1) => {
    if (!ctx?.asignatura_id || !ctx?.eje || !ctx?.nivel_trabajo_id) return null;

    const dataset = await ensureOaDataset(ctx.asignatura_id, ctx.nivel_trabajo_id, ctx.eje);
    if (!dataset.length) {
      return {
        type: 'oa_empty',
        patch: {},
        message: 'No hay OA disponibles para ese Eje/Nivel en la base de datos.',
      };
    }

    const trimmed = String(value || '').trim();
    const listIndex = Number(trimmed);
    const totalPages = Math.max(1, Math.ceil(dataset.length / OA_CHAT_PAGE_SIZE));
    const safePage = Math.min(Math.max(Number(page || 1), 1), totalPages);
    const startIndex = (safePage - 1) * OA_CHAT_PAGE_SIZE;
    const visibleItems = dataset.slice(startIndex, startIndex + OA_CHAT_PAGE_SIZE);

    if (Number.isInteger(listIndex) && listIndex > 0) {
      const byVisibleIndex = listIndex <= visibleItems.length ? visibleItems[listIndex - 1] : null;
      const byGlobalIndex = listIndex <= dataset.length ? dataset[listIndex - 1] : null;
      const byIndex = byVisibleIndex || byGlobalIndex;
      if (!byIndex) {
        return {
          type: 'oa_not_found',
          patch: {},
          message: buildOaListMessage(dataset, safePage),
        };
      }
      return {
        type: 'oa',
        patch: {
          oa_id: byIndex.id,
          unidad: normalizeUnidadValue(byIndex.unidad || byIndex.unidad_nombre || byIndex.ambito || byIndex.nucleo || ctx.unidad || ''),
        },
        oaData: byIndex,
        message: `OA seleccionado: ${byIndex.codigo_oa || byIndex.id_oa || byIndex.id}.`,
      };
    }

    const codeMatch = dataset.find((o) => {
      const codigo = normalizeText(o.codigo_oa || o.id_oa || '');
      return codigo && (codigo === normalizeText(trimmed) || codigo.includes(normalizeText(trimmed)));
    });
    if (codeMatch) {
      return {
        type: 'oa',
        patch: {
          oa_id: codeMatch.id,
          unidad: normalizeUnidadValue(codeMatch.unidad || codeMatch.unidad_nombre || codeMatch.ambito || codeMatch.nucleo || ctx.unidad || ''),
        },
        oaData: codeMatch,
        message: `OA seleccionado: ${codeMatch.codigo_oa || codeMatch.id_oa || codeMatch.id}.`,
      };
    }

    const textMatch = findBestMatch(dataset, trimmed, ['texto_oa', 'codigo_oa', 'id_oa']);
    if (!textMatch) {
      return {
        type: 'oa_not_found',
        patch: {},
        message: buildOaListMessage(dataset, safePage),
      };
    }

    return {
      type: 'oa',
      patch: {
        oa_id: textMatch.id,
        unidad: normalizeUnidadValue(textMatch.unidad || textMatch.unidad_nombre || textMatch.ambito || textMatch.nucleo || ctx.unidad || ''),
      },
      oaData: textMatch,
      message: `OA seleccionado: ${textMatch.codigo_oa || textMatch.id_oa || textMatch.id}.`,
    };
  };

  const fetchOaDetail = async (oaId) => {
    if (!oaId) return null;
    if (oaDetailsById[oaId]) return oaDetailsById[oaId];
    try {
      const res = await api.get(`/oa/${oaId}`);
      const item = res?.data?.data || null;
      if (item) {
        setOaDetailsById((prev) => ({ ...prev, [oaId]: item }));
      }
      return item;
    } catch {
      return null;
    }
  };

  const resolveActiveOaContext = async (preferredOaData = null, preferredPatch = null) => {
    const patch = preferredPatch && typeof preferredPatch === 'object' ? preferredPatch : {};
    const trayectoria = Array.isArray(formSnapshot?.trayectoria) ? formSnapshot.trayectoria : [];

    const fromForm = [...trayectoria]
      .reverse()
      .find((item) => String(item?.oa_id || '').trim());

    const active = {
      oa_id: patch.oa_id || context.oa_id || fromForm?.oa_id || '',
      asignatura_id: context.asignatura_id || fromForm?._asignatura_id || formSnapshot?.asignatura_id || '',
      nivel_trabajo_id: patch.nivel_trabajo_id || context.nivel_trabajo_id || fromForm?.nivel_trabajo_id || '',
      eje: patch.eje || context.eje || fromForm?._eje || '',
      unidad: patch.unidad || context.unidad || fromForm?._unidad || '',
      trayectoria_row: fromForm || null,
    };

    let oaDetail = preferredOaData;
    if (!oaDetail && active.oa_id) {
      oaDetail = await fetchOaDetail(active.oa_id);
    }

    return {
      ...active,
      oa_detail: oaDetail,
    };
  };

  const buildOaCoachingPrompt = (oaContext) => {
    const oa = oaContext?.oa_detail || {};
    const student = buildCurrentStudentSignals(context, formSnapshot);
    const oaLabel = oa?.codigo_oa || oa?.id_oa || oaContext?.oa_id || 'OA seleccionado';

    return [
      `Necesito apoyo pedagógico automatizado para ${oaLabel}.`,
      'Devuélveme respuesta breve y accionable con este orden:',
      '1) Meta integradora sugerida (1 párrafo corto).',
      '2) 3 estrategias DUA concretas en aula (representación, acción/expresión, implicación).',
      '3) 2 actividades graduales alineadas al OA y nivel.',
      '4) 3 criterios de evaluación observables.',
      '5) 1 sugerencia de seguimiento semanal.',
      '',
      'Contexto OA:',
      `- oa_id: ${oaContext?.oa_id || ''}`,
      `- código OA: ${oa?.codigo_oa || oa?.id_oa || ''}`,
      `- texto OA: ${oa?.texto_oa || ''}`,
      `- eje: ${oaContext?.eje || oa?.eje || ''}`,
      `- nivel_trabajo_id: ${oaContext?.nivel_trabajo_id || oa?.nivel_trabajo_id || ''}`,
      `- unidad: ${oaContext?.unidad || oa?.unidad || oa?.unidad_nombre || ''}`,
      `- habilidad_core: ${oa?.habilidad_core || ''}`,
      '',
      'Contexto estudiante preliminar:',
      `- diagnostico: ${student.diagnostico}`,
      `- fortalezas: ${student.fortalezas}`,
      `- barreras: ${student.barreras}`,
      `- habilidades_base: ${student.habilidades_base}`,
      `- preferencias_representacion: ${student.preferencias_representacion}`,
      `- preferencias_expresion: ${student.preferencias_expresion}`,
      `- preferencias_motivacion: ${student.preferencias_motivacion}`,
      '',
      'No inventes IDs ni datos clínicos. Si faltan antecedentes, indícalo en una línea final de “datos que conviene completar”.',
    ].join('\n');
  };

  const requestOaCoachingSuggestion = async (preferredOaData = null, preferredPatch = null) => {
    const oaContext = await resolveActiveOaContext(preferredOaData, preferredPatch);
    if (!oaContext?.oa_id) return '';

    const prompt = buildOaCoachingPrompt(oaContext);

    try {
      const res = await consultarPaciChatOpenRouter({
        pregunta_docente: prompt,
        contexto_actual: {
          oa_id: oaContext.oa_id,
          asignatura_id: oaContext.asignatura_id,
          nivel_trabajo_id: oaContext.nivel_trabajo_id,
          eje: oaContext.eje,
          unidad: oaContext.unidad,
        },
      });
      const aiText = extractReasoningAnswerText(res?.data);
      return String(aiText || '').trim();
    } catch {
      return '';
    }
  };

  const resolveEjeByText = (value, asignaturaId) => {
    if (!asignaturaId) return null;
    const ejes = ejesPorAsignatura[asignaturaId] || [];
    const match = findBestMatch(ejes, value, ['eje', 'nombre']);
    if (!match) return null;
    return {
      type: 'eje',
      patch: { eje: match.eje || match.nombre || value },
      message: `Perfecto. Eje seleccionado desde base de datos: ${match.eje || match.nombre}.`,
    };
  };

  const resolveUnidadByText = async (value, ctx) => {
    if (!ctx?.asignatura_id || !ctx?.eje) return null;
    const dataset = await ensureOaDataset(ctx.asignatura_id, ctx.nivel_trabajo_id, ctx.eje);

    const unidadCandidates = Array.from(new Set(dataset
      .map((o) => o?.unidad || o?.unidad_nombre || o?.ambito || o?.nucleo || '')
      .filter(Boolean)));

    const match = findBestMatch(unidadCandidates.map((u) => ({ nombre: normalizeUnidadValue(u) })), value, ['nombre']);
    if (!match) return null;

    return {
      type: 'unidad',
      patch: { unidad: normalizeUnidadValue(match.nombre) },
      message: `Unidad encontrada desde datos OA: ${normalizeUnidadValue(match.nombre)}.`,
    };
  };

  const getNextQuestionIndex = (startIndex, ctx, snapshot = {}) => {
    let idx = startIndex;
    while (idx < QUESTIONS.length) {
      const q = QUESTIONS[idx];
      
      // Skip students_iniciales if student_id already filled
      if (q?.key === 'estudiante_iniciales' && ctx.estudiante_id) {
        idx += 1;
        continue;
      }
      
      // Skip required fields if already filled in form or context
      if (q?.required && isFieldFilled(q.key, ctx, snapshot)) {
        idx += 1;
        continue;
      }
      
      return idx;
    }
    return idx;
  };

  const tryResolveByKey = async (rawValue, currentQuestionKey = '', currentOaPage = 1) => {
    const value = String(rawValue || '').trim();
    if (!value || value.toLowerCase() === '/omitir') return null;

    // 1) RUT de estudiante
    if (looksLikeRut(value)) {
      const rut = normalizeRut(value);
      const res = await api.get('/estudiantes', { params: { rut, limit: 1 } });
      const items = res.data?.data?.items || [];
      if (items.length > 0) {
        const est = items[0];
        return {
          type: 'student',
          patch: {
            clave_busqueda: value,
            establecimiento: est.establecimiento_nombre || context.establecimiento,
            curso_estudiante: est.curso_nivel_nombre || context.curso_estudiante,
            tipo_nee: est.tipo_nee || context.tipo_nee,
            estudiante_id: est.id || '',
            estudiante_iniciales: toInitials(est.nombre_completo),
            diagnostico_nee: est.diagnostico || context.diagnostico_nee,
          },
          message: `Encontré estudiante por RUT: ${est.nombre_completo} (${est.rut}). Ya cargué diagnóstico, curso, establecimiento y tipo NEE sin volver a preguntarlos.`,
        };
      }
    }

    // 2) Asignatura por catálogo local
    const subjectMatch = resolveAsignaturaByText(value);
    if (subjectMatch) {
      return subjectMatch;
    }

    // 3) Profesor: requiere asignatura ya definida
    const isTeacherLookupQuestion = currentQuestionKey === 'profesor_asignatura' || currentQuestionKey === 'profesor_jefe';
    const teacherPatchKey = currentQuestionKey === 'profesor_jefe' ? 'profesor_jefe' : 'profesor_asignatura';
    if (currentQuestionKey === 'profesor_asignatura' && !context.asignatura_id) {
      return {
        type: 'teacher_prereq',
        patch: {},
        message: 'Antes de buscar docente, necesito primero la asignatura (nombre o código).',
      };
    }

    if (isTeacherLookupQuestion && looksLikeEmail(value)) {
      const res = await api.get('/profesores', { params: { email: value, limit: 1 } });
      const items = res.data?.data?.items || [];
      if (items.length > 0) {
        const prof = items[0];
        return {
          type: 'teacher',
          patch: {
            clave_busqueda: value,
            establecimiento: prof.establecimiento_nombre || context.establecimiento,
            [teacherPatchKey]: prof.usuario_nombre || '',
          },
          message: `Encontré docente por correo: ${prof.usuario_nombre} (${prof.usuario_email}).`,
        };
      }
    }

    // 4) Nombre de profesor aproximado
    if (isTeacherLookupQuestion && value.length >= 4) {
      const res = await api.get('/profesores', { params: { q: value, limit: 1 } });
      const items = res.data?.data?.items || [];
      if (items.length > 0) {
        const prof = items[0];
        return {
          type: 'teacher',
          patch: {
            clave_busqueda: value,
            establecimiento: prof.establecimiento_nombre || context.establecimiento,
            [teacherPatchKey]: prof.usuario_nombre || '',
          },
          message: `Encontré docente por nombre: ${prof.usuario_nombre}.`,
        };
      }
    }

    if (currentQuestionKey === 'eje') {
      if (!context.asignatura_id) {
        return {
          type: 'eje_prereq',
          patch: {},
          message: 'Primero necesito asignatura para buscar ejes desde la base de datos.',
        };
      }
      const ejeMatch = resolveEjeByText(value, context.asignatura_id);
      if (ejeMatch) return ejeMatch;
    }

    if (currentQuestionKey === 'nivel_trabajo_id') {
      const levelMatchForQuestion = resolveCursoNivelByText(value);
      if (levelMatchForQuestion) return levelMatchForQuestion;
    }

    if (currentQuestionKey === 'oa_id') {
      if (!context.asignatura_id || !context.eje || !context.nivel_trabajo_id) {
        return {
          type: 'oa_prereq',
          patch: {},
          message: 'Para seleccionar OA desde base de datos primero necesito Asignatura + Eje + Nivel.',
        };
      }
      const oaMatch = await resolveOaByText(value, context, currentOaPage);
      if (oaMatch) return oaMatch;
    }

    if (currentQuestionKey === 'unidad') {
      if (!context.asignatura_id || !context.eje) {
        return {
          type: 'unidad_prereq',
          patch: {},
          message: 'Para resolver unidad desde base de datos primero necesito Asignatura + Eje.',
        };
      }
      const unidadMatch = await resolveUnidadByText(value, context);
      if (unidadMatch) return unidadMatch;
    }

    return null;
  };

  const askPaciReasoningQuestion = async (questionText) => {
    const payload = {
      pregunta_docente: questionText,
      contexto_actual: {
        estudiante_id: formSnapshot?.estudiante_id || context.estudiante_id || '',
        asignatura_id: formSnapshot?.asignatura_id || context.asignatura_id || '',
        asignatura: context.asignatura || '',
        curso_estudiante: formSnapshot?.curso_estudiante || context.curso_estudiante || '',
        diagnostico_nee: formSnapshot?.diagnostico_nee || context.diagnostico_nee || '',
        profesor_jefe: formSnapshot?.profesor_jefe || context.profesor_jefe || '',
        profesor_asignatura: formSnapshot?.profesor_asignatura || context.profesor_asignatura || '',
        eje: formSnapshot?.eje || context.eje || '',
        nivel_trabajo_id: formSnapshot?.nivel_trabajo_id || context.nivel_trabajo_id || '',
        oa_id: formSnapshot?.oa_id || context.oa_id || '',
        unidad: formSnapshot?.unidad || context.unidad || '',
      },
      notas_docente: notes || '',
      estado_chat: {
        paso_actual: activeStepMeta?.currentStepLabel || '',
        total_preguntas: QUESTIONS.length,
        pregunta_actual_index: questionIndex,
      },
    };

    try {
      const res = await consultarPaciChatOpenRouter(payload);
      const aiText = extractReasoningAnswerText(res?.data);
      if (String(aiText || '').trim()) {
        return String(aiText).trim();
      }
    } catch {
      // If remote reasoning fails, return deterministic local guidance.
    }

    return buildLocalPaciReasoningResponse(questionText, {
      context,
      formSnapshot,
      activeStepMeta,
    });
  };

  const handleConversationalQuestion = async (questionText, currentQuestion) => {
    setComposer('');
    setLookingUp(true);
    try {
      const answer = await askPaciReasoningQuestion(questionText);
      setChat((prev) => [
        ...prev,
        { role: 'user', text: questionText },
        { role: 'assistant', text: answer },
        ...(currentQuestion
          ? [{ role: 'assistant', text: `Retomemos donde íbamos: ${getQuestionPrompt(currentQuestion, context, formSnapshot)}` }]
          : []),
      ]);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSend = async () => {
    const text = composer.trim();
    if (!text || loading || lookingUp) return;

    const currentQuestion = QUESTIONS[getNextQuestionIndex(questionIndex, context, formSnapshot)] || null;

    if (isProgressQuestion(text)) {
      const progressText = buildProgressResponse({
        activeStepMeta,
        context,
        formSnapshot,
        questionIndex,
      });

      setChat((prev) => {
        const nextMessages = [
          ...prev,
          { role: 'user', text },
          { role: 'assistant', text: progressText },
        ];

        if (currentQuestion) {
          nextMessages.push({
            role: 'assistant',
            text: `Para seguir con el flujo, retomemos aquí: ${getQuestionPrompt(currentQuestion, context, formSnapshot)}`,
          });
        }

        return nextMessages;
      });
      setComposer('');
      return;
    }

    if (isPaciKnowledgeQuestion(text)) {
      await handleConversationalQuestion(text, currentQuestion);
      return;
    }

    if (isConversationalInterruption(text, currentQuestion)) {
      await handleConversationalQuestion(text, currentQuestion);
      return;
    }

    if (currentQuestion?.key === 'oa_id' && (isShowMoreCommand(text) || isShowPreviousCommand(text) || parseOaPageCommand(text) !== null)) {
      setComposer('');
      setLookingUp(true);
      try {
        const dataset = (context.asignatura_id && context.eje && context.nivel_trabajo_id)
          ? await ensureOaDataset(context.asignatura_id, context.nivel_trabajo_id, context.eje)
          : [];

        if (!dataset.length) {
          setChat((prev) => [
            ...prev,
            { role: 'user', text },
            { role: 'assistant', text: 'No hay OA cargados para avanzar de página. Primero valida Asignatura + Eje + Nivel.' },
            { role: 'assistant', text: getQuestionPrompt(currentQuestion, context, formSnapshot) },
          ]);
          return;
        }

        const currentPage = getOaChatPage(context);
        const totalPages = Math.max(1, Math.ceil(dataset.length / OA_CHAT_PAGE_SIZE));
        const requestedPage = parseOaPageCommand(text);

        let nextPage = currentPage;
        let footerMessage = 'Te muestro el listado de OA actualizado.';

        if (requestedPage !== null) {
          nextPage = Math.min(Math.max(requestedPage, 1), totalPages);
          footerMessage = requestedPage === nextPage
            ? `Te llevé a la página ${nextPage}.`
            : `La página solicitada no existe; te mostré la página ${nextPage}/${totalPages}.`;
        } else if (isShowPreviousCommand(text)) {
          nextPage = Math.max(currentPage - 1, 1);
          footerMessage = nextPage === currentPage
            ? 'Ya estás en la primera página de OA para este eje/nivel.'
            : 'Volví a la página anterior de OA.';
        } else {
          nextPage = Math.min(currentPage + 1, totalPages);
          footerMessage = nextPage === currentPage
            ? 'Ya estás en la última página de OA para este eje/nivel.'
            : 'Te muestro más OA de la base de datos.';
        }

        setOaChatPage(context, nextPage);

        setChat((prev) => [
          ...prev,
          { role: 'user', text },
          { role: 'assistant', text: footerMessage },
          { role: 'assistant', text: buildOaListMessage(dataset, nextPage) },
          { role: 'assistant', text: getQuestionPrompt(currentQuestion, context, formSnapshot) },
        ]);
      } finally {
        setLookingUp(false);
      }
      return;
    }

    setChat((prev) => [...prev, { role: 'user', text }]);
    setComposer('');

    if (/\b(perfil|barreras?|fortalezas?)\b/i.test(text)) {
      setChat((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Perfil, Barreras y Fortalezas conviene responderlas directamente en el Paso Perfil DUA usando los checkboxes/matrices. Esos datos son más precisos desde el formulario que por chat.',
        },
        ...(currentQuestion ? [{ role: 'assistant', text: `Retomamos: ${getQuestionPrompt(currentQuestion, context, formSnapshot)}` }] : []),
      ]);
      return;
    }

    // Siempre intentamos resolver por clave semántica
    let resolvedMatch = null;
    setLookingUp(true);
    try {
      const currentOaPage = currentQuestion?.key === 'oa_id' ? getOaChatPage(context) : 1;
      resolvedMatch = await tryResolveByKey(text, currentQuestion?.key || '', currentOaPage);
    } catch {
      setChat((prev) => [...prev, { role: 'assistant', text: 'No pude resolver la clave en este momento. Seguimos con la captura manual.' }]);
    } finally {
      setLookingUp(false);
    }

    const mergedContext = resolvedMatch ? { ...context, ...resolvedMatch.patch } : context;
    if (resolvedMatch) {
      setContext(mergedContext);
      applySilent(mergedContext);
      setChat((prev) => [...prev, { role: 'assistant', text: resolvedMatch.message }]);
    }

    if (currentQuestion) {
      const isOmit = text.toLowerCase() === '/omitir';
      const valueForField = (
        resolvedMatch?.patch && Object.prototype.hasOwnProperty.call(resolvedMatch.patch, currentQuestion.key)
          ? resolvedMatch.patch[currentQuestion.key]
          : text
      );

      const normalizedValueForField = currentQuestion.key === 'unidad'
        ? normalizeUnidadValue(valueForField)
        : valueForField;

      const partialContext = isOmit ? { ...mergedContext } : { ...mergedContext, [currentQuestion.key]: normalizedValueForField };

      const oaFieldKeys = ['eje', 'nivel_trabajo_id', 'oa_id', 'unidad', 'meta_especifica', 'meta_integradora', 'estrategias_oa', 'habilidades_oa', 'seguimiento_oa'];
      if (!isOmit && oaFieldKeys.includes(currentQuestion.key)) {
        const patchForDraft = resolvedMatch?.patch && typeof resolvedMatch.patch === 'object'
          ? Object.fromEntries(Object.entries(resolvedMatch.patch).filter(([k]) => oaFieldKeys.includes(k)))
          : {};
        const nextOaDraft = {
          ...oaDraft,
          ...patchForDraft,
          [currentQuestion.key]: normalizedValueForField,
        };
        setOaDraft(nextOaDraft);
      }

      if (currentQuestion.key === 'oa_id' && !isOmit) {
        const validOaSelection = resolvedMatch?.type === 'oa';
        if (!validOaSelection) {
          const dataset = (partialContext.asignatura_id && partialContext.eje && partialContext.nivel_trabajo_id)
            ? await ensureOaDataset(partialContext.asignatura_id, partialContext.nivel_trabajo_id, partialContext.eje)
            : [];
          const page = getOaChatPage(partialContext);
          setChat((prev) => [...prev,
            { role: 'assistant', text: 'Para continuar debo vincular un OA real de la base de datos. Elige uno del listado.' },
            { role: 'assistant', text: buildOaListMessage(dataset, page) },
            { role: 'assistant', text: getQuestionPrompt(currentQuestion, partialContext, formSnapshot) },
          ]);
          return;
        }
      }

      if (currentQuestion.key === 'meta_integradora' && !isOmit && String(normalizedValueForField || '').trim()) {
        const candidateOa = (oaFieldKeys.includes('oa_id') ? (oaDraft.oa_id || partialContext.oa_id || '') : '');
        if (!candidateOa) {
          setChat((prev) => [...prev, {
            role: 'assistant',
            text: 'Antes de usar Meta Integradora debes seleccionar el Objetivo de Aprendizaje desde el listado BD para mantener coherencia pedagógica.',
          }]);
          return;
        }
      }

      if (currentQuestion.key === 'agregar_otro_oa') {
        const decision = toYesNo(text);
        if (decision === null) {
          setChat((prev) => [...prev, { role: 'assistant', text: 'Responde solo "si" o "no" para continuar con los OA.' }]);
          return;
        }

        const updatedOaDrafts = hasOaDraftData(oaDraft) ? [...oaDrafts, oaDraft] : [...oaDrafts];
        setOaDrafts(updatedOaDrafts);

        if (decision) {
          const oaStartIndex = QUESTIONS.findIndex((q) => q.key === OA_BLOCK_START_KEY);
          setOaDraft(buildEmptyOaDraft());
          setQuestionIndex(oaStartIndex);
          setChat((prev) => [...prev, { role: 'assistant', text: 'Perfecto, agreguemos otro OA. Empezamos por Eje (desde base de datos).' }, { role: 'assistant', text: getQuestionPrompt(QUESTIONS[oaStartIndex], partialContext, formSnapshot) }]);
          applySilent(partialContext);
          return;
        }

        const nextIndexAfterOa = getNextQuestionIndex(questionIndex + 1, partialContext, formSnapshot);
        setQuestionIndex(nextIndexAfterOa);
        if (nextIndexAfterOa < QUESTIONS.length) {
          setChat((prev) => [...prev, { role: 'assistant', text: getQuestionPrompt(QUESTIONS[nextIndexAfterOa], partialContext, formSnapshot) }]);
        } else {
          setChat((prev) => [...prev, { role: 'assistant', text: 'Captura base completa. Puedes agregar notas libres y luego generar propuesta.' }]);
        }
        applySilent(partialContext);
        return;
      }

      if (!isOmit) {
        setContext(partialContext);
        applySilent(partialContext);
      }

      const nextIndex = getNextQuestionIndex(questionIndex + 1, partialContext, formSnapshot);
      setQuestionIndex(nextIndex);

      if (nextIndex < QUESTIONS.length) {
        const nextQuestion = QUESTIONS[nextIndex];
        const messages = [];
        if (nextQuestion?.key === OA_BLOCK_START_KEY) {
          messages.push({
            role: 'assistant',
            text: 'Antes de seguir: Perfil, Barreras y Fortalezas complétalas directamente en Paso Perfil DUA usando checkboxes. Ahora comenzamos bloque OA en orden: Eje -> Nivel -> Unidad.',
          });
        }
        if (nextQuestion?.key === 'oa_id' && partialContext.asignatura_id && partialContext.eje && partialContext.nivel_trabajo_id) {
          const dataset = await ensureOaDataset(partialContext.asignatura_id, partialContext.nivel_trabajo_id, partialContext.eje);
          setOaChatPage(partialContext, 1);
          messages.push({ role: 'assistant', text: buildOaListMessage(dataset, 1) });
        }
        if (nextQuestion?.key === 'meta_integradora') {
          messages.push({
            role: 'assistant',
            text: 'Recuerda: Meta específica y Meta integradora son campos distintos. La meta integradora debe estar alineada al OA seleccionado.',
          });

          if (currentQuestion.key === 'oa_id' && resolvedMatch?.type === 'oa') {
            const coaching = await requestOaCoachingSuggestion(resolvedMatch.oaData, {
              ...partialContext,
              ...resolvedMatch.patch,
            });
            if (coaching) {
              messages.push({
                role: 'assistant',
                text: `Sugerencia automatizada según OA + contexto preliminar del estudiante:\n${coaching}`,
              });
            }
          }
        }
        messages.push({ role: 'assistant', text: getQuestionPrompt(nextQuestion, partialContext, formSnapshot) });
        setChat((prev) => [...prev, ...messages]);
      } else {
        setChat((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Captura base completa. Puedes seguir agregando notas y luego presionar Generar PACI.',
          },
        ]);
      }
      return;
    }

    const nextNotes = notes ? `${notes}\n${text}` : text;
    setNotes(nextNotes);
    applySilent(mergedContext, nextNotes);
    setChat((prev) => [...prev, { role: 'assistant', text: 'Anotado. El formulario ya se va actualizando con la información capturada.' }]);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setLoading(true);
    try {
      const effectiveOaEntries = [
        ...oaDrafts,
        ...(hasOaDraftData(oaDraft) ? [oaDraft] : []),
      ];

      const payload = {
        ...context,
        mensaje_docente: notes,
        oa_borrador: effectiveOaEntries,
        parametros: {
          modo: 'autocompletar_formulario_paci',
          salida_esperada: 'form_data_sugerida',
          idioma: 'es-CL',
        },
      };

      const res = await generarPaciCompletoOpenRouter(payload);
      const data = res.data?.data || null;

      const suggestion = extractFormSuggestion(data);
      if (suggestion && typeof suggestion === 'object') {
        setUltimoResultado(suggestion);
        onApplySuggestion(suggestion);
        setChat((prev) => [...prev, {
          role: 'assistant',
          text: 'Generé y apliqué una propuesta de PACI completo sobre el formulario. Las matrices con checkboxes (fortalezas, barreras y relacionadas) conviene completarlas manualmente en Perfil DUA.'
        }]);
      } else {
        const fallback = buildLocalSuggestion(context, notes, effectiveOaEntries);
        setUltimoResultado(fallback);
        onApplySuggestion(fallback);
        setChat((prev) => [...prev, { role: 'assistant', text: 'La IA respondió sin estructura útil. Apliqué un borrador completo local para continuar.' }]);
      }
    } catch {
      const effectiveOaEntries = [
        ...oaDrafts,
        ...(hasOaDraftData(oaDraft) ? [oaDraft] : []),
      ];
      const fallback = buildLocalSuggestion(context, notes, effectiveOaEntries);
      setUltimoResultado(fallback);
      onApplySuggestion(fallback);
      setChat((prev) => [...prev, { role: 'assistant', text: 'Falló la IA remota. Apliqué un borrador local completo con los datos capturados.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStructuredFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setStructuredFile(file);
    setStructuredResult(null);
  };

  const handleStructuredAutocomplete = async () => {
    if (!structuredFile || structuredLoading) return;

    setStructuredLoading(true);
    try {
      const contextoJson = JSON.stringify({
        estudiante_id: context.estudiante_id || formSnapshot?.estudiante_id || '',
        asignatura_id: context.asignatura_id || formSnapshot?.asignatura_id || '',
        estudiante_iniciales: context.estudiante_iniciales || formSnapshot?.estudiante_iniciales || '',
        apoderado: context.apoderado || formSnapshot?.apoderado || '',
        diagnostico_nee: context.diagnostico_nee || formSnapshot?.diagnostico_nee || '',
        profesor_jefe: context.profesor_jefe || formSnapshot?.profesor_jefe || '',
        profesor_asignatura: context.profesor_asignatura || formSnapshot?.profesor_asignatura || '',
        educador_diferencial: context.educador_diferencial || formSnapshot?.educador_diferencial || '',
        eje: context.eje || formSnapshot?.eje || '',
        nivel_trabajo_id: context.nivel_trabajo_id || formSnapshot?.nivel_trabajo_id || '',
        oa_id: context.oa_id || formSnapshot?.oa_id || '',
        unidad: context.unidad || formSnapshot?.unidad || '',
      });

      const res = await autocompletarPaciDesdeDocumentoOpenRouter(structuredFile, contextoJson);
      const data = res.data?.data || null;
      const suggestion = extractStructuredAutocompleteSuggestion(data);

      setStructuredResult(data);

      if (suggestion && typeof suggestion === 'object') {
        const qualityCheck = summarizeSuggestionCompleteness(suggestion, formSnapshot);
        onApplySuggestion(suggestion);
        setChat((prev) => [...prev, {
          role: 'assistant',
          text: `Ya procesé el documento estructurado y apliqué la sugerencia al formulario. ${qualityCheck.message}`,
        }]);
      } else {
        setChat((prev) => [...prev, {
          role: 'assistant',
          text: 'Procesé el documento estructurado, pero no vino un form_data_sugerida utilizable.',
        }]);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'No se pudo procesar el documento estructurado.';
      setStructuredResult({ error: message });
      setChat((prev) => [...prev, { role: 'assistant', text: message }]);
    } finally {
      setStructuredLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Asistente PACI oculto.</p>
        <Button className="mt-3" onClick={onToggle}>
          <Sparkles className="h-4 w-4" /> Abrir chat IA
        </Button>
      </div>
    );
  }

  return (
    <aside className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Chat IA PACI</h3>
            <p className="text-xs text-slate-500">Panel acoplado al formulario</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onToggle}>
          Ocultar
        </Button>
      </div>

      <div className="space-y-3">

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversación</p>
          <div ref={chatViewportRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {chat.map((msg, idx) => (
              <div
                key={`${msg.role}_${idx}`}
                className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'assistant' ? 'bg-slate-100 text-slate-700' : 'bg-primary/10 text-primary'}`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-3 space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Autocompletar desde documento</p>
            <p className="text-xs text-slate-500">
              Sube un DOCX, PDF o TXT estructurado para probar el llenado automático del PACI.
            </p>
            <input
              type="file"
              accept=".docx,.pdf,.txt,.md,.csv"
              onChange={handleStructuredFileChange}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-95"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleStructuredAutocomplete}
                disabled={!structuredFile || structuredLoading || lookingUp || loading}
              >
                <FileUp className="h-4 w-4" />
                {structuredLoading ? 'Procesando...' : 'Probar autocompletado'}
              </Button>
              {structuredFile && (
                <span className="text-xs text-slate-500">Archivo: {structuredFile.name}</span>
              )}
            </div>
            {structuredResult?.analisis_documento && (
              <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
                <p>Pares detectados: {structuredResult.analisis_documento.pares_detectados || 0}</p>
                {Array.isArray(structuredResult.analisis_documento.advertencias) && structuredResult.analisis_documento.advertencias.length > 0 && (
                  <p className="mt-1 text-amber-600">{structuredResult.analisis_documento.advertencias.join(' | ')}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={lookingUp ? 'Buscando clave...' : 'Escribe tu respuesta o clave (RUT/email)'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={lookingUp}
            />
            <Button onClick={handleSend} disabled={lookingUp}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleGenerate} loading={loading} disabled={!canGenerate || lookingUp}>
              <Sparkles className="h-4 w-4" /> Generar PACI
            </Button>
            <Button variant="outline" onClick={clearChatKeepingProgress}>
              Limpiar chat
            </Button>
            <Button variant="ghost" onClick={resetConversation}>
              <RotateCcw className="h-4 w-4" /> Reiniciar
            </Button>
          </div>
        </div>

        {ultimoResultado && (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Ver última propuesta aplicada</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded bg-white p-2 text-xs text-slate-700">
              {JSON.stringify(ultimoResultado, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </aside>
  );
}
