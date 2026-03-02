import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import { validateCode, extractApiErrors } from '../../utils/validation';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';

const EMPTY_FORM = { nombre: '', codigo: '' };

export default function AsignaturasPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

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

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/asignaturas', { params: { page: p, limit: 15 } });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar asignaturas' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({ nombre: item.nombre || '', codigo: item.codigo || '' });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (formData.codigo) {
      const codeErr = validateCode(formData.codigo, 'El código');
      if (codeErr) errors.codigo = codeErr;
    }
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/asignaturas/${editId}`, formData);
        setAlert({ type: 'success', message: 'Asignatura actualizada' });
      } else {
        await api.post('/asignaturas', formData);
        setAlert({ type: 'success', message: 'Asignatura creada' });
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
      await api.patch(`/asignaturas/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Asignatura eliminada' });
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
          i.codigo?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asignaturas</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva Asignatura
        </Button>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin asignaturas"
          description={search ? 'No se encontraron resultados.' : 'Crea tu primera asignatura.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva Asignatura
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Creado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{item.codigo || '—'}</td>
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
        title={editId ? 'Editar Asignatura' : 'Nueva Asignatura'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nombre *"
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            error={formErrors.nombre}
            placeholder="Ej: Lenguaje y Comunicación"
          />
          <Input
            label="Código"
            id="codigo"
            value={formData.codigo}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            error={formErrors.codigo}
            placeholder="Ej: LEN"
          />
          {!formErrors.codigo && (
            <p className="text-xs text-slate-400 -mt-2">Solo letras, números y guiones (ej: LEN, MAT)</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Asignatura'}
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
            ¿Está seguro de eliminar la asignatura <strong>{deleteModal.nombre}</strong>?
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
