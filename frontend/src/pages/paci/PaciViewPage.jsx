import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Select from '../../components/ui/Select';
import { generatePaciPdf } from '../../services/pdfService';

export default function PaciViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [paci, setPaci] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pageSize, setPageSize] = useState('carta');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/paci/${id}`);
        setPaci(res.data.data);

        // Auto-download if navigated with download state
        if (location.state?.download && res.data.data) {
          setTimeout(() => handleDownload(res.data.data), 500);
        }
      } catch {
        setError('Error al cargar el PACI');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownload = async (paciData = paci, size = pageSize) => {
    if (!paciData) return;
    setDownloading(true);
    try {
      generatePaciPdf(paciData, size);
    } catch {
      setError('Error al generar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  const renderList = (pipeString) => {
    if (!pipeString) return <span className="text-slate-400 italic">No registrado</span>;
    return (
      <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
        {pipeString.split('|').filter(Boolean).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  };

  if (loading) return <Spinner className="h-64" size="lg" />;
  if (error) return <Alert type="error" message={error} />;
  if (!paci) return <Alert type="error" message="PACI no encontrado" />;

  const trayectoria = paci.trayectoria || [];
  const dua = paci.perfil_dua || {};

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/paci')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Detalle PACI</h1>
            <p className="text-sm text-secondary">{paci.estudiante_nombre} — {paci.fecha_emision}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            id="pageSize"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            options={[
              { value: 'carta', label: 'Carta (Letter)' },
              { value: 'legal', label: 'Legal' },
            ]}
          />
          <Button onClick={() => handleDownload()} loading={downloading}>
            <Download className="h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* Identification */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          <FileText className="inline h-4 w-4 mr-2" />Identificación
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-secondary">Estudiante:</span> <strong>{paci.estudiante_nombre}</strong></div>
          <div><span className="text-secondary">RUT:</span> <strong>{paci.estudiante_rut}</strong></div>
          <div><span className="text-secondary">Curso:</span> <strong>{paci.estudiante_curso || '—'}</strong></div>
          <div><span className="text-secondary">Tipo NEE:</span> <strong>{paci.estudiante_tipo_nee || '—'}</strong></div>
          <div><span className="text-secondary">Diagnóstico:</span> <strong>{paci.estudiante_diagnostico || '—'}</strong></div>
          <div><span className="text-secondary">Establecimiento:</span> <strong>{paci.establecimiento_nombre || '—'}</strong></div>
          <div><span className="text-secondary">Fecha Emisión:</span> <strong>{paci.fecha_emision}</strong></div>
          <div><span className="text-secondary">Formato:</span> <Badge color="accent">{paci.formato_generado}</Badge></div>
          <div><span className="text-secondary">Profesional:</span> <strong>{paci.usuario_nombre}{paci.usuario_rol ? ` (${paci.usuario_rol})` : ''}</strong></div>
          <div><span className="text-secondary">PAEC:</span> <Badge color={paci.aplica_paec ? 'warning' : 'secondary'}>{paci.aplica_paec ? 'Sí' : 'No'}</Badge></div>
        </div>
      </Card>

      {/* DUA Profile */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Perfil DUA
        </h3>
        <div className="space-y-3">
          <div><strong className="text-sm text-slate-700">Fortalezas:</strong>{renderList(dua.fortalezas)}</div>
          <div><strong className="text-sm text-slate-700">Barreras:</strong>{renderList(dua.barreras)}</div>
          <div><strong className="text-sm text-slate-700">Representación:</strong>{renderList(dua.preferencias_representacion)}</div>
          <div><strong className="text-sm text-slate-700">Expresión:</strong>{renderList(dua.preferencias_expresion)}</div>
          <div><strong className="text-sm text-slate-700">Motivación:</strong>{renderList(dua.preferencias_motivacion)}</div>
        </div>
      </Card>

      {/* PAEC */}
      {paci.aplica_paec ? (
        <Card className="space-y-4 border-warning/50 bg-warning/5">
          <h3 className="text-base font-semibold text-slate-900 border-b border-warning/30 pb-2">
            <AlertTriangle className="inline h-4 w-4 mr-2 text-warning" />PAEC
          </h3>
          <div className="space-y-3 text-sm">
            <div><strong className="text-slate-700">Activadores:</strong><p className="text-slate-600 mt-1">{paci.paec_activadores || '—'}</p></div>
            <div><strong className="text-slate-700">Estrategias:</strong><p className="text-slate-600 mt-1">{paci.paec_estrategias || '—'}</p></div>
            <div><strong className="text-slate-700">Protocolo de Desregulación:</strong><p className="text-slate-600 mt-1">{paci.paec_desregulacion || '—'}</p></div>
          </div>
        </Card>
      ) : null}

      {/* Trayectoria OA */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Trayectoria de Objetivos de Aprendizaje ({trayectoria.length})
        </h3>
        {trayectoria.length === 0 ? (
          <p className="text-sm text-slate-400">Sin OAs registrados.</p>
        ) : (
          <div className="space-y-4">
            {trayectoria.map((item, index) => {
              const isSign = item.tipo_adecuacion === 'Significativa';
              return (
                <div
                  key={item.id || index}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isSign ? 'border-warning/50 bg-warning/5' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSign ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {item.oa_codigo || `OA #${index + 1}`}
                      </span>
                    </div>
                    <Badge color={isSign ? 'warning' : 'success'}>
                      DIF: {item.diferencia_calculada} — {item.tipo_adecuacion}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-600">{item.texto_oa}</p>

                  <div className="text-xs text-secondary">
                    Nivel de Trabajo: <strong>{item.nivel_nombre}</strong>
                  </div>

                  {isSign && (
                    <div className="border-t border-warning/30 pt-3 space-y-2 text-sm">
                      {item.justificacion_tecnica && (
                        <div><strong className="text-slate-700">Justificación:</strong> <span className="text-slate-600">{item.justificacion_tecnica}</span></div>
                      )}
                      {item.eval_modalidad && (
                        <div><strong className="text-slate-700">Modalidad Evaluación:</strong> <span className="text-slate-600">{item.eval_modalidad}</span></div>
                      )}
                      {item.eval_instrumento && (
                        <div><strong className="text-slate-700">Instrumento:</strong> <span className="text-slate-600">{item.eval_instrumento}</span></div>
                      )}
                      {item.eval_criterio && (
                        <div><strong className="text-slate-700">Criterio de Logro:</strong> <span className="text-slate-600">{item.eval_criterio}</span></div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
