import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  MessageCircle, Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Loader2, Search, Layers, Upload, Download, FileSpreadsheet,
  ArrowLeft, Eye,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import HelpButton from '../../components/ui/HelpButton';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import {
  getTemasAdmin, createTema, updateTema, toggleTema,
  getOpciones, createOpcion, updateOpcion, toggleOpcion,
  importChatbotExcel,
} from '../../services/chatbotService';

const INITIAL_TEMA = { titulo: '', descripcion: '', icono: 'MessageCircle', orden: 0 };
const INITIAL_OPCION = { tema_id: '', parent_id: null, nivel: 1, texto_opcion: '', texto_respuesta: '', orden: 0 };

export default function ChatbotAdminPage() {
  const [temas, setTemas] = useState([]);
  const [selectedTemaId, setSelectedTemaId] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [searchTema, setSearchTema] = useState('');

  // Modal states
  const [showTemaModal, setShowTemaModal] = useState(false);
  const [editingTema, setEditingTema] = useState(null);
  const [temaForm, setTemaForm] = useState(INITIAL_TEMA);

  const [showOpcionModal, setShowOpcionModal] = useState(false);
  const [editingOpcion, setEditingOpcion] = useState(null);
  const [opcionForm, setOpcionForm] = useState(INITIAL_OPCION);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [expandedNodes, setExpandedNodes] = useState({});

  // Preview panel
  const [showPreview, setShowPreview] = useState(false);
  const [previewTema, setPreviewTema] = useState(null);
  const [previewBreadcrumb, setPreviewBreadcrumb] = useState([]);
  const [previewNodes, setPreviewNodes] = useState([]);
  const [previewRespuesta, setPreviewRespuesta] = useState(null);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Load temas ──────────────────────────────────────────
  const fetchTemas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTemasAdmin();
      setTemas(res.data.data?.items || []);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar temas' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemas(); }, [fetchTemas]);

  // ── Load opciones when tema selected ────────────────────
  const fetchOpciones = useCallback(async (temaId) => {
    if (!temaId) return;
    setLoadingOpciones(true);
    try {
      const res = await getOpciones(temaId);
      setOpciones(res.data.data || []);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar opciones' });
    } finally {
      setLoadingOpciones(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTemaId) fetchOpciones(selectedTemaId);
    else setOpciones([]);
  }, [selectedTemaId, fetchOpciones]);

  // ── TEMA CRUD ───────────────────────────────────────────
  const openCreateTema = () => {
    setEditingTema(null);
    setTemaForm(INITIAL_TEMA);
    setShowTemaModal(true);
  };

  const openEditTema = (tema) => {
    setEditingTema(tema);
    setTemaForm({ titulo: tema.titulo, descripcion: tema.descripcion || '', icono: tema.icono || 'MessageCircle', orden: tema.orden || 0 });
    setShowTemaModal(true);
  };

  const handleSaveTema = async () => {
    try {
      if (editingTema) {
        await updateTema(editingTema.id, temaForm);
        setAlert({ type: 'success', message: 'Tema actualizado' });
      } else {
        await createTema(temaForm);
        setAlert({ type: 'success', message: 'Tema creado' });
      }
      setShowTemaModal(false);
      fetchTemas();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al guardar tema' });
    }
  };

  // ── OPCION CRUD ─────────────────────────────────────────
  const openCreateOpcion = (parentId = null, nivel = 1) => {
    setEditingOpcion(null);
    setOpcionForm({ ...INITIAL_OPCION, tema_id: selectedTemaId, parent_id: parentId, nivel });
    setShowOpcionModal(true);
  };

  const openEditOpcion = (opc) => {
    setEditingOpcion(opc);
    setOpcionForm({
      tema_id: opc.tema_id,
      parent_id: opc.parent_id,
      nivel: opc.nivel,
      texto_opcion: opc.texto_opcion,
      texto_respuesta: opc.texto_respuesta || '',
      orden: opc.orden || 0,
    });
    setShowOpcionModal(true);
  };

  const handleSaveOpcion = async () => {
    try {
      if (editingOpcion) {
        await updateOpcion(editingOpcion.id, {
          texto_opcion: opcionForm.texto_opcion,
          texto_respuesta: opcionForm.texto_respuesta || null,
          orden: opcionForm.orden,
        });
        setAlert({ type: 'success', message: 'Opción actualizada' });
      } else {
        await createOpcion(opcionForm);
        setAlert({ type: 'success', message: 'Opción creada' });
      }
      setShowOpcionModal(false);
      fetchOpciones(selectedTemaId);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al guardar opción' });
    }
  };

  // ── DELETE ──────────────────────────────────────────────
  const confirmDelete = (type, id, label) => {
    setDeleteTarget({ type, id, label });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'tema') {
        await toggleTema(deleteTarget.id);
        if (selectedTemaId === deleteTarget.id) {
          setSelectedTemaId(null);
          setOpciones([]);
        }
        fetchTemas();
      } else {
        await toggleOpcion(deleteTarget.id);
        fetchOpciones(selectedTemaId);
      }
      setAlert({ type: 'success', message: `${deleteTarget.type === 'tema' ? 'Tema' : 'Opción'} desactivado` });
    } catch {
      setAlert({ type: 'error', message: 'Error al desactivar' });
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // ── Build nested tree from flat opciones ────────────────
  const buildTree = (items, parentId = null) => {
    return items
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.orden - b.orden)
      .map((item) => ({ ...item, children: buildTree(items, item.id) }));
  };

  const toggleExpand = (id) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const tree = buildTree(opciones);
  const filteredTemas = temas.filter((t) =>
    t.titulo.toLowerCase().includes(searchTema.toLowerCase())
  );
  const selectedTema = temas.find((t) => t.id === selectedTemaId);

  const nivelLabels = { 1: 'Pregunta', 2: 'Sub-opción', 3: 'Respuesta final' };
  const nivelColors = { 1: 'primary', 2: 'accent', 3: 'success' };

  // ── Preview logic ───────────────────────────────────────
  const openPreview = () => {
    if (!selectedTema || tree.length === 0) return;
    setPreviewTema(selectedTema);
    setPreviewBreadcrumb([{ id: 'root', label: selectedTema.titulo, children: tree }]);
    setPreviewNodes(tree);
    setPreviewRespuesta(null);
    setShowPreview(true);
  };

  const previewSelectOpcion = (node) => {
    if (node.texto_respuesta) {
      setPreviewRespuesta(node.texto_respuesta);
    }
    if (node.children && node.children.length > 0) {
      setPreviewRespuesta(node.texto_respuesta || null);
      setPreviewBreadcrumb((prev) => [...prev, { id: node.id, label: node.texto_opcion, children: node.children }]);
      setPreviewNodes(node.children);
    } else if (node.texto_respuesta) {
      setPreviewBreadcrumb((prev) => [...prev, { id: node.id, label: node.texto_opcion, children: [] }]);
      setPreviewNodes([]);
    }
  };

  const previewBack = () => {
    if (previewBreadcrumb.length > 1) {
      const newBc = previewBreadcrumb.slice(0, -1);
      setPreviewBreadcrumb(newBc);
      setPreviewNodes(newBc[newBc.length - 1].children);
      setPreviewRespuesta(null);
    }
  };

  const previewReset = () => {
    setPreviewBreadcrumb([{ id: 'root', label: previewTema.titulo, children: tree }]);
    setPreviewNodes(tree);
    setPreviewRespuesta(null);
  };

  // ── IMPORT EXCEL ────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const normalized = jsonRows.map((r) => {
        const row = {};
        Object.keys(r).forEach((k) => {
          row[k.trim().toLowerCase().replace(/\s+/g, '_')] = r[k];
        });
        return row;
      });
      setImportRows(normalized);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importChatbotExcel(importRows);
      setImportResult(res.data.data);
      setAlert({ type: 'success', message: `Importación completada: ${res.data.data.temas_created} temas, ${res.data.data.opciones_created} opciones creadas` });
      fetchTemas();
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || 'Error en la importación' });
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error en la importación' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { tema: 'Adecuaciones Curriculares', icono: 'BookOpen', opcion_nivel1: '¿Qué es una adecuación de acceso?', opcion_nivel2: 'Definición general', respuesta: 'Una adecuación de acceso es una modificación en los recursos, la organización del espacio o el tiempo para que el estudiante pueda acceder al currículum.' },
      { tema: 'Adecuaciones Curriculares', icono: 'BookOpen', opcion_nivel1: '¿Qué es una adecuación de acceso?', opcion_nivel2: 'Ejemplos prácticos', respuesta: 'Ejemplo: Usar texto ampliado, permitir más tiempo en evaluaciones, usar recursos audiovisuales.' },
      { tema: 'Adecuaciones Curriculares', icono: 'BookOpen', opcion_nivel1: '¿Qué es una adecuación de objetivos?', opcion_nivel2: '', respuesta: 'Es una adecuación que modifica los objetivos de aprendizaje para ajustarlos a las necesidades del estudiante.' },
      { tema: 'Estrategias Pedagógicas', icono: 'Lightbulb', opcion_nivel1: 'Estrategias de lectura', opcion_nivel2: 'Lectura guiada', respuesta: 'La lectura guiada consiste en acompañar al estudiante durante la lectura, haciendo pausas para verificar comprensión.' },
      { tema: 'Estrategias Pedagógicas', icono: 'Lightbulb', opcion_nivel1: 'Estrategias de lectura', opcion_nivel2: 'Lectura compartida', respuesta: 'La lectura compartida permite que docente y estudiante lean juntos, modelando estrategias de comprensión.' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 45 }, { wch: 30 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chatbot');
    XLSX.writeFile(wb, 'plantilla_chatbot.xlsx');
  };

  // Build preview of import data grouped by tema
  const importPreview = (() => {
    if (importRows.length === 0) return {};
    const grouped = {};
    importRows.forEach((row) => {
      const tema = row.tema || '(Sin tema)';
      if (!grouped[tema]) grouped[tema] = {};
      const n1 = row.opcion_nivel1 || '(Sin opción)';
      if (!grouped[tema][n1]) grouped[tema][n1] = {};
      const n2 = row.opcion_nivel2 || '';
      if (n2) {
        if (!grouped[tema][n1][n2]) grouped[tema][n1][n2] = [];
        if (row.respuesta) grouped[tema][n1][n2].push(row.respuesta);
      } else {
        if (!grouped[tema][n1]['__direct']) grouped[tema][n1]['__direct'] = [];
        if (row.respuesta) grouped[tema][n1]['__direct'].push(row.respuesta);
      }
    });
    return grouped;
  })();

  // ── Render node recursively ─────────────────────────────
  const renderNode = (node, depth = 0) => (
    <div key={node.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-3' : ''}`}>
      <div className="flex items-start gap-2 py-2 group">
        {node.children?.length > 0 ? (
          <button onClick={() => toggleExpand(node.id)} className="mt-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            {expandedNodes[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge color={nivelColors[node.nivel] || 'secondary'} className="text-[10px]">
              N{node.nivel} — {nivelLabels[node.nivel] || `Nivel ${node.nivel}`}
            </Badge>
            <span className="text-sm font-medium text-slate-800 truncate">{node.texto_opcion}</span>
          </div>
          {node.texto_respuesta && (
            <p className="text-xs text-secondary mt-1 bg-green/5 border border-green/20 rounded-xl p-2.5 whitespace-pre-wrap">
              {node.texto_respuesta}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {node.nivel < 3 && (
            <button
              onClick={() => openCreateOpcion(node.id, node.nivel + 1)}
              className="p-1.5 text-accent hover:bg-accent/10 rounded-lg cursor-pointer transition-colors"
              title={`Agregar sub-opción nivel ${node.nivel + 1}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => openEditOpcion(node)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg cursor-pointer transition-colors" title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => confirmDelete('opcion', node.id, node.texto_opcion)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg cursor-pointer transition-colors" title="Desactivar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expandedNodes[node.id] && node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrador de Chatbot</h1>
          <p className="text-sm text-secondary mt-1">
            Gestione los temas y opciones del chatbot. Cree manualmente o importe desde Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setImportResult(null); setImportRows([]); setImportFileName(''); setShowImportModal(true); }}>
            <Upload className="h-4 w-4 mr-1" /> Importar Excel
          </Button>
          <HelpButton
            title="Administrador de Chatbot"
            description="Administra el contenido del chatbot pedagógico. Permite crear temas y opciones de respuesta manualmente, o importar contenido masivo desde un archivo Excel con la estructura: tema, icono, opcion_nivel1, opcion_nivel2, respuesta."
            meaning="Es donde se configura lo que el asistente virtual puede responder. Puede agregar contenido uno a uno o cargarlo masivamente desde un Excel."
          />
        </div>
      </div>

      {alert.message && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Temas list */}
        <Card className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Temas</h3>
            <Button size="sm" onClick={openCreateTema}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tema..."
              value={searchTema}
              onChange={(e) => setSearchTema(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredTemas.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No hay temas aún" description="Cree el primer tema o importe desde Excel." />
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredTemas.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemaId(t.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                    selectedTemaId === t.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.titulo}</p>
                      {t.descripcion && <p className="text-[10px] text-secondary truncate">{t.descripcion}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openEditTema(t); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg cursor-pointer transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete('tema', t.id, t.titulo); }} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg cursor-pointer transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Opciones tree */}
        <Card className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {selectedTema ? `Opciones: ${selectedTema.titulo}` : 'Seleccione un tema'}
            </h3>
            <div className="flex items-center gap-2">
              {selectedTemaId && tree.length > 0 && (
                <Button size="sm" variant="outline" onClick={openPreview}>
                  <Eye className="h-4 w-4 mr-1" /> Vista Previa
                </Button>
              )}
              {selectedTemaId && (
                <Button size="sm" onClick={() => openCreateOpcion(null, 1)}>
                  <Plus className="h-4 w-4 mr-1" /> Opción N1
                </Button>
              )}
            </div>
          </div>

          {!selectedTemaId ? (
            <EmptyState icon={Layers} title="Seleccione un tema" description="Elija un tema de la lista para ver y gestionar sus opciones" />
          ) : loadingOpciones ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : tree.length === 0 ? (
            <EmptyState icon={MessageCircle} title="Sin opciones" description="Este tema no tiene opciones aún. Agregue la primera opción de nivel 1." />
          ) : (
            <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
          )}
        </Card>
      </div>

      {/* ── PREVIEW MODAL ──────────────────────────────── */}
      {showPreview && previewTema && (
        <Modal open={true} title="Vista Previa del Chatbot" onClose={() => setShowPreview(false)} size="lg">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Simulated chatbot widget */}
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-lg max-w-sm mx-auto">
                {/* Chat header */}
                <div className="bg-gradient-to-r from-primary to-primary-light text-white px-4 py-3 flex items-center gap-2">
                  {previewBreadcrumb.length > 1 && (
                    <button onClick={previewBack} className="p-1 hover:bg-white/20 rounded cursor-pointer">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <MessageCircle className="h-5 w-5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">Asistente Pedagógico</p>
                    <p className="text-[10px] opacity-80 truncate">{previewTema.titulo}</p>
                  </div>
                  {previewBreadcrumb.length > 1 && (
                    <button onClick={previewReset} className="text-[10px] underline opacity-80 hover:opacity-100 cursor-pointer">Inicio</button>
                  )}
                </div>

                {/* Chat body */}
                <div className="p-4 space-y-3 bg-slate-50 min-h-[300px] max-h-[400px] overflow-y-auto">
                  {/* Breadcrumb */}
                  {previewBreadcrumb.length > 1 && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-secondary">
                      {previewBreadcrumb.map((bc, i) => (
                        <span key={bc.id}>
                          {i > 0 && <span className="mx-0.5">&rsaquo;</span>}
                          <span className={i === previewBreadcrumb.length - 1 ? 'text-primary font-medium' : ''}>{bc.label}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Respuesta */}
                  {previewRespuesta && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap animate-fade-in-up">
                      {previewRespuesta}
                    </div>
                  )}

                  {/* Opciones */}
                  {previewNodes.length > 0 ? (
                    <>
                      <p className="text-xs text-secondary">Seleccione una opción:</p>
                      {previewNodes.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => previewSelectOpcion(node)}
                          className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          {node.texto_opcion}
                        </button>
                      ))}
                    </>
                  ) : previewRespuesta ? (
                    <button
                      onClick={previewReset}
                      className="w-full text-center rounded-xl border border-primary text-primary px-3 py-2.5 text-sm hover:bg-primary/5 transition-all mt-2 cursor-pointer"
                    >
                      Volver al inicio
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="sm:w-48 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 text-sm">Cómo funciona</h4>
              <p className="text-secondary leading-relaxed">
                Esta es una simulación de cómo se verá el chatbot para los usuarios. Haga clic en las opciones para navegar por el árbol de respuestas.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-slate-600">Nivel 1: Preguntas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span className="text-slate-600">Nivel 2: Sub-opciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green" />
                  <span className="text-slate-600">Nivel 3: Respuestas</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── IMPORT MODAL ───────────────────────────────── */}
      {showImportModal && (
        <Modal open={true} title="Importar Chatbot desde Excel" onClose={() => setShowImportModal(false)} size="xl">
          <div className="space-y-5">
            {/* Header actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <p className="text-sm text-secondary">
                Suba un archivo Excel con las columnas: <strong>tema, icono, opcion_nivel1, opcion_nivel2, respuesta</strong>
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Descargar Plantilla
              </Button>
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800 text-sm">Reglas de importación:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Si el <strong>tema</strong> ya existe, no se duplica — se reutiliza.</li>
                <li>Si la <strong>opcion_nivel1</strong> ya existe en ese tema, no se duplica.</li>
                <li>Si <strong>opcion_nivel2</strong> está vacía, la respuesta se asocia directamente a nivel 1.</li>
                <li>Filas con mismo tema + opcion1 + opcion2 pero distinta respuesta: se agregan todas las respuestas sin duplicar.</li>
                <li>No se permiten duplicados exactos de respuesta.</li>
              </ul>
            </div>

            {/* File upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <FileSpreadsheet className="h-10 w-10 text-slate-400" />
              {importFileName ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800">{importFileName}</p>
                  <p className="text-xs text-secondary mt-1">{importRows.length} filas detectadas</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Haga clic para seleccionar archivo</p>
                  <p className="text-xs text-secondary">.xlsx, .xls</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Preview of parsed data */}
            {importRows.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Vista previa de la importación</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                  {Object.entries(importPreview).map(([tema, opciones]) => (
                    <div key={tema} className="border-b border-slate-100 last:border-b-0">
                      <div className="px-4 py-2.5 bg-primary/5 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">{tema}</span>
                      </div>
                      {Object.entries(opciones).map(([n1, n2map]) => (
                        <div key={n1} className="pl-8 py-2 border-t border-slate-50">
                          <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                            <Badge color="primary" className="text-[9px]">N1</Badge>
                            {n1}
                          </p>
                          {Object.entries(n2map).map(([n2Key, respuestas]) => (
                            <div key={n2Key} className="pl-6 mt-1">
                              {n2Key !== '__direct' && (
                                <p className="text-xs text-slate-600 flex items-center gap-2">
                                  <Badge color="accent" className="text-[9px]">N2</Badge>
                                  {n2Key}
                                </p>
                              )}
                              {respuestas.map((r, i) => (
                                <p key={i} className="text-[11px] text-secondary pl-6 mt-0.5 truncate flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green shrink-0" />
                                  {r.length > 100 ? r.substring(0, 100) + '...' : r}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className={`rounded-xl p-4 text-sm ${importResult.error ? 'bg-danger/5 border border-danger/20 text-danger' : 'bg-green/5 border border-green/20 text-green-700'}`}>
                {importResult.error ? (
                  <p>{importResult.error}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold">Importación completada</p>
                    <p>Temas creados: {importResult.temas_created}</p>
                    <p>Opciones creadas: {importResult.opciones_created}</p>
                    {importResult.skipped > 0 && <p>Duplicados omitidos: {importResult.skipped}</p>}
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2 text-xs text-orange-600">
                        {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Cerrar</Button>
              <Button
                onClick={handleImport}
                disabled={importRows.length === 0 || importing}
                loading={importing}
              >
                <Upload className="h-4 w-4 mr-1" /> Importar {importRows.length} filas
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── TEMA FORM MODAL ────────────────────────────── */}
      {showTemaModal && (
        <Modal open={true} title={editingTema ? 'Editar Tema' : 'Nuevo Tema'} onClose={() => setShowTemaModal(false)}>
          <div className="space-y-4">
            <Input
              label="Título"
              value={temaForm.titulo}
              onChange={(e) => setTemaForm({ ...temaForm, titulo: e.target.value })}
              placeholder="Ej: Adecuaciones Curriculares"
            />
            <TextArea
              label="Descripción"
              value={temaForm.descripcion}
              onChange={(e) => setTemaForm({ ...temaForm, descripcion: e.target.value })}
              placeholder="Breve descripción del tema..."
              rows={3}
            />
            <Input
              label="Icono (Lucide)"
              value={temaForm.icono}
              onChange={(e) => setTemaForm({ ...temaForm, icono: e.target.value })}
              placeholder="Ej: BookOpen, MessageCircle"
            />
            <Input
              label="Orden"
              type="number"
              value={temaForm.orden}
              onChange={(e) => setTemaForm({ ...temaForm, orden: parseInt(e.target.value) || 0 })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTemaModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveTema}>{editingTema ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── OPCION FORM MODAL ──────────────────────────── */}
      {showOpcionModal && (
        <Modal
          open={true}
          title={editingOpcion ? 'Editar Opción' : `Nueva Opción (Nivel ${opcionForm.nivel})`}
          onClose={() => setShowOpcionModal(false)}
        >
          <div className="space-y-4">
            <div>
              <Badge color={nivelColors[opcionForm.nivel] || 'secondary'}>
                {nivelLabels[opcionForm.nivel] || `Nivel ${opcionForm.nivel}`}
              </Badge>
              {opcionForm.parent_id && (
                <p className="text-xs text-secondary mt-1">
                  Padre: {opciones.find((o) => o.id === opcionForm.parent_id)?.texto_opcion || opcionForm.parent_id}
                </p>
              )}
            </div>
            <Input
              label="Texto de la opción"
              value={opcionForm.texto_opcion}
              onChange={(e) => setOpcionForm({ ...opcionForm, texto_opcion: e.target.value })}
              placeholder="Ej: ¿Qué es una adecuación de acceso?"
            />
            <TextArea
              label="Texto de respuesta (opcional)"
              value={opcionForm.texto_respuesta}
              onChange={(e) => setOpcionForm({ ...opcionForm, texto_respuesta: e.target.value })}
              placeholder="Texto que se mostrará como respuesta al usuario..."
              rows={4}
            />
            <Input
              label="Orden"
              type="number"
              value={opcionForm.orden}
              onChange={(e) => setOpcionForm({ ...opcionForm, orden: parseInt(e.target.value) || 0 })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowOpcionModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveOpcion}>{editingOpcion ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRMATION MODAL ──────────────────── */}
      {showDeleteModal && deleteTarget && (
        <Modal open={true} title="Confirmar Desactivación" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-slate-600 mb-4">
            ¿Está seguro que desea desactivar{' '}
            <strong>{deleteTarget.type === 'tema' ? 'el tema' : 'la opción'}</strong>{' '}
            &ldquo;{deleteTarget.label}&rdquo;?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Desactivar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
