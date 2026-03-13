import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

const MESES = [
  { num: 3, label: 'Mar' },
  { num: 4, label: 'Abr' },
  { num: 5, label: 'May' },
  { num: 6, label: 'Jun' },
  { num: 7, label: 'Jul' },
  { num: 8, label: 'Ago' },
  { num: 9, label: 'Sep' },
  { num: 10, label: 'Oct' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Dic' },
];

const ESTADOS = ['No Iniciado', 'En Proceso', 'Logrado', 'Logrado con Apoyo'];

const ESTADO_COLORS = {
  'No Iniciado': 'bg-slate-200 text-slate-600',
  'En Proceso': 'bg-amber-100 text-amber-800 border-amber-300',
  'Logrado': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Logrado con Apoyo': 'bg-sky-100 text-sky-800 border-sky-300',
};

const ESTADO_DOT = {
  'No Iniciado': 'bg-slate-400',
  'En Proceso': 'bg-amber-500',
  'Logrado': 'bg-emerald-500',
  'Logrado con Apoyo': 'bg-sky-500',
};

export default function SeguimientoPaciPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paci, setPaci] = useState(null);
  const [seguimiento, setSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });

  const anio = paci?.anio_escolar || new Date().getFullYear().toString();

  useEffect(() => {
    const load = async () => {
      try {
        const [paciRes, segRes] = await Promise.all([
          api.get(`/paci/${id}`),
          api.get(`/seguimiento-paci?paci_id=${id}`),
        ]);
        setPaci(paciRes.data.data);
        setSeguimiento(segRes.data.data?.items || segRes.data.data || []);
      } catch {
        setError('Error al cargar datos del PACI');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Build grid: rows = trayectoria items, cols = meses
  const trayectoria = paci?.trayectoria || [];

  // Lookup: key = `${trayectoria_id}_${mes}` → seguimiento record
  const segMap = {};
  seguimiento.forEach((s) => {
    segMap[`${s.trayectoria_id}_${s.mes}`] = s;
  });

  const getEstado = (trayId, mes) => {
    return segMap[`${trayId}_${mes}`]?.estado || 'No Iniciado';
  };

  const cycleEstado = (trayId, mes) => {
    const currentIdx = ESTADOS.indexOf(getEstado(trayId, mes));
    const nextIdx = (currentIdx + 1) % ESTADOS.length;
    const nuevoEstado = ESTADOS[nextIdx];

    // Update local state immediately
    const key = `${trayId}_${mes}`;
    const existing = segMap[key];
    if (existing) {
      setSeguimiento((prev) =>
        prev.map((s) => (s.trayectoria_id === trayId && s.mes === mes ? { ...s, estado: nuevoEstado } : s))
      );
    } else {
      const newRecord = { trayectoria_id: trayId, mes, anio: parseInt(anio), estado: nuevoEstado };
      setSeguimiento((prev) => [...prev, newRecord]);
      segMap[key] = newRecord;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setAlert({ type: '', message: '' });
    try {
      // Send all non "No Iniciado" records
      const records = [];
      trayectoria.forEach((tray) => {
        MESES.forEach(({ num }) => {
          const estado = getEstado(tray.id, num);
          if (estado !== 'No Iniciado') {
            records.push({
              paci_id: id,
              trayectoria_id: tray.id,
              mes: num,
              anio: parseInt(anio),
              estado,
              observaciones: segMap[`${tray.id}_${num}`]?.observaciones || null,
            });
          }
        });
      });

      for (const rec of records) {
        await api.post('/seguimiento-paci', rec);
      }

      setAlert({ type: 'success', message: 'Seguimiento guardado exitosamente' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar seguimiento';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="h-64" size="lg" />;
  if (error) return <Alert type="error" message={error} />;
  if (!paci) return <Alert type="error" message="PACI no encontrado" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/paci/${id}`)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Seguimiento PACI</h1>
            <p className="text-sm text-secondary">{paci.estudiante_nombre} — {anio}</p>
          </div>
        </div>
        <Button onClick={handleSaveAll} loading={saving}>
          <Save className="h-4 w-4" /> Guardar Seguimiento
        </Button>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {ESTADOS.map((e) => (
          <span key={e} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${ESTADO_COLORS[e]}`}>
            <span className={`h-2 w-2 rounded-full ${ESTADO_DOT[e]}`} />
            {e}
          </span>
        ))}
        <span className="text-slate-400 ml-2">Haga clic en cada celda para cambiar el estado</span>
      </div>

      {/* Grid */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-3 font-semibold text-slate-700 min-w-[200px]">OA / Objetivo</th>
              <th className="text-center py-3 px-1 font-semibold text-slate-700 w-10">Tipo</th>
              {MESES.map((m) => (
                <th key={m.num} className="text-center py-3 px-1 font-semibold text-slate-700 w-14">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trayectoria.map((tray) => {
              const isSign = tray.tipo_adecuacion === 'Significativa';
              return (
                <tr key={tray.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2 px-3">
                    <div className="font-medium text-slate-900 text-xs">{tray.oa_codigo || 'OA'}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[250px]" title={tray.texto_oa}>
                      {tray.texto_oa?.slice(0, 80)}{tray.texto_oa?.length > 80 ? '…' : ''}
                    </div>
                  </td>
                  <td className="text-center py-2 px-1">
                    <Badge color={isSign ? 'warning' : 'success'} className="text-[10px]">
                      {isSign ? 'SIG' : 'ACC'}
                    </Badge>
                  </td>
                  {MESES.map((m) => {
                    const estado = getEstado(tray.id, m.num);
                    return (
                      <td key={m.num} className="text-center py-2 px-1">
                        <button
                          type="button"
                          onClick={() => cycleEstado(tray.id, m.num)}
                          className={`h-8 w-8 rounded-full border transition-all hover:scale-110 cursor-pointer ${ESTADO_COLORS[estado]}`}
                          title={`${tray.oa_codigo} - ${m.label}: ${estado}`}
                        >
                          <span className={`inline-block h-3 w-3 rounded-full ${ESTADO_DOT[estado]}`} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {trayectoria.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No hay OAs en la trayectoria de este PACI.</p>
        )}
      </Card>
    </div>
  );
}
