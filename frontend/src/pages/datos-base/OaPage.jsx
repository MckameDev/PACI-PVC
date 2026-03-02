import { useEffect, useState, useCallback, Fragment } from 'react';
import {
  Plus, Pencil, Trash2, Search, BookOpen, ChevronDown, ChevronRight, ListChecks,
} from 'lucide-react';
import api from '../../api/axios';
import { validateCode, extractApiErrors } from '../../utils/validation';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import Badge from '../../components/ui/Badge';

/* ───── empty form defaults ───── */
const EMPTY_OA = {
  id_oa: '', asignatura_id: '', nivel_trabajo_id: '', eje: '',
  tipo_oa: '', codigo_oa: '', texto_oa: '', habilidad_core: '',
  es_habilidad_estructural: false,
};

const EMPTY_IND = { oa_id: '', nivel_desempeno: '', texto_indicador: '' };

const TIPO_OA_OPTIONS = [
  { value: 'Prioritario', label: 'Prioritario' },
  { value: 'Complementario', label: 'Complementario' },
  { value: 'Transversal', label: 'Transversal' },
];

const NIVEL_DESEMP_OPTIONS = [
  { value: 'L', label: 'L — Logrado' },
  { value: 'ED', label: 'ED — En Desarrollo' },
  { value: 'NL', label: 'NL — No Logrado' },
];

