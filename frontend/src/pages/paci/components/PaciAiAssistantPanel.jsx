import { useMemo, useState } from 'react';
import { Bot, RotateCcw, Search, Send, Sparkles } from 'lucide-react';
import Button from '../../../components/ui/Button';
import api from '../../../api/axios';
import { generarPaciCompletoOpenRouter } from '../../../services/openRouterAiService';

const INITIAL_CONTEXT = {
  clave_busqueda: '',
  establecimiento: '',
  estudiante_id: '',
  estudiante_iniciales: '',
  apoderado: '',
  diagnostico_nee: '',
  perfil_estudiante: '',
  barreras: '',
  fortalezas: '',
  asignatura: '',
  unidad: '',
  eje: '',
  profesor_jefe: '',
  profesor_asignatura: '',
  educador_diferencial: '',
};

const QUESTIONS = [
  { key: 'clave_busqueda', label: 'Clave inicial (RUT estudiante o email profesor)', required: false },
  { key: 'estudiante_iniciales', label: 'Iniciales del estudiante', required: true },
  { key: 'apoderado', label: 'Nombre de apoderado', required: false },
  { key: 'diagnostico_nee', label: 'Diagnóstico / NEE', required: true },
  { key: 'perfil_estudiante', label: 'Perfil del estudiante', required: false },
  { key: 'barreras', label: 'Barreras principales', required: false },
  { key: 'fortalezas', label: 'Fortalezas principales', required: false },
  { key: 'asignatura', label: 'Asignatura', required: true },
  { key: 'unidad', label: 'Unidad', required: false },
  { key: 'eje', label: 'Eje', required: false },
];

const getQuestionPrompt = (question) => (
  `${question.label}${question.required ? ' *' : ''}: responde en un solo mensaje.${question.required ? '' : ' Puedes escribir /omitir.'}`
);

const currentDate = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear().toString();

const toInitials = (fullName) => {
  if (!fullName) return '';
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
};

const normalizeRut = (value) => String(value || '').toLowerCase().replace(/[^0-9k]/g, '');

const looksLikeRut = (value) => {
  const normalized = normalizeRut(value);
  return normalized.length >= 8 && /\d/.test(normalized);
};

const looksLikeEmail = (value) => String(value || '').includes('@');

const extractFormSuggestion = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

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

