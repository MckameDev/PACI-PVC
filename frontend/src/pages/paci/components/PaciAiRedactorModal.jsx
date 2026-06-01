import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, Check, Send, Bot, User as UserIcon, Lightbulb, FileText, HelpCircle, RotateCcw, Copy } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { asistentePaciChatOpenRouter } from '../../../services/openRouterAiService';

// Sanitizado mínimo de HTML que la IA puede devolver (whitelist de tags)
const sanitizeHtml = (html) => {
  const tmp = document.createElement('div');
  tmp.textContent = String(html ?? '');
  const escaped = tmp.innerHTML;
  return escaped.replace(/&lt;(\/?)(p|ul|ol|li|strong|em|br|h3|h4)&gt;/gi, '<$1$2>');
};

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const confidenceTone = (v) => {
  if (v >= 0.75) return { label: 'Alta', color: 'bg-emerald-100 text-emerald-700' };
  if (v >= 0.45) return { label: 'Media', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Baja', color: 'bg-rose-100 text-rose-700' };
};

const TIPO_META = {
  consejo:   { icon: Lightbulb,  color: 'text-amber-600', bg: 'bg-amber-50',  label: 'Consejo' },
  redaccion: { icon: FileText,   color: 'text-primary',   bg: 'bg-primary/5', label: 'Redacción' },
  pregunta:  { icon: HelpCircle, color: 'text-sky-600',   bg: 'bg-sky-50',    label: 'Pregunta' },
};

const SUGGESTED_FIELDS = [
  { value: '', label: 'Sin campo objetivo (sólo consejo)' },
  { value: 'perfil_dua.fortalezas', label: 'Perfil DUA · Fortalezas' },
  { value: 'perfil_dua.barreras', label: 'Perfil DUA · Barreras' },
  { value: 'perfil_dua.acceso_curricular', label: 'Perfil DUA · Acceso curricular' },
  { value: 'paec_activadores', label: 'PAEC · Activadores' },
  { value: 'paec_estrategias', label: 'PAEC · Estrategias' },
  { value: 'paec_desregulacion', label: 'PAEC · Protocolo desregulación' },
  { value: 'justificacion_tecnica', label: 'Trayectoria · Justificación técnica' },
  { value: 'meta_especifica', label: 'Trayectoria · Meta específica' },
];

export default function PaciAiRedactorModal({
  open,
  onClose,
  hasPAEC = false,
  campo = 'texto_paci',
  campoLabel = 'PACI',
  contexto = {},
  onApply,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [applyPAEC, setApplyPAEC] = useState(false);
  const [campoObjetivo, setCampoObjetivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(false);
    setInput('');
    setCampoObjetivo('');
    if (!hasPAEC) setApplyPAEC(false);
    setMessages([
      {
        role: 'assistant',
        content: `<p>Hola 👋 Soy tu asistente PACI. Estoy revisando el paso <strong>${campoLabel}</strong>. Puedo:</p>
                  <ul>
                    <li>Darte el siguiente paso concreto.</li>
                    <li>Redactar el texto técnico de un campo desde tus notas.</li>
                    <li>Responder dudas usando los documentos cargados.</li>
                  </ul>
                  <p>¿Cómo te ayudo?</p>`,
        meta: {
          tipo: 'consejo',
          siguiente_paso: 'Elige una acción rápida o escríbeme.',
          acciones_sugeridas: [
            { label: '¿Cómo sigo?', intent: 'consejo' },
            { label: 'Redactar este campo', intent: 'redaccion', campo },
            { label: '¿Qué me falta?', intent: 'pregunta' },
          ],
        },
      },
    ]);
  }, [open, campoLabel, campo, hasPAEC]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendTurn = useCallback(async ({ userText, intencion = '', campoTarget = '' } = {}) => {
    const text = (userText ?? input).trim();
    if (!text && !intencion) return;
    setError('');
    setLoading(true);

    const nextHistory = [
      ...messages,
      ...(text ? [{ role: 'user', content: text }] : []),
    ];
    if (text) setMessages(nextHistory);
    setInput('');

    try {
      const apiMessages = nextHistory
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: m.role === 'assistant' ? stripHtml(m.content) : String(m.content || ''),
        }));

      const { data } = await asistentePaciChatOpenRouter({
        messages: apiMessages,
        contexto,
        applyPAEC: hasPAEC && applyPAEC,
        campoObjetivo: campoTarget || campoObjetivo || (intencion === 'redaccion' ? campo : ''),
        intencion,
      });

      const payload = data?.data ?? data ?? {};
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: payload.mensaje || '(sin mensaje)',
          meta: {
            tipo: payload.tipo || 'consejo',
            texto_generado: payload.texto_generado || '',
            campo_destino: payload.campo_destino || '',
            confianza_datos: payload.confianza_datos ?? 0,
            sugerencia_mejora: payload.sugerencia_mejora || '',
            siguiente_paso: payload.siguiente_paso || '',
            acciones_sugeridas: payload.acciones_sugeridas || [],
          },
        },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error contactando al asistente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, messages, contexto, hasPAEC, applyPAEC, campoObjetivo, campo]);

  const handleApplyDraft = (texto, campoDestino) => {
    onApply?.({ html: sanitizeHtml(texto), plain: stripHtml(texto), campoDestino });
  };

  const handleCopy = async (texto) => {
    try { await navigator.clipboard.writeText(stripHtml(texto)); } catch { /* noop */ }
  };

  const handleReset = () => {
    setMessages((m) => m.slice(0, 1));
    setInput('');
    setError('');
  };

  const quickActions = useMemo(() => ([
    { label: '¿Cómo sigo?', intent: 'consejo', icon: Lightbulb },
    { label: 'Redactar campo', intent: 'redaccion', icon: FileText },
    { label: '¿Qué me falta?', intent: 'pregunta', icon: HelpCircle },
  ]), []);

  return (
    <Modal open={open} onClose={onClose} title={`Asistente IA — ${campoLabel}`} size="xl">
      <div className="flex flex-col h-[70vh]">
        {/* Top controls */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200">
          {hasPAEC && (
            <label className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary"
                checked={applyPAEC}
                onChange={(e) => setApplyPAEC(e.target.checked)}
                disabled={loading}
              />
              <span className="font-semibold text-slate-700">Aplicar criterios PAEC</span>
            </label>
          )}
          <select
            value={campoObjetivo}
            onChange={(e) => setCampoObjetivo(e.target.value)}
            disabled={loading}
            className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-slate-700"
            title="Campo objetivo para redacción"
          >
            {SUGGESTED_FIELDS.map((f) => (
              <option key={f.value || 'none'} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        </div>

        {/* Chat scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const tipo = m.meta?.tipo || 'consejo';
            const meta = TIPO_META[tipo] || TIPO_META.consejo;
            const Icon = isUser ? UserIcon : meta.icon;
            const conf = !isUser && m.meta ? confidenceTone(Number(m.meta.confianza_datos) || 0) : null;

            return (
              <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'bg-slate-200 text-slate-600' : `${meta.bg} ${meta.color}`}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wide font-semibold">
                      <span className={meta.color}>{meta.label}</span>
                      {conf && Number(m.meta.confianza_datos) > 0 && (
                        <span className={`px-2 py-0.5 rounded-full normal-case ${conf.color}`}>
                          Confianza: {conf.label}
                        </span>
                      )}
                    </div>
                  )}

                  {isUser ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.content) }}
                    />
                  )}

                  {!isUser && m.meta?.texto_generado && (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary uppercase">Propuesta de redacción</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleCopy(m.meta.texto_generado)} className="text-xs text-slate-500 hover:text-primary inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                          <Button size="sm" onClick={() => handleApplyDraft(m.meta.texto_generado, m.meta.campo_destino || campo)}>
                            <Check className="h-3.5 w-3.5" /> Aplicar
                          </Button>
                        </div>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.meta.texto_generado) }}
                      />
                      {m.meta.campo_destino && (
                        <p className="mt-2 text-[11px] text-slate-500">Campo destino sugerido: <code>{m.meta.campo_destino}</code></p>
                      )}
                    </div>
                  )}

                  {!isUser && m.meta?.siguiente_paso && (
                    <p className="mt-2 text-xs text-slate-500"><strong>Siguiente paso:</strong> {m.meta.siguiente_paso}</p>
                  )}
                  {!isUser && m.meta?.sugerencia_mejora && (
                    <p className="mt-1 text-xs text-slate-500"><strong>Para mejorar:</strong> {m.meta.sugerencia_mejora}</p>
                  )}

                  {!isUser && Array.isArray(m.meta?.acciones_sugeridas) && m.meta.acciones_sugeridas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.meta.acciones_sugeridas.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={loading}
                          onClick={() => sendTurn({ userText: a.label, intencion: a.intent, campoTarget: a.campo })}
                          className="text-xs rounded-full border border-slate-300 px-3 py-1 bg-white hover:border-primary hover:text-primary"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-500 inline-flex items-center gap-2 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generando respuesta...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700 mb-2">
            {error}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
          {quickActions.map((qa) => (
            <button
              key={qa.intent}
              type="button"
              disabled={loading}
              onClick={() => sendTurn({ userText: qa.label, intencion: qa.intent })}
              className="text-xs inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 bg-white hover:border-primary hover:text-primary"
            >
              <qa.icon className="h-3.5 w-3.5" /> {qa.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); sendTurn(); }}
          className="mt-2 flex items-end gap-2"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTurn(); }
            }}
            placeholder="Escribe tu nota, duda o pídeme una redacción... (Enter envía, Shift+Enter = nueva línea)"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </form>
      </div>
    </Modal>
  );
}
