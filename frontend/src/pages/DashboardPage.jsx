import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, FileText, CalendarDays, FilePlus, UserPlus, ArrowRight, Download, Eye } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import api from '../api/axios';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import HelpButton from '../components/ui/HelpButton';
import { generatePaciPdf } from '../services/pdfService';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentPacis, setRecentPacis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      fetchMe().catch(() => {});

      try {
        const [estudiantesRes, paciRes] = await Promise.all([
          api.get('/estudiantes', { params: { limit: 1 } }),
          api.get('/paci', { params: { limit: 5 } }),
        ]);

        const paciData = paciRes.data.data;
        setStats({
          totalEstudiantes: estudiantesRes.data.data?.total ?? 0,
          limiteEstudiantes: user?.limite_estudiantes ?? 5,
          totalPaci: paciData?.total ?? 0,
        });
        setRecentPacis(paciData?.items || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setStats({
          totalEstudiantes: 0,
          limiteEstudiantes: user?.limite_estudiantes ?? 5,
          totalPaci: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadPdf = async (paciId) => {
    try {
      const res = await api.get(`/paci/${paciId}`);
      generatePaciPdf(res.data.data);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  if (loading) {
    return <Spinner className="h-64" size="lg" />;
  }

  const usagePercent = stats
    ? Math.min(100, Math.round((stats.totalEstudiantes / stats.limiteEstudiantes) * 100))
    : 0;

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bienvenido, {user?.nombre || 'Usuario'}
          </h1>
          <p className="mt-1 text-sm text-secondary capitalize">{today}</p>
        </div>
        <HelpButton
          title="Inicio / Dashboard"
          description="Muestra un resumen general del estado del sistema: total de estudiantes, PACI activos, próximos vencimientos y alertas. Da una vista rápida del establecimiento para el usuario autenticado."
          meaning="Es la pantalla de inicio. Te muestra un resumen de todo lo que pasa en el sistema para que sepas rápidamente qué atender."
        />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        <StatCard
          icon={Users}
          label="Estudiantes Registrados"
          value={`${stats?.totalEstudiantes ?? 0} / ${stats?.limiteEstudiantes ?? 0}`}
          subtitle={`${usagePercent}% del límite utilizado`}
          color="primary"
        />
        <StatCard
          icon={FileText}
          label="PACI Creados"
          value={stats?.totalPaci ?? 0}
          subtitle="Total de planes generados"
          color="accent"
        />
        <StatCard
          icon={CalendarDays}
          label="Periodo Actual"
          value={new Date().getFullYear()}
          subtitle="Año escolar en curso"
          color="success"
        />
      </div>

      {/* Usage bar */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Uso de Cupo de Estudiantes</h3>
            <span className="text-sm font-semibold text-secondary">
              {stats?.totalEstudiantes ?? 0} de {stats?.limiteEstudiantes ?? 0}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                usagePercent >= 90 ? 'bg-gradient-to-r from-danger to-red-400' : usagePercent >= 70 ? 'bg-gradient-to-r from-orange to-gold' : 'bg-gradient-to-r from-accent to-green'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 90 && (
            <p className="text-xs text-danger font-medium">
              Está cerca del límite de estudiantes permitidos. Contacte al administrador para ampliar su cupo.
            </p>
          )}
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="group border-dashed border-2 border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300">
          <Link to="/paci/nuevo" className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-white shadow-md shadow-accent/20 group-hover:scale-105 transition-transform duration-300">
                <FilePlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Crear Nuevo PACI</h3>
                <p className="text-sm text-secondary">Generar plan de adecuación</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-accent group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </Card>
        <Card className="group border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <Link to="/estudiantes/nuevo" className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrar Estudiante</h3>
                <p className="text-sm text-secondary">Agregar nuevo estudiante</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </Card>
      </div>

      {/* Recent PACIs */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Historial Reciente de PACIs</h3>
            {recentPacis.length > 0 && (
              <Link to="/paci" className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors">
                Ver todos →
              </Link>
            )}
          </div>
          {recentPacis.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              Aún no ha generado ningún PACI. Cree el primero desde el botón de arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left font-semibold text-slate-700">Estudiante</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">Formato</th>
                    <th className="pb-2 text-center font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPacis.map((p) => (
                    <tr key={p.id} className="hover:bg-primary/3 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">{p.estudiante_nombre}</td>
                      <td className="py-3 text-slate-600">{p.fecha_emision}</td>
                      <td className="py-3">
                        <Badge color={p.formato_generado === 'Compacto' ? 'accent' : p.formato_generado === 'Modular' ? 'warning' : 'primary'}>
                          {p.formato_generado}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/paci/${p.id}`)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-accent/10 hover:text-accent transition-all duration-200 cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(p.id)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-green/10 hover:text-green-dark transition-all duration-200 cursor-pointer"
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
        </div>
      </Card>
    </div>
  );
}
