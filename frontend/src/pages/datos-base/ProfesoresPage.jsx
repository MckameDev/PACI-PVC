import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, UserCheck } from 'lucide-react';
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

const EMPTY_FORM = { user_id: '', establecimiento_id: '', especialidad: '', cargo: '' };

export default function ProfesoresPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Catalogues
  const [usuarios, setUsuarios] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [filterEstab, setFilterEstab] = useState('');

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
        const [usersRes, estabRes] = await Promise.all([
          api.get('/users', { params: { limit: 200 } }),
          api.get('/establecimientos', { params: { limit: 200 } }),
        ]);
        setUsuarios(usersRes.data.data?.items || []);
        setEstablecimientos(estabRes.data.data?.items || []);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (filterEstab) params.establecimiento_id = filterEstab;
      const res = await api.get('/profesores', { params });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar profesores' });
    } finally {
      setLoading(false);
    }
  }, [filterEstab]);

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
      user_id: item.user_id || '',
      establecimiento_id: item.establecimiento_id || '',
      especialidad: item.especialidad || '',
      cargo: item.cargo || '',
    });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.user_id) errors.user_id = 'El usuario es requerido';
    if (!formData.establecimiento_id) errors.establecimiento_id = 'El establecimiento es requerido';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/profesores/${editId}`, formData);
        setAlert({ type: 'success', message: 'Profesor actualizado' });
      } else {
        await api.post('/profesores', formData);
        setAlert({ type: 'success', message: 'Profesor creado' });
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
      await api.patch(`/profesores/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Profesor eliminado' });
      setDeleteModal({ open: false, id: null, label: '' });
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
          i.usuario_nombre?.toLowerCase().includes(search.toLowerCase()) ||
          i.usuario_email?.toLowerCase().includes(search.toLowerCase()) ||
          i.especialidad?.toLowerCase().includes(search.toLowerCase()) ||
          i.cargo?.toLowerCase().includes(search.toLowerCase()) ||
          i.establecimiento_nombre?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profesores</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros — Profesores vinculados a usuarios</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Profesores"
            description="Registra y administra los profesores del establecimiento. Incluye su nombre completo, RUT y estado de actividad. Los profesores pueden ser vinculados a PACI y asignaturas."
            meaning="Es la lista de profesores del colegio registrados en el sistema. Aquí puedes agregar, editar o desactivar profesores."
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo Profesor
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
            placeholder="Buscar por nombre, email, especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            id="filter_estab"
            placeholder="Todos los establecimientos"
            value={filterEstab}
            onChange={(e) => { setFilterEstab(e.target.value); setPage(1); }}
            options={establecimientos.map((e) => ({ value: e.id, label: e.nombre }))}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Sin profesores"
          description={search ? 'No se encontraron resultados.' : 'Registra tu primer profesor.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo Profesor
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Establecimiento</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Especialidad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Cargo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.usuario_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.usuario_email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.establecimiento_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.especialidad || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.cargo || '—'}</td>
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
                        onClick={() => setDeleteModal({ open: true, id: item.id, label: item.usuario_nombre || item.id })}
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
        title={editId ? 'Editar Profesor' : 'Nuevo Profesor'}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Usuario *"
            id="user_id"
            placeholder="Seleccione usuario"
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            options={usuarios.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` }))}
            error={formErrors.user_id}
          />
          <Select
            label="Establecimiento *"
            id="establecimiento_id"
            placeholder="Seleccione establecimiento"
            value={formData.establecimiento_id}
            onChange={(e) => setFormData({ ...formData, establecimiento_id: e.target.value })}
            options={establecimientos.map((e) => ({ value: e.id, label: e.nombre }))}
            error={formErrors.establecimiento_id}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Especialidad"
              id="especialidad"
              value={formData.especialidad}
              onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
              placeholder="Ej: Educación Diferencial"
            />
            <Input
              label="Cargo"
              id="cargo"
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              placeholder="Ej: Educador/a Diferencial"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Profesor'}
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
            ¿Está seguro de eliminar el profesor <strong>{deleteModal.label}</strong>?
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
