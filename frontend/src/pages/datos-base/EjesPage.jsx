import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Layers } from 'lucide-react';
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

const EMPTY_FORM = { asignatura_id: '', nombre: '' };

export default function EjesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Catalogues
  const [asignaturas, setAsignaturas] = useState([]);
  const [filterAsig, setFilterAsig] = useState('');

  // Form modal
  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });

  // Load catalogues
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/asignaturas', { params: { limit: 200 } });
        setAsignaturas(res.data.data?.items || []);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (filterAsig) params.asignatura_id = filterAsig;
      const res = await api.get('/ejes', { params });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar ejes' });
    } finally {
      setLoading(false);
    }
  }, [filterAsig]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({ asignatura_id: item.asignatura_id || '', nombre: item.nombre || '' });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formData.asignatura_id) errors.asignatura_id = 'La asignatura es requerida';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/ejes/${editId}`, formData);
        setAlert({ type: 'success', message: 'Eje actualizado' });
      } else {
        await api.post('/ejes', formData);
        setAlert({ type: 'success', message: 'Eje creado' });
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
      await api.patch(`/ejes/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Eje eliminado' });
      setDeleteModal({ open: false, id: null, nombre: '' });
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search
    ? items.filter(
        (i) =>
          i.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          i.asignatura_nombre?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ejes</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros — Catálogo de ejes por asignatura</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Ejes"
            description="Administra los ejes temáticos de cada asignatura (ej: Lectura, Escritura, Comunicación Oral en Lenguaje). Los ejes organizan los OA dentro de cada asignatura para facilitar la búsqueda y filtrado."
            meaning="Son las grandes áreas dentro de una materia. Por ejemplo, en Lenguaje los ejes son Lectura, Escritura y Comunicación Oral. Sirven para organizar mejor los aprendizajes."
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo Eje
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
            placeholder="Buscar por nombre o asignatura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            id="filter_asig"
            placeholder="Todas las asignaturas"
            value={filterAsig}
            onChange={(e) => { setFilterAsig(e.target.value); setPage(1); }}
            options={asignaturas.map((a) => ({ value: a.id, label: a.nombre }))}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin ejes"
          description={search ? 'No se encontraron resultados.' : 'Crea tu primer eje para una asignatura.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo Eje
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asignatura</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Creado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{item.asignatura_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('es-CL') : '—'}
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
                        onClick={() => setDeleteModal({ open: true, id: item.id, nombre: item.nombre })}
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
        title={editId ? 'Editar Eje' : 'Nuevo Eje'}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Asignatura *"
            id="asignatura_id"
            placeholder="Seleccione asignatura"
            value={formData.asignatura_id}
            onChange={(e) => setFormData({ ...formData, asignatura_id: e.target.value })}
            options={asignaturas.map((a) => ({ value: a.id, label: a.nombre }))}
            error={formErrors.asignatura_id}
          />
          <Input
            label="Nombre del Eje *"
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            error={formErrors.nombre}
            placeholder="Ej: Lectura, Números y Operaciones"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Eje'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, nombre: '' })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de eliminar el eje <strong>{deleteModal.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: false, id: null, nombre: '' })}>
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
