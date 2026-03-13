import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, ListChecks } from 'lucide-react';
import api from '../../api/axios';
import { extractApiErrors } from '../../utils/validation';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import Badge from '../../components/ui/Badge';

const EMPTY_FORM = { oa_id: '', nivel_desempeno: '', texto_indicador: '' };

const NIVEL_DESEMP_OPTIONS = [
  { value: 'L', label: 'L — Logrado' },
  { value: 'ED', label: 'ED — En Desarrollo' },
  { value: 'NL', label: 'NL — No Logrado' },
];

const NIVEL_COLORS = { L: 'success', ED: 'warning', NL: 'danger' };

export default function IndicadoresPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Catalogues
  const [asignaturas, setAsignaturas] = useState([]);
  const [oaList, setOaList] = useState([]);
  const [loadingOa, setLoadingOa] = useState(false);

  // Filters
  const [filterAsig, setFilterAsig] = useState('');
  const [filterOa, setFilterOa] = useState('');

  // Form modal
  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // OA list for form
  const [formOaList, setFormOaList] = useState([]);
  const [formAsig, setFormAsig] = useState('');

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, label: '' });
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

  // Load OA list when filter asignatura changes
  useEffect(() => {
    if (!filterAsig) { setOaList([]); setFilterOa(''); return; }
    const load = async () => {
      setLoadingOa(true);
      try {
        const res = await api.get('/oa', { params: { asignatura_id: filterAsig, limit: 200 } });
        setOaList(res.data.data?.items || []);
      } catch { setOaList([]); }
      finally { setLoadingOa(false); }
    };
    load();
  }, [filterAsig]);

  // Load OA list for form when form asignatura changes
  useEffect(() => {
    if (!formAsig) { setFormOaList([]); return; }
    const load = async () => {
      try {
        const res = await api.get('/oa', { params: { asignatura_id: formAsig, limit: 200 } });
        setFormOaList(res.data.data?.items || []);
      } catch { setFormOaList([]); }
    };
    load();
  }, [formAsig]);

  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (filterOa) params.oa_id = filterOa;
      const res = await api.get('/indicadores', { params });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar indicadores' });
    } finally {
      setLoading(false);
    }
  }, [filterOa]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormAsig('');
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({
      oa_id: item.oa_id || '',
      nivel_desempeno: item.nivel_desempeno || '',
      texto_indicador: item.texto_indicador || '',
    });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.oa_id) errors.oa_id = 'El OA es requerido';
    if (!formData.nivel_desempeno) errors.nivel_desempeno = 'El nivel de desempeño es requerido';
    if (!formData.texto_indicador.trim()) errors.texto_indicador = 'El texto del indicador es requerido';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/indicadores/${editId}`, formData);
        setAlert({ type: 'success', message: 'Indicador actualizado' });
      } else {
        await api.post('/indicadores', formData);
        setAlert({ type: 'success', message: 'Indicador creado' });
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
      await api.patch(`/indicadores/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Indicador eliminado' });
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
          i.texto_indicador?.toLowerCase().includes(search.toLowerCase()) ||
          i.oa_codigo?.toLowerCase().includes(search.toLowerCase()) ||
          i.nivel_desempeno?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Indicadores de Evaluación</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros — Indicadores asociados a OA</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo Indicador
        </Button>
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
            placeholder="Buscar por texto, código OA o nivel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="filter_asig"
            placeholder="Filtrar por asignatura"
            value={filterAsig}
            onChange={(e) => { setFilterAsig(e.target.value); setFilterOa(''); setPage(1); }}
            options={asignaturas.map((a) => ({ value: a.id, label: a.nombre }))}
          />
        </div>
        {filterAsig && (
          <div className="w-full sm:w-64">
            <Select
              id="filter_oa"
              placeholder={loadingOa ? 'Cargando OAs...' : 'Filtrar por OA'}
              value={filterOa}
              onChange={(e) => { setFilterOa(e.target.value); setPage(1); }}
              options={oaList.map((o) => ({ value: o.id, label: `${o.codigo_oa || o.id_oa} — ${(o.texto_oa || '').substring(0, 50)}` }))}
              disabled={loadingOa}
            />
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sin indicadores"
          description={search ? 'No se encontraron resultados.' : 'Crea tu primer indicador de evaluación.'}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo Indicador
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Código OA</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nivel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Texto del Indicador</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{item.oa_codigo || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={NIVEL_COLORS[item.nivel_desempeno] || 'primary'}>
                      {item.nivel_desempeno}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-900 max-w-md">
                    <p className="line-clamp-2">{item.texto_indicador}</p>
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
                        onClick={() => setDeleteModal({ open: true, id: item.id, label: item.texto_indicador?.substring(0, 50) })}
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
        title={editId ? 'Editar Indicador' : 'Nuevo Indicador'}
        size="md"
      >
        <div className="space-y-4">
          {!editId && (
            <Select
              label="Asignatura (para filtrar OAs)"
              id="form_asig"
              placeholder="Seleccione asignatura"
              value={formAsig}
              onChange={(e) => { setFormAsig(e.target.value); setFormData({ ...formData, oa_id: '' }); }}
              options={asignaturas.map((a) => ({ value: a.id, label: a.nombre }))}
            />
          )}
          <Select
            label="Objetivo de Aprendizaje (OA) *"
            id="oa_id"
            placeholder={formOaList.length === 0 && !editId ? 'Seleccione asignatura primero' : 'Seleccione OA'}
            value={formData.oa_id}
            onChange={(e) => setFormData({ ...formData, oa_id: e.target.value })}
            options={(editId ? oaList.length > 0 ? oaList : formOaList : formOaList).map((o) => ({
              value: o.id,
              label: `${o.codigo_oa || o.id_oa} — ${(o.texto_oa || '').substring(0, 80)}`,
            }))}
            error={formErrors.oa_id}
          />
          <Select
            label="Nivel de Desempeño *"
            id="nivel_desempeno"
            placeholder="Seleccione nivel"
            value={formData.nivel_desempeno}
            onChange={(e) => setFormData({ ...formData, nivel_desempeno: e.target.value })}
            options={NIVEL_DESEMP_OPTIONS}
            error={formErrors.nivel_desempeno}
          />
          <TextArea
            label="Texto del Indicador *"
            id="texto_indicador"
            value={formData.texto_indicador}
            onChange={(e) => setFormData({ ...formData, texto_indicador: e.target.value })}
            error={formErrors.texto_indicador}
            placeholder="Ej: Identifica la idea principal de un texto informativo..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear Indicador'}
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
            ¿Está seguro de eliminar el indicador <strong>{deleteModal.label}...</strong>?
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
