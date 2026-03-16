import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Loader2, Search, Layers,
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
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'tema'|'opcion', id, label }

  const [expandedNodes, setExpandedNodes] = useState({});

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

  // ── Render node recursively ─────────────────────────────
  const renderNode = (node, depth = 0) => (
    <div key={node.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-3' : ''}`}>
      <div className="flex items-start gap-2 py-2 group">
        {node.children?.length > 0 ? (
          <button onClick={() => toggleExpand(node.id)} className="mt-0.5 text-slate-400 hover:text-slate-700">
            {expandedNodes[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge color={nivelColors[node.nivel] || 'default'} className="text-[10px]">
              N{node.nivel} — {nivelLabels[node.nivel] || `Nivel ${node.nivel}`}
            </Badge>
            <span className="text-sm font-medium text-slate-800 truncate">{node.texto_opcion}</span>
          </div>
          {node.texto_respuesta && (
            <p className="text-xs text-secondary mt-1 bg-success/5 border border-success/20 rounded p-2 whitespace-pre-wrap">
              {node.texto_respuesta}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {node.nivel < 3 && (
            <button
              onClick={() => openCreateOpcion(node.id, node.nivel + 1)}
              className="p-1 text-accent hover:bg-accent/10 rounded"
              title={`Agregar sub-opción nivel ${node.nivel + 1}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => openEditOpcion(node)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => confirmDelete('opcion', node.id, node.texto_opcion)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Desactivar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expandedNodes[node.id] && node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrador de Chatbot</h1>
          <p className="text-sm text-secondary mt-1">
            Gestione los temas y opciones del chatbot pedagógico. Máximo 3 niveles de profundidad.
          </p>
        </div>
        <HelpButton
          title="Administrador de Chatbot"
          description="Administra el contenido del chatbot pedagógico. Permite crear y editar temas de conversación y sus opciones de respuesta, que el chatbot usa para orientar a los docentes con sugerencias pedagógicas."
          meaning="Es donde se configura lo que el asistente virtual puede responder. Aquí defines las preguntas y respuestas del chatbot del sistema."
        />
      </div>

      {alert.message && <Alert type={alert.type} onClose={() => setAlert({ type: '', message: '' })}>{alert.message}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Temas list */}
        <Card className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">Temas</h3>
            <Button size="sm" onClick={openCreateTema}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tema..."
              value={searchTema}
              onChange={(e) => setSearchTema(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredTemas.length === 0 ? (
            <EmptyState icon={MessageCircle} message="No hay temas aún" />
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredTemas.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemaId(t.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
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
                    <button onClick={(e) => { e.stopPropagation(); openEditTema(t); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete('tema', t.id, t.titulo); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
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
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {selectedTema ? `Opciones: ${selectedTema.titulo}` : 'Seleccione un tema'}
            </h3>
            {selectedTemaId && (
              <Button size="sm" onClick={() => openCreateOpcion(null, 1)}>
                <Plus className="h-4 w-4 mr-1" /> Opción Nivel 1
              </Button>
            )}
          </div>

          {!selectedTemaId ? (
            <EmptyState icon={Layers} message="Seleccione un tema de la lista para ver y gestionar sus opciones" />
          ) : loadingOpciones ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : tree.length === 0 ? (
            <EmptyState icon={MessageCircle} message="Este tema no tiene opciones aún. Agregue la primera opción de nivel 1." />
          ) : (
            <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
          )}
        </Card>
      </div>

      {/* Tema Modal */}
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemaModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveTema}>{editingTema ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Opcion Modal */}
      {showOpcionModal && (
        <Modal
          open={true}
          title={editingOpcion ? 'Editar Opción' : `Nueva Opción (Nivel ${opcionForm.nivel})`}
          onClose={() => setShowOpcionModal(false)}
        >
          <div className="space-y-4">
            <div>
              <Badge color={nivelColors[opcionForm.nivel] || 'default'}>
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
              label="Texto de respuesta (opcional, se muestra al seleccionar esta opción)"
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOpcionModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveOpcion}>{editingOpcion ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <Modal open={true} title="Confirmar Desactivación" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-slate-600 mb-4">
            ¿Está seguro que desea desactivar{' '}
            <strong>{deleteTarget.type === 'tema' ? 'el tema' : 'la opción'}</strong>{' '}
            "{deleteTarget.label}"?
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
