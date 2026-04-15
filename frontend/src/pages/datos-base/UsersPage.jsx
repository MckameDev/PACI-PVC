import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, UserCog, Shield } from 'lucide-react';
import api from '../../api/axios';
import { validateEmail, extractApiErrors } from '../../utils/validation';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import SearchSelect from '../../components/ui/SearchSelect';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import HelpButton from '../../components/ui/HelpButton';
import Input from '../../components/ui/Input';

const ROLES = [
  { value: 'Admin', label: 'Administrador' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'Docente', label: 'Docente' },
  { value: 'Especialista', label: 'Especialista' },
];

const ROLE_COLORS = {
  Admin: 'danger',
  Coordinador: 'success',
  Docente: 'primary',
  Especialista: 'warning',
};

const EMPTY_FORM = { nombre: '', email: '', password: '', rol: 'Docente', limite_estudiantes: '5', establecimiento_id: '', profesor_especialidad: '', profesor_cargo: '', paec_habilitado: '0' };

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });
  const [establecimientos, setEstablecimientos] = useState([]);

  const fetchEstablecimientos = useCallback(async () => {
    try {
      const res = await api.get('/establecimientos', { params: { limit: 200 } });
      setEstablecimientos(res.data.data?.items || []);
    } catch { /* ignore */ }
  }, []);

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page: p, limit: 15 } });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar usuarios' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); fetchEstablecimientos(); }, [fetchItems, fetchEstablecimientos]);

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({
      nombre: item.nombre || '',
      email: item.email || '',
      password: '',
      rol: item.rol || 'Docente',
      limite_estudiantes: item.limite_estudiantes?.toString() || '5',
      establecimiento_id: item.establecimiento_id || '',
      profesor_especialidad: item.profesor_especialidad || '',
      profesor_cargo: item.profesor_cargo || '',
      paec_habilitado: item.paec_habilitado?.toString() || '0',
    });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    const emailErr = validateEmail(formData.email);
    if (emailErr) errors.email = emailErr;
    if (!editId && !formData.password) errors.password = 'La contraseña es requerida';
    if (formData.password && formData.password.length < 6) errors.password = 'Mínimo 6 caracteres';
    if (!formData.rol) errors.rol = 'El rol es requerido';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        limite_estudiantes: parseInt(formData.limite_estudiantes, 10) || 5,
        establecimiento_id: formData.establecimiento_id || null,
        paec_habilitado: parseInt(formData.paec_habilitado, 10) || 0,
      };
      if (formData.password) payload.password = formData.password;
      if (formData.rol === 'Docente' || formData.rol === 'Especialista') {
        payload.profesor_especialidad = formData.profesor_especialidad || null;
        payload.profesor_cargo = formData.profesor_cargo || null;
      }

      if (editId) {
        await api.put(`/users/${editId}`, payload);
        setAlert({ type: 'success', message: 'Usuario actualizado' });
      } else {
        await api.post('/users', payload);
        setAlert({ type: 'success', message: 'Usuario creado' });
      }
      setFormModal(false);
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: extractApiErrors(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.patch(`/users/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Usuario eliminado' });
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
          i.email?.toLowerCase().includes(search.toLowerCase()) ||
          i.rol?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-secondary">{total} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Gestión de Usuarios"
            description="Gestiona las cuentas de usuario del sistema. Permite crear usuarios con roles (Admin o Docente), asignarles establecimiento y activar o desactivar cuentas."
            meaning="Es donde el administrador crea y controla quién puede entrar al sistema y qué puede hacer dentro de él."
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol..."
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
          icon={UserCog}
          title="Sin usuarios"
          description={search ? 'No se encontraron resultados.' : 'Crea tu primer usuario.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Rol</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Establecimiento</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Límite Est.</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Creado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {item.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      {item.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={ROLE_COLORS[item.rol] || 'secondary'}>
                      {item.rol === 'Admin' && <Shield className="inline h-3 w-3 mr-1" />}
                      {item.rol}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.establecimiento_nombre || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{item.limite_estudiantes}</td>
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
        title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre completo *"
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            error={formErrors.nombre}
            placeholder="Ej: María González"
          />
          <Input
            label="Email *"
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            placeholder="Ej: maria@escuela.cl"
          />
          <Input
            label={editId ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
            placeholder={editId ? '••••••' : 'Mínimo 6 caracteres'}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Rol *"
              id="rol"
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              options={ROLES}
              error={formErrors.rol}
            />
            <Input
              label="Límite de estudiantes"
              id="limite_estudiantes"
              type="number"
              value={formData.limite_estudiantes}
              onChange={(e) => setFormData({ ...formData, limite_estudiantes: e.target.value })}
              placeholder="5"
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label htmlFor="paec_habilitado" className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                id="paec_habilitado"
                type="checkbox"
                checked={formData.paec_habilitado === '1' || formData.paec_habilitado === 1}
                onChange={(e) => setFormData({ ...formData, paec_habilitado: e.target.checked ? '1' : '0' })}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
              />
              Habilitar PAEC
            </label>
            <span className="text-xs text-slate-500">Permite al usuario acceder a la sección PAEC en el formulario PACI</span>
          </div>
          <SearchSelect
            label="Establecimiento"
            id="establecimiento_id"
            placeholder="Seleccione establecimiento"
            value={formData.establecimiento_id}
            onChange={(val) => setFormData({ ...formData, establecimiento_id: val })}
            options={establecimientos.map((e) => ({ value: e.id, label: e.nombre }))}
            error={formErrors.establecimiento_id}
          />
          {(formData.rol === 'Docente' || formData.rol === 'Especialista') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="col-span-full text-xs font-medium text-primary">Datos de Profesor (se creará registro automáticamente)</p>
              <Input
                label="Especialidad"
                id="profesor_especialidad"
                placeholder="Ej: Educación Diferencial"
                value={formData.profesor_especialidad}
                onChange={(e) => setFormData({ ...formData, profesor_especialidad: e.target.value })}
              />
              <Input
                label="Cargo"
                id="profesor_cargo"
                placeholder="Ej: Profesora PIE"
                value={formData.profesor_cargo}
                onChange={(e) => setFormData({ ...formData, profesor_cargo: e.target.value })}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Usuario'}
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
            ¿Está seguro de eliminar al usuario <strong>{deleteModal.nombre}</strong>?
            El usuario no podrá iniciar sesión.
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
