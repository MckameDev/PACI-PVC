import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X, ArrowLeft, Loader2 } from 'lucide-react';
import { getTemasPublic, getArbol } from '../services/chatbotService';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [temas, setTemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTema, setSelectedTema] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]); // [{ id, label, children }]
  const [currentNodes, setCurrentNodes] = useState([]);
  const [respuesta, setRespuesta] = useState(null);

  // Load temas on first open
  const fetchTemas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTemasPublic();
      setTemas(res.data.data || []);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && temas.length === 0) fetchTemas();
  }, [open, temas.length, fetchTemas]);

  const handleSelectTema = async (tema) => {
    setLoading(true);
    setSelectedTema(tema);
    setRespuesta(null);
    try {
      const res = await getArbol(tema.id);
      const data = res.data.data || [];
      setCurrentNodes(data);
      setBreadcrumb([{ id: 'root', label: tema.titulo, children: data }]);
    } catch {
      setCurrentNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOpcion = (node) => {
    if (node.texto_respuesta) {
      setRespuesta(node.texto_respuesta);
    }
    if (node.children && node.children.length > 0) {
      setRespuesta(node.texto_respuesta || null);
      setBreadcrumb((prev) => [...prev, { id: node.id, label: node.texto_opcion, children: node.children }]);
      setCurrentNodes(node.children);
    } else if (node.texto_respuesta) {
      // Leaf node with response — show it, keep breadcrumb
      setBreadcrumb((prev) => [...prev, { id: node.id, label: node.texto_opcion, children: [] }]);
      setCurrentNodes([]);
    }
  };

  const handleBack = () => {
    if (breadcrumb.length > 1) {
      const newBc = breadcrumb.slice(0, -1);
      setBreadcrumb(newBc);
      setCurrentNodes(newBc[newBc.length - 1].children);
      setRespuesta(null);
    } else {
      // Back to temas list
      setSelectedTema(null);
      setBreadcrumb([]);
      setCurrentNodes([]);
      setRespuesta(null);
    }
  };

  const resetToHome = () => {
    setSelectedTema(null);
    setBreadcrumb([]);
    setCurrentNodes([]);
    setRespuesta(null);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        title="Chatbot Pedagógico"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[70vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center gap-2 shrink-0">
            {selectedTema && (
              <button onClick={handleBack} className="p-1 hover:bg-white/20 rounded">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <MessageCircle className="h-5 w-5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Asistente Pedagógico</p>
              <p className="text-[10px] opacity-80 truncate">
                {selectedTema ? selectedTema.titulo : 'Seleccione un tema para comenzar'}
              </p>
            </div>
            {selectedTema && (
              <button onClick={resetToHome} className="text-[10px] underline opacity-80 hover:opacity-100 shrink-0">Inicio</button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !selectedTema ? (
              /* Temas list */
              <>
                <p className="text-xs text-secondary">¿En qué tema necesita orientación?</p>
                {temas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No hay temas disponibles</p>
                ) : (
                  temas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTema(t)}
                      className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <p className="text-sm font-medium text-slate-800">{t.titulo}</p>
                      {t.descripcion && <p className="text-[10px] text-secondary mt-0.5">{t.descripcion}</p>}
                    </button>
                  ))
                )}
              </>
            ) : (
              /* Opciones navigation */
              <>
                {/* Breadcrumb */}
                {breadcrumb.length > 1 && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-secondary">
                    {breadcrumb.map((bc, i) => (
                      <span key={bc.id}>
                        {i > 0 && <span className="mx-0.5">›</span>}
                        <span className={i === breadcrumb.length - 1 ? 'text-primary font-medium' : ''}>{bc.label}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Response bubble */}
                {respuesta && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {respuesta}
                  </div>
                )}

                {/* Option buttons */}
                {currentNodes.length > 0 ? (
                  <>
                    <p className="text-xs text-secondary">Seleccione una opción:</p>
                    {currentNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleSelectOpcion(node)}
                        className="w-full text-left rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        {node.texto_opcion}
                      </button>
                    ))}
                  </>
                ) : !respuesta ? (
                  <p className="text-xs text-slate-400 text-center py-4">No hay más opciones disponibles.</p>
                ) : (
                  <button
                    onClick={resetToHome}
                    className="w-full text-center rounded-xl border border-primary text-primary px-3 py-2.5 text-sm hover:bg-primary/5 transition-all mt-2"
                  >
                    Volver al inicio
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
