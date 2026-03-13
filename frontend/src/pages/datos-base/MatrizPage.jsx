/**
 * MatrizPage — generic reusable CRUD panel for all pedagogy matrices.
 * Renders a search bar + table + create/edit/delete modals.
 * Used as a tab panel inside MatricesAdminPage.
 *
 * Props:
 *   title       string        — matrix human name (for empty state / modals)
 *   icon        LucideIcon    — icon for empty state
 *   apiPath     string        — backend path, e.g. /matrices/barreras
 *   tableColumns Array<{ key, label, truncate? }>
 *   formFields  Array<{ name, label, type: 'text'|'textarea'|'select', required?, options? }>
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';

export default function MatrizPage({ title, icon: Icon, apiPath, tableColumns, formFields }) {
  const emptyForm = Object.fromEntries(formFields.map((f) => [f.name, '']));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchItems = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await api.get(apiPath, { params: { page: p, limit: 15 } });
        const data = res.data.data;
        setItems(data.items || data.data || []);
        setTotalPages(data.total_pages || 1);
        setTotal(data.total || 0);
        setPage(data.page || p);
      } catch {
        setAlert({ type: 'error', message: 'Error al cargar datos' });
      } finally {
        setLoading(false);
      }
    },
    [apiPath]
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData({ ...emptyForm });
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    const fd = {};
    formFields.forEach((f) => {
      fd[f.name] = item[f.name] ?? '';
    });
    setFormData(fd);
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    formFields
      .filter((f) => f.required)
      .forEach((f) => {
        if (!formData[f.name]?.toString().trim()) {
          errors[f.name] = `${f.label.replace(' *', '')} es requerido`;
        }
      });
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`${apiPath}/${editId}`, formData);
        setAlert({ type: 'success', message: 'Registro actualizado' });
      } else {
        await api.post(apiPath, formData);
        setAlert({ type: 'success', message: 'Registro creado' });
      }
      setFormModal(false);
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.patch(`${apiPath}/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Registro eliminado' });
      setDeleteModal({ open: false, id: null, nombre: '' });
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search
    ? items.filter((i) =>
        Object.values(i).some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary">{total} registros</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {/* Table */}
      {loading ? (
        <Spinner className="h-48" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={`Sin ${title}`}
          description={search ? 'Sin resultados para la búsqueda.' : 'Crea el primer registro.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {tableColumns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-slate-700">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {tableColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-slate-700 ${col.truncate ? 'max-w-xs truncate' : ''}`}
                    >
                      {item[col.key] || '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({ open: true, id: item.id, nombre: item.nombre })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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

      {/* Create / Edit Modal */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editId ? `Editar — ${title}` : `Nuevo — ${title}`}
      >
        <div className="space-y-4">
          {formFields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <TextArea
                  key={field.name}
                  label={field.label}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  error={formErrors[field.name]}
                  rows={3}
                />
              );
            }
            if (field.type === 'select') {
              return (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Seleccione...</option>
                    {field.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  {formErrors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">{formErrors[field.name]}</p>
                  )}
                </div>
              );
            }
            return (
              <Input
                key={field.name}
                label={field.label}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                error={formErrors[field.name]}
              />
            );
          })}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear'}
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
            ¿Está seguro de eliminar <strong>{deleteModal.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModal({ open: false, id: null, nombre: '' })}
            >
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
