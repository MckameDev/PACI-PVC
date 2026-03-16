import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus, Eye, FileText, Download } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import HelpButton from '../../components/ui/HelpButton';

export default function PaciListPage() {
  const navigate = useNavigate();
  const [pacis, setPacis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPacis = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/paci', { params: { page: p, limit: 10 } });
      const data = res.data.data;
      setPacis(data.items || []);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || 1);
    } catch {
      console.error('Error loading PACIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPacis(); }, [fetchPacis]);

  const formatMap = { Compacto: 'accent', Completo: 'primary', Modular: 'warning' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos PACI</h1>
          <p className="mt-1 text-sm text-secondary">Listado de todos los PACI generados</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton
            title="Documentos PACI"
            description="Muestra todos los Planes de Adecuación Curricular Individual (PACI) creados. Permite filtrar por estudiante, estado y curso, y acceder al detalle de cada PACI ya elaborado."
            meaning="Es donde están todos los planes de apoyo individuales (PACI). Puedes buscar el PACI de un estudiante específico y revisarlo."
          />
          <Link to="/paci/nuevo">
            <Button>
              <FilePlus className="h-4 w-4" /> Crear Nuevo PACI
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner className="h-64" size="lg" />
      ) : pacis.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos PACI"
          description="Crea tu primer PACI para comenzar a generar planes de adecuación curricular."
        >
          <Link to="/paci/nuevo">
            <Button size="sm"><FilePlus className="h-4 w-4" /> Crear PACI</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Estudiante</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">RUT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Formato</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">PAEC</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pacis.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.estudiante_nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{p.estudiante_rut}</td>
                  <td className="px-4 py-3 text-slate-600">{p.fecha_emision}</td>
                  <td className="px-4 py-3">
                    <Badge color={formatMap[p.formato_generado] || 'secondary'}>{p.formato_generado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={p.aplica_paec ? 'warning' : 'secondary'}>
                      {p.aplica_paec ? 'Sí' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/paci/${p.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/paci/${p.id}`, { state: { download: true } })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-success/10 hover:text-success transition-colors cursor-pointer"
                        title="Descargar PDF"
                      >
                        <Download className="h-4 w-4" />
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
        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchPacis(p)} />
      )}
    </div>
  );
}