const buildLocalSuggestion = (context, notes) => {
  const barreras = (context.barreras || '').trim();
  const fortalezas = (context.fortalezas || '').trim();
  const diagnostico = (context.diagnostico_nee || '').trim();
  const perfil = (context.perfil_estudiante || '').trim();
  const eje = (context.eje || '').trim();
  const unidad = (context.unidad || '').trim();

  const resumenBase = [
    context.establecimiento ? `Establecimiento: ${context.establecimiento}` : '',
    context.estudiante_iniciales ? `Estudiante: ${context.estudiante_iniciales}` : '',
    context.apoderado ? `Apoderado: ${context.apoderado}` : '',
    perfil ? `Perfil: ${perfil}` : '',
    notes ? `Notas docentes: ${notes}` : '',
  ].filter(Boolean).join(' | ');

  return {
    estudiante_id: context.estudiante_id || '',
    formato_generado: 'Completo',
    fecha_emision: currentDate(),
    anio_escolar: currentYear(),
    profesor_jefe: context.profesor_jefe || '',
    profesor_asignatura: context.profesor_asignatura || context.asignatura || '',
    educador_diferencial: context.educador_diferencial || '',
    perfil_dua: {
      fortalezas,
      barreras,
      barreras_personalizadas: barreras,
      acceso_curricular: eje ? `Eje priorizado: ${eje}` : '',
      preferencias_representacion: perfil,
      preferencias_expresion: perfil,
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
    trayectoria: [
      {
        _eje: eje,
        _unidad: unidad,
        tipo_adecuacion: 'Acceso',
        justificacion_tecnica: diagnostico,
        meta_especifica: resumenBase,
        estrategias_dua: notes || 'Usar múltiples medios de representación, expresión y motivación.',
        habilidades: fortalezas,
        seguimiento_registro: 'Registrar avances semanales y ajustar apoyos según evidencia.',
        adecuacion_oa: {
          meta_integradora: 'Meta sugerida por captura inicial de datos. Ajustar con OA real seleccionado.',
          estrategias: 'Estrategias DUA personalizadas según perfil y barreras reportadas.',
          adecuaciones: 'Adecuación de acceso con apoyos visuales, secuenciación y andamiaje.',
          criterios_evaluacion: 'Criterios diferenciados según progreso del estudiante.',
        },
      },
    ],
  };
};

export default function PaciAiAssistantPanel({ onApplySuggestion, onToggle, isOpen }) {
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [chat, setChat] = useState([
    {
      role: 'assistant',
      text: 'Asistente PACI listo. Te ayudaré por chat y rellenaré el formulario en paralelo con claves como RUT o correo.',
    },
    { role: 'assistant', text: getQuestionPrompt(QUESTIONS[0]) },
  ]);
  const [context, setContext] = useState(INITIAL_CONTEXT);
  const [composer, setComposer] = useState('');
  const [notes, setNotes] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const canGenerate = useMemo(() => {
    return !!(
      context.estudiante_iniciales.trim() &&
      context.diagnostico_nee.trim() &&
      context.asignatura.trim()
    );
  }, [context]);

  const resetConversation = () => {
    setContext(INITIAL_CONTEXT);
    setNotes('');
    setComposer('');
    setQuestionIndex(0);
    setUltimoResultado(null);
    setChat([
      { role: 'assistant', text: 'Reinicié la conversación. Vamos de nuevo en modo guiado.' },
      { role: 'assistant', text: getQuestionPrompt(QUESTIONS[0]) },
    ]);
  };

  const applySilent = (nextContext, nextNotes = notes) => {
    onApplySuggestion(buildLocalSuggestion(nextContext, nextNotes), { silent: true });
  };

  const tryResolveByKey = async (rawValue) => {
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
            estudiante_id: est.id || '',
            estudiante_iniciales: toInitials(est.nombre_completo),
            diagnostico_nee: est.diagnostico || context.diagnostico_nee,
          },
          message: `Encontré estudiante por RUT: ${est.nombre_completo} (${est.rut}). Campos base autocompletados.`,
        };
      }
    }

    // 2) Email de profesor
    if (looksLikeEmail(value)) {
      const res = await api.get('/profesores', { params: { email: value, limit: 1 } });
      const items = res.data?.data?.items || [];
      if (items.length > 0) {
        const prof = items[0];
        return {
          type: 'teacher',
          patch: {
            clave_busqueda: value,
            establecimiento: prof.establecimiento_nombre || context.establecimiento,
            profesor_jefe: prof.usuario_nombre || '',
            profesor_asignatura: prof.usuario_nombre || '',
            educador_diferencial: prof.usuario_nombre || '',
          },
          message: `Encontré profesor por correo: ${prof.usuario_nombre} (${prof.usuario_email}). Datos de equipo docente actualizados.`,
        };
      }
    }

    // 3) Nombre de profesor aproximado
    if (value.length >= 4) {
      const res = await api.get('/profesores', { params: { nombre: value, limit: 1 } });
      const items = res.data?.data?.items || [];
      if (items.length > 0) {
        const prof = items[0];
        return {
          type: 'teacher',
          patch: {
            clave_busqueda: value,
            establecimiento: prof.establecimiento_nombre || context.establecimiento,
            profesor_jefe: prof.usuario_nombre || '',
            profesor_asignatura: prof.usuario_nombre || '',
            educador_diferencial: prof.usuario_nombre || '',
          },
          message: `Encontré profesor por nombre: ${prof.usuario_nombre}. Datos docentes precargados.`,
        };
      }
    }

    return null;
  };

  const handleSend = async () => {
    const text = composer.trim();
    if (!text || loading || lookingUp) return;

    setChat((prev) => [...prev, { role: 'user', text }]);
    setComposer('');

    // Siempre intentamos resolver por clave semántica
    setLookingUp(true);
    try {
      const match = await tryResolveByKey(text);
      if (match) {
        const merged = { ...context, ...match.patch };
        setContext(merged);
        applySilent(merged);
        setChat((prev) => [...prev, { role: 'assistant', text: match.message }]);
      }
    } catch {
      setChat((prev) => [...prev, { role: 'assistant', text: 'No pude resolver la clave en este momento. Seguimos con la captura manual.' }]);
    } finally {
      setLookingUp(false);
    }

    const currentQuestion = QUESTIONS[questionIndex];

    if (currentQuestion) {
      const isOmit = text.toLowerCase() === '/omitir';
      const partialContext = isOmit ? { ...context } : { ...context, [currentQuestion.key]: text };

      if (!isOmit) {
        setContext(partialContext);
        applySilent(partialContext);
      }

      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);

      if (nextIndex < QUESTIONS.length) {
        setChat((prev) => [...prev, { role: 'assistant', text: getQuestionPrompt(QUESTIONS[nextIndex]) }]);
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
    applySilent(context, nextNotes);
    setChat((prev) => [...prev, { role: 'assistant', text: 'Anotado. El formulario ya se va actualizando con la información capturada.' }]);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setLoading(true);
    try {
      const payload = {
        ...context,
        mensaje_docente: notes,
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
        setChat((prev) => [...prev, { role: 'assistant', text: 'Generé y apliqué una propuesta de PACI completo sobre el formulario.' }]);
      } else {
        const fallback = buildLocalSuggestion(context, notes);
        setUltimoResultado(fallback);
        onApplySuggestion(fallback);
        setChat((prev) => [...prev, { role: 'assistant', text: 'La IA respondió sin estructura útil. Apliqué un borrador completo local para continuar.' }]);
      }
    } catch {
      const fallback = buildLocalSuggestion(context, notes);
      setUltimoResultado(fallback);
      onApplySuggestion(fallback);
      setChat((prev) => [...prev, { role: 'assistant', text: 'Falló la IA remota. Apliqué un borrador local completo con los datos capturados.' }]);
    } finally {
      setLoading(false);
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
          <p className="mt-1 text-xs text-slate-600">
            Completados: {Object.values(context).filter((v) => String(v || '').trim() !== '').length} / {Object.keys(INITIAL_CONTEXT).length}
          </p>
          <p className="text-xs text-slate-500">Obligatorios para generar: iniciales, diagnóstico y asignatura.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Search className="h-3.5 w-3.5" /> Lookup por clave
          </div>
          <p className="text-xs text-slate-600">Si escribes un RUT, correo o nombre, intentaré buscar estudiante/profesor en APIs y autocompletar.</p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversación</p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
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
