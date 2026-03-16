import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, ClipboardCheck } from 'lucide-react';
import api from '../../api/axios';
import { extractApiErrors } from '../../utils/validation';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import HelpButton from '../../components/ui/HelpButton';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';

const EMPTY_FORM = {
  habilidad: '',
  nivel_id: '',
  tipo_adecuacion: '',
  modalidad_sugerida: '',
  instrumento_sugerido: '',
  criterio_logro: '',
};

const TIPO_ADECUACION_OPTIONS = [
  { value: 'Acceso', label: 'Acceso' },
  { value: 'Significativa', label: 'Significativa' },
];

export default function EvaluacionesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Catalogues
  const [niveles, setNiveles] = useState([]);
  const [filterTipo, setFilterTipo] = useState('');

  // Form modal
  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, label: '' });
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });

  // Load catalogues
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/cursos-niveles', { params: { limit: 200 } });
        setNiveles(res.data.data?.items || []);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (filterTipo) params.tipo_adecuacion = filterTipo;
      const res = await api.get('/evaluaciones', { params });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar evaluaciones' });
    } finally {
      setLoading(false);
    }
  }, [filterTipo]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({
      habilidad: item.habilidad || '',
      nivel_id: item.nivel_id || '',
      tipo_adecuacion: item.tipo_adecuacion || '',
      modalidad_sugerida: item.modalidad_sugerida || '',
      instrumento_sugerido: item.instrumento_sugerido || '',
      criterio_logro: item.criterio_logro || '',
    });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.habilidad.trim()) errors.habilidad = 'La habilidad es requerida';
    if (!formData.nivel_id) errors.nivel_id = 'El nivel es requerido';
    if (!formData.tipo_adecuacion) errors.tipo_adecuacion = 'El tipo de adecuación es requerido';
    if (!formData.modalidad_sugerida.trim()) errors.modalidad_sugerida = 'La modalidad es requerida';
    if (!formData.instrumento_sugerido.trim()) errors.instrumento_sugerido = 'El instrumento es requerido';
    if (!formData.criterio_logro.trim()) errors.criterio_logro = 'El criterio de logro es requerido';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/evaluaciones/${editId}`, formData);
        setAlert({ type: 'success', message: 'Evaluación actualizada' });
      } else {
        await api.post('/evaluaciones', formData);
        setAlert({ type: 'success', message: 'Evaluación creada' });
      }
      setFormModal(false);
      fetchItems(page);
    } catch (err) {
      const msg = extractApiErrors(err);
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.patch(`/evaluaciones/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Evaluación eliminada' });
      setDeleteModal({ open: false, id: null, label: '' });
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  const getNivelNombre = (id) => niveles.find((n) => n.id === id)?.nombre || '—';

  const filtered = search
    ? items.filter(
        (i) =>
          i.habilidad?.toLowerCase().includes(search.toLowerCase()) ||
          i.tipo_adecuacion?.toLowerCase().includes(search.toLowerCase()) ||
          i.modalidad_sugerida?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluaciones</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros — Sugerencias de evaluación diferenciada</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Evaluaciones"
            description="Registra instrumentos y modalidades de evaluación diferenciada para estudiantes con adecuaciones curriculares. Incluye criterios de logro, modalidad sugerida e instrumento de evaluación."
            meaning="Es donde se guardan las formas especiales de evaluar a estudiantes con PACI, como hacer una prueba oral en vez de escrita."
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva Evaluación
          </Button>
        </div>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por habilidad, tipo o modalidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="filter_tipo"
            placeholder="Todos los tipos"
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
            options={TIPO_ADECUACION_OPTIONS}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin evaluaciones"
          description={search ? 'No se encontraron resultados.' : 'Crea tu primera evaluación diferenciada.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva Evaluación
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Habilidad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nivel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Modalidad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Instrumento</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.habilidad}</td>
                  <td className="px-4 py-3 text-slate-600">{getNivelNombre(item.nivel_id)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.tipo_adecuacion === 'Significativa'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}>
                      {item.tipo_adecuacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={item.modalidad_sugerida}>
                    {item.modalidad_sugerida}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={item.instrumento_sugerido}>
                    {item.instrumento_sugerido}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, id: item.id, label: item.habilidad })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchItems(p)} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editId ? 'Editar Evaluación' : 'Nueva Evaluación'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Habilidad *"
            id="habilidad"
            value={formData.habilidad}
            onChange={(e) => setFormData({ ...formData, habilidad: e.target.value })}
            error={formErrors.habilidad}
            placeholder="Ej: Comprensión lectora"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Nivel *"
              id="nivel_id"
              placeholder="Seleccione nivel"
              value={formData.nivel_id}
              onChange={(e) => setFormData({ ...formData, nivel_id: e.target.value })}
              options={niveles.map((n) => ({ value: n.id, label: n.nombre }))}
              error={formErrors.nivel_id}
            />
            <Select
              label="Tipo de Adecuación *"
              id="tipo_adecuacion"
              placeholder="Seleccione tipo"
              value={formData.tipo_adecuacion}
              onChange={(e) => setFormData({ ...formData, tipo_adecuacion: e.target.value })}
              options={TIPO_ADECUACION_OPTIONS}
              error={formErrors.tipo_adecuacion}
            />
          </div>
          <TextArea
            label="Modalidad Sugerida *"
            id="modalidad_sugerida"
            value={formData.modalidad_sugerida}
            onChange={(e) => setFormData({ ...formData, modalidad_sugerida: e.target.value })}
            error={formErrors.modalidad_sugerida}
            placeholder="Ej: Evaluación oral con apoyo visual"
            rows={2}
          />
          <TextArea
            label="Instrumento Sugerido *"
            id="instrumento_sugerido"
            value={formData.instrumento_sugerido}
            onChange={(e) => setFormData({ ...formData, instrumento_sugerido: e.target.value })}
            error={formErrors.instrumento_sugerido}
            placeholder="Ej: Rúbrica adaptada con indicadores simplificados"
            rows={2}
          />
          <TextArea
            label="Criterio de Logro *"
            id="criterio_logro"
            value={formData.criterio_logro}
            onChange={(e) => setFormData({ ...formData, criterio_logro: e.target.value })}
            error={formErrors.criterio_logro}
            placeholder="Ej: Identifica al menos 3 de 5 elementos..."
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Evaluación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, label: '' })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de eliminar la evaluación <strong>{deleteModal.label}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: false, id: null, label: '' })}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
