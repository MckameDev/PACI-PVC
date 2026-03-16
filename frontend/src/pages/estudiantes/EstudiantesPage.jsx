import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../stores/useAuthStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import HelpButton from '../../components/ui/HelpButton';

export default function EstudiantesPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchEstudiantes = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/estudiantes', { params: { page: p, limit: 10 } });
      const data = res.data.data;
      setEstudiantes(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      setAlert({ type: 'error', message: 'Error al cargar estudiantes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEstudiantes(); }, [fetchEstudiantes]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.patch(`/estudiantes/${deleteModal.id}`);
      setAlert({ type: 'success', message: 'Estudiante eliminado correctamente' });
      setDeleteModal({ open: false, id: null, nombre: '' });
      fetchEstudiantes(page);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Error al eliminar estudiante' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search
    ? estudiantes.filter(
        (e) =>
          e.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
          e.rut?.toLowerCase().includes(search.toLowerCase())
      )
    : estudiantes;

  const limiteEstudiantes = user?.limite_estudiantes ?? 5;
  const cupoLleno = total >= limiteEstudiantes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estudiantes</h1>
          <p className="mt-1 text-sm text-secondary">
            {total} de {limiteEstudiantes} cupos utilizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Estudiantes"
            description="Registra y gestiona los estudiantes del establecimiento. Permite ver el listado, agregar nuevos estudiantes con sus datos personales y familiares, y acceder a su ficha completa incluyendo diagnóstico PIE."
            meaning="Es la lista de todos los estudiantes del colegio. Desde aquí puedes ver su información, editarla o crear un nuevo PACI para ellos."
          />
          <Link to="/estudiantes/nuevo">
            <Button disabled={cupoLleno}>
              <Plus className="h-4 w-4" />
              Registrar Estudiante
            </Button>
          </Link>
        </div>
      </div>

      {cupoLleno && (
        <Alert
          type="warning"
          message={`Ha alcanzado el límite de ${limiteEstudiantes} estudiantes. Contacte al administrador para ampliar su cupo.`}
        />
      )}

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
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
          icon={Users}
          title="Sin estudiantes"
          description={search ? 'No se encontraron resultados para tu búsqueda.' : 'Registra tu primer estudiante para comenzar.'}
        >
          {!search && (
            <Link to="/estudiantes/nuevo">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Registrar Estudiante
              </Button>
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">RUT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Curso</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Diagnóstico</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo NEE</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{e.nombre_completo}</td>
                  <td className="px-4 py-3 text-slate-600">{e.rut}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.curso_nivel_nombre}{e.letra_nombre ? ` ${e.letra_nombre}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                    {e.diagnostico || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={e.tipo_nee === 'NEEP' ? 'danger' : 'accent'}>
                      {e.tipo_nee}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/estudiantes/${e.id}/editar`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, id: e.id, nombre: e.nombre_completo })}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchEstudiantes(p)} />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, nombre: '' })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de eliminar al estudiante <strong>{deleteModal.nombre}</strong>?
            Esta acción también eliminará todos sus PACIs asociados.
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