export default function OaPage() {
  /* ═══════ OA LIST STATE ═══════ */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  /* ═══════ FILTER STATE ═══════ */
  const [filterAsig, setFilterAsig] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  /* ═══════ CATALOG (selects) ═══════ */
  const [asignaturas, setAsignaturas] = useState([]);
  const [niveles, setNiveles] = useState([]);

  /* ═══════ OA FORM MODAL ═══════ */
  const [formModal, setFormModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_OA);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* ═══════ DELETE MODAL ═══════ */
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, label: '' });
  const [deleting, setDeleting] = useState(false);

  /* ═══════ INDICADORES PANEL ═══════ */
  const [expandedOa, setExpandedOa] = useState(null);
  const [indicadores, setIndicadores] = useState([]);
  const [loadingInd, setLoadingInd] = useState(false);

  /* ═══════ IND FORM MODAL ═══════ */
  const [indModal, setIndModal] = useState(false);
  const [indForm, setIndForm] = useState(EMPTY_IND);
  const [indEditId, setIndEditId] = useState(null);
  const [indSaving, setIndSaving] = useState(false);
  const [indErrors, setIndErrors] = useState({});

  /* ═══════ IND DELETE MODAL ═══════ */
  const [indDeleteModal, setIndDeleteModal] = useState({ open: false, id: null, label: '' });
  const [indDeleting, setIndDeleting] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });

  /* ═══════ LOAD CATALOGS ═══════ */
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [asigRes, nivelRes] = await Promise.all([
          api.get('/asignaturas', { params: { limit: 200 } }),
          api.get('/cursos-niveles', { params: { limit: 200 } }),
        ]);
        setAsignaturas(asigRes.data.data.items || []);
        setNiveles(nivelRes.data.data.items || []);
      } catch { /* silent */ }
    };
    loadCatalogs();
  }, []);

  /* ═══════ FETCH OAs ═══════ */
  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filterAsig) params.asignatura_id = filterAsig;
      if (filterNivel) params.nivel_trabajo_id = filterNivel;
      if (filterTipo) params.tipo_oa = filterTipo;
      const res = await api.get('/oa', { params });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar objetivos de aprendizaje' });
    } finally {
      setLoading(false);
    }
  }, [filterAsig, filterNivel, filterTipo]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ═══════ OA CRUD ═══════ */
  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_OA);
    setFormErrors({});
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({
      id_oa: item.id_oa || '',
      asignatura_id: item.asignatura_id || '',
      nivel_trabajo_id: item.nivel_trabajo_id || '',
      eje: item.eje || '',
      tipo_oa: item.tipo_oa || '',
      codigo_oa: item.codigo_oa || '',
      texto_oa: item.texto_oa || '',
      habilidad_core: item.habilidad_core || '',
      es_habilidad_estructural: !!item.es_habilidad_estructural,
    });
    setFormErrors({});
    setFormModal(true);
  };

  const handleSave = async () => {
    const errors = {};
    if (!formData.id_oa.trim()) errors.id_oa = 'El ID OA es requerido';
    else {
      const codeErr = validateCode(formData.id_oa, 'El ID OA');
      if (codeErr) errors.id_oa = codeErr;
    }
    if (formData.codigo_oa) {
      const codErr = validateCode(formData.codigo_oa, 'El Código OA');
      if (codErr) errors.codigo_oa = codErr;
    }
    if (!formData.asignatura_id) errors.asignatura_id = 'La asignatura es requerida';
    if (!formData.nivel_trabajo_id) errors.nivel_trabajo_id = 'El nivel es requerido';
    if (!formData.texto_oa.trim()) errors.texto_oa = 'El texto del OA es requerido';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    // Limpiar campos vacíos opcionales para evitar errores de validación backend
    const payload = {};
    for (const [key, val] of Object.entries(formData)) {
      if (key === 'es_habilidad_estructural') {
        payload[key] = val ? 1 : 0;
      } else if (val !== '' && val !== null && val !== undefined) {
        payload[key] = val;
      }
    }
    // Siempre incluir campos requeridos
    payload.id_oa = formData.id_oa;
    payload.asignatura_id = formData.asignatura_id;
    payload.nivel_trabajo_id = formData.nivel_trabajo_id;
    payload.texto_oa = formData.texto_oa;

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/oa/${editId}`, payload);
        setAlert({ type: 'success', message: 'OA actualizado correctamente' });
      } else {
        await api.post('/oa', payload);
        setAlert({ type: 'success', message: 'OA creado correctamente' });
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
      await api.patch(`/oa/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'OA eliminado' });
      setDeleteModal({ open: false, id: null, label: '' });
      if (expandedOa === deleteModal.id) setExpandedOa(null);
      fetchItems(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  /* ═══════ INDICADORES ═══════ */
  const toggleExpand = async (oaId) => {
    if (expandedOa === oaId) { setExpandedOa(null); return; }
    setExpandedOa(oaId);
    setLoadingInd(true);
    try {
      const res = await api.get('/indicadores', { params: { oa_id: oaId, limit: 200 } });
      setIndicadores(res.data.data.items || []);
    } catch {
      setIndicadores([]);
    } finally {
      setLoadingInd(false);
    }
  };

  const refreshIndicadores = async (oaId) => {
    try {
      const res = await api.get('/indicadores', { params: { oa_id: oaId, limit: 200 } });
      setIndicadores(res.data.data.items || []);
    } catch { /* silent */ }
  };

  const openCreateInd = (oaId) => {
    setIndEditId(null);
    setIndForm({ ...EMPTY_IND, oa_id: oaId });
    setIndErrors({});
    setIndModal(true);
  };

  const openEditInd = (ind) => {
    setIndEditId(ind.id);
    setIndForm({
      oa_id: ind.oa_id,
      nivel_desempeno: ind.nivel_desempeno || '',
      texto_indicador: ind.texto_indicador || '',
    });
    setIndErrors({});
    setIndModal(true);
  };

  const handleSaveInd = async () => {
    const errors = {};
    if (!indForm.nivel_desempeno) errors.nivel_desempeno = 'El nivel de desempeño es requerido';
    if (!indForm.texto_indicador.trim()) errors.texto_indicador = 'El texto del indicador es requerido';
    if (Object.keys(errors).length) { setIndErrors(errors); return; }

    setIndSaving(true);
    try {
      if (indEditId) {
        await api.put(`/indicadores/${indEditId}`, indForm);
        setAlert({ type: 'success', message: 'Indicador actualizado' });
      } else {
        await api.post('/indicadores', indForm);
        setAlert({ type: 'success', message: 'Indicador creado' });
      }
      setIndModal(false);
      refreshIndicadores(indForm.oa_id);
    } catch (err) {
      setAlert({ type: 'error', message: extractApiErrors(err) });
    } finally {
      setIndSaving(false);
    }
  };

  const handleDeleteInd = async () => {
    setIndDeleting(true);
    try {
      await api.patch(`/indicadores/${indDeleteModal.id}`);
      setAlert({ type: 'success', message: 'Indicador eliminado' });
      setIndDeleteModal({ open: false, id: null, label: '' });
      refreshIndicadores(expandedOa);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar indicador' });
    } finally {
      setIndDeleting(false);
    }
  };

  /* ═══════ LOCAL SEARCH ═══════ */
  const filtered = search
    ? items.filter(
        (i) =>
          i.id_oa?.toLowerCase().includes(search.toLowerCase()) ||
          i.codigo_oa?.toLowerCase().includes(search.toLowerCase()) ||
          i.texto_oa?.toLowerCase().includes(search.toLowerCase()) ||
          i.asignatura_nombre?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  /* ═══════ HELPERS ═══════ */
  const asigOptions = asignaturas.map((a) => ({ value: a.id, label: a.nombre }));
  const nivelOptions = niveles.map((n) => ({ value: n.id, label: n.nombre }));

  const nivelBadge = (nd) => {
    if (nd === 'L') return 'success';
    if (nd === 'ED') return 'warning';
    return 'danger';
  };

  /* ═══════ RENDER ═══════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Objetivos de Aprendizaje</h1>
          <p className="mt-1 text-sm text-secondary">{total} registros</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo OA
        </Button>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, código o texto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Select
          id="filterAsig"
          placeholder="Todas las asignaturas"
          options={asigOptions}
          value={filterAsig}
          onChange={(e) => { setFilterAsig(e.target.value); setPage(1); }}
          className="min-w-[180px]"
        />
        <Select
          id="filterNivel"
          placeholder="Todos los niveles"
          options={nivelOptions}
          value={filterNivel}
          onChange={(e) => { setFilterNivel(e.target.value); setPage(1); }}
          className="min-w-[160px]"
        />
        <Select
          id="filterTipo"
          placeholder="Todo tipo OA"
          options={TIPO_OA_OPTIONS}
          value={filterTipo}
          onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
          className="min-w-[150px]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin objetivos de aprendizaje"
          description={search || filterAsig || filterNivel || filterTipo ? 'No se encontraron resultados con los filtros aplicados.' : 'Crea tu primer objetivo de aprendizaje.'}
        >
          {!search && !filterAsig && !filterNivel && !filterTipo && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo OA
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">ID OA</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 max-w-[300px]">Texto OA</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asignatura</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nivel</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Eje</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">H. Estruct.</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <Fragment key={item.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        title="Ver indicadores"
                      >
                        {expandedOa === item.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.id_oa}</td>
                    <td className="px-4 py-3 text-slate-600">{item.codigo_oa || '—'}</td>
                    <td className="px-4 py-3 text-slate-900 max-w-[300px] truncate" title={item.texto_oa}>
                      {item.texto_oa}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.asignatura_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.nivel_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      {item.tipo_oa
                        ? <Badge color={item.tipo_oa === 'Prioritario' ? 'accent' : item.tipo_oa === 'Complementario' ? 'primary' : 'secondary'}>{item.tipo_oa}</Badge>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.eje || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.es_habilidad_estructural
                        ? <Badge color="success">Sí</Badge>
                        : <span className="text-slate-400">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          title="Indicadores"
                        >
                          <ListChecks className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, id: item.id, label: item.id_oa })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded indicadores row */}
                  {expandedOa === item.id && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-primary" />
                              Indicadores de evaluación — {item.id_oa}
                            </h4>
                            <Button size="sm" onClick={() => openCreateInd(item.id)}>
                              <Plus className="h-3.5 w-3.5" /> Agregar Indicador
                            </Button>
                          </div>

                          {loadingInd ? (
                            <Spinner className="h-20" />
                          ) : indicadores.length === 0 ? (
                            <p className="text-sm text-slate-400 italic py-4 text-center">
                              No hay indicadores registrados para este OA.
                            </p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="px-3 py-2 text-left font-medium text-slate-600 w-28">Nivel</th>
                                  <th className="px-3 py-2 text-left font-medium text-slate-600">Texto del Indicador</th>
                                  <th className="px-3 py-2 text-center font-medium text-slate-600 w-24">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {indicadores.map((ind) => (
                                  <tr key={ind.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2">
                                      <Badge color={nivelBadge(ind.nivel_desempeno)}>
                                        {ind.nivel_desempeno}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">{ind.texto_indicador}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => openEditInd(ind)}
                                          className="rounded p-1 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                                          title="Editar"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setIndDeleteModal({ open: true, id: ind.id, label: ind.nivel_desempeno })}
                                          className="rounded p-1 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchItems(p)} />
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* OA Create/Edit Modal                          */}
      {/* ══════════════════════════════════════════════ */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editId ? 'Editar Objetivo de Aprendizaje' : 'Nuevo Objetivo de Aprendizaje'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="ID OA *"
                id="id_oa"
                value={formData.id_oa}
                onChange={(e) => setFormData({ ...formData, id_oa: e.target.value })}
                error={formErrors.id_oa}
                placeholder="Ej: OA1"
              />
              <p className="mt-1 text-xs text-slate-400">Solo letras, números, guiones y puntos</p>
            </div>
            <div>
              <Input
                label="Código OA"
                id="codigo_oa"
                value={formData.codigo_oa}
                onChange={(e) => setFormData({ ...formData, codigo_oa: e.target.value })}
                error={formErrors.codigo_oa}
                placeholder="Ej: LEN-OA1"
              />
              <p className="mt-1 text-xs text-slate-400">Formato: ASIG-OA# (ej: LEN-OA1, MAT-OA3)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Asignatura *"
              id="asignatura_id"
              placeholder="Seleccione asignatura"
              options={asigOptions}
              value={formData.asignatura_id}
              onChange={(e) => setFormData({ ...formData, asignatura_id: e.target.value })}
              error={formErrors.asignatura_id}
            />
            <Select
              label="Nivel de Trabajo *"
              id="nivel_trabajo_id"
              placeholder="Seleccione nivel"
              options={nivelOptions}
              value={formData.nivel_trabajo_id}
              onChange={(e) => setFormData({ ...formData, nivel_trabajo_id: e.target.value })}
              error={formErrors.nivel_trabajo_id}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo OA"
              id="tipo_oa"
              placeholder="Seleccione tipo"
              options={TIPO_OA_OPTIONS}
              value={formData.tipo_oa}
              onChange={(e) => setFormData({ ...formData, tipo_oa: e.target.value })}
            />
            <Input
              label="Eje"
              id="eje"
              value={formData.eje}
              onChange={(e) => setFormData({ ...formData, eje: e.target.value })}
              placeholder="Ej: Lectura"
            />
          </div>

          <TextArea
            label="Texto del OA *"
            id="texto_oa"
            rows={3}
            value={formData.texto_oa}
            onChange={(e) => setFormData({ ...formData, texto_oa: e.target.value })}
            error={formErrors.texto_oa}
            placeholder="Describa el objetivo de aprendizaje..."
          />

          <Input
            label="Habilidad Core"
            id="habilidad_core"
            value={formData.habilidad_core}
            onChange={(e) => setFormData({ ...formData, habilidad_core: e.target.value })}
            placeholder="Ej: Comprensión lectora"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.es_habilidad_estructural}
              onChange={(e) => setFormData({ ...formData, es_habilidad_estructural: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-slate-700">Es habilidad estructural</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editId ? 'Guardar Cambios' : 'Crear OA'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════ */}
      {/* OA Delete Modal                               */}
      {/* ══════════════════════════════════════════════ */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, label: '' })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de eliminar el OA <strong>{deleteModal.label}</strong>? Sus indicadores asociados también dejarán de estar activos.
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

      {/* ══════════════════════════════════════════════ */}
      {/* Indicador Create/Edit Modal                   */}
      {/* ══════════════════════════════════════════════ */}
      <Modal
        open={indModal}
        onClose={() => setIndModal(false)}
        title={indEditId ? 'Editar Indicador' : 'Nuevo Indicador'}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Nivel de Desempeño *"
            id="nivel_desempeno"
            placeholder="Seleccione nivel"
            options={NIVEL_DESEMP_OPTIONS}
            value={indForm.nivel_desempeno}
            onChange={(e) => setIndForm({ ...indForm, nivel_desempeno: e.target.value })}
            error={indErrors.nivel_desempeno}
          />

          <TextArea
            label="Texto del Indicador *"
            id="texto_indicador"
            rows={3}
            value={indForm.texto_indicador}
            onChange={(e) => setIndForm({ ...indForm, texto_indicador: e.target.value })}
            error={indErrors.texto_indicador}
            placeholder="Describa el indicador de evaluación..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIndModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={indSaving} onClick={handleSaveInd}>
              {indEditId ? 'Guardar Cambios' : 'Crear Indicador'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════ */}
      {/* Indicador Delete Modal                        */}
      {/* ══════════════════════════════════════════════ */}
      <Modal
        open={indDeleteModal.open}
        onClose={() => setIndDeleteModal({ open: false, id: null, label: '' })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de eliminar el indicador <strong>{indDeleteModal.label}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIndDeleteModal({ open: false, id: null, label: '' })}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={indDeleting} onClick={handleDeleteInd}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
