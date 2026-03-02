import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Type } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';

export default function LetrasPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState({ letra: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/letras', { params: { page: p, limit: 30 } });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar letras' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData({ letra: '' });
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({ letra: item.letra || '' });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.letra.trim()) errors.letra = 'La letra es requerida';
    else if (formData.letra.trim().length > 1) errors.letra = 'Solo se permite un carácter';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const payload = { letra: formData.letra.trim().toUpperCase() };
      if (editId) {
        await api.put(`/letras/${editId}`, payload);
        setAlert({ type: 'success', message: 'Letra actualizada' });
      } else {
        await api.post('/letras', payload);
        setAlert({ type: 'success', message: 'Letra creada' });
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
      await api.patch(`/letras/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Letra eliminada' });
      setDeleteModal({ open: false, id: null, nombre: '' });
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Letras de Curso</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva Letra
        </Button>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Grid of letters */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Type}
          title="Sin letras"
          description="Crea tu primera letra de curso (A, B, C...)."
        >
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva Letra
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <span className="text-3xl font-bold text-primary">{item.letra}</span>
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded p-1 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, id: item.id, nombre: item.letra })}
                  className="rounded p-1 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchItems(p)} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editId ? 'Editar Letra' : 'Nueva Letra'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Letra *"
            id="letra"
            value={formData.letra}
            onChange={(e) => setFormData({ letra: e.target.value.slice(0, 1).toUpperCase() })}
            error={formErrors.letra}
            placeholder="Ej: A"
            maxLength={1}
          />
          <p className="text-xs text-slate-500">
            Se permite un solo carácter. Se convertirá automáticamente a mayúscula.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Letra'}
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
            ¿Está seguro de eliminar la letra <strong>{deleteModal.nombre}</strong>?
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
