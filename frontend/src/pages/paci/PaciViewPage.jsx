import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Select from '../../components/ui/Select';
import { generatePaciPdf } from '../../services/pdfService';

const toStartMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})\s-\s(\d{2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return Number.POSITIVE_INFINITY;
  return hh * 60 + mm;
};

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
  const paecVars = paci.paec_variables || [];
  const horarioApoyo = paci.horario_apoyo || null;
  const horarioFilas = (horarioApoyo?.filas || [])
    .slice()
    .sort((a, b) => {
      const byHour = toStartMinutes(a?.hora) - toStartMinutes(b?.hora);
      if (byHour !== 0) return byHour;
      return (a?.orden || 0) - (b?.orden || 0);
    });

  // Helper: render matrix items or fallback to legacy pipe-delimited string
  const renderMatrixOrPipe = (matrixKey, pipeValue) => {
    const items = paci[matrixKey];
    if (items && items.length > 0) {
      return (
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
          {items.map((m) => <li key={m.id}>{m.nombre}</li>)}
        </ul>
      );
    }
    return renderList(pipeValue);
  };

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
          <Button variant="outline" onClick={() => navigate(`/paci/${id}/seguimiento`)}>
            <ClipboardList className="h-4 w-4" /> Seguimiento
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
          <div><strong className="text-sm text-slate-700">Fortalezas:</strong>{renderMatrixOrPipe('matrices_fortalezas', dua.fortalezas)}</div>
          <div><strong className="text-sm text-slate-700">Barreras:</strong>{renderMatrixOrPipe('matrices_barreras', dua.barreras)}</div>
          <div><strong className="text-sm text-slate-700">Acceso Curricular:</strong>{renderMatrixOrPipe('matrices_acceso_curricular', dua.acceso_curricular)}</div>
          <div><strong className="text-sm text-slate-700">Representación:</strong>{renderMatrixOrPipe('matrices_estrategias_dua', dua.preferencias_representacion)}</div>
          <div><strong className="text-sm text-slate-700">Expresión:</strong>{renderList(dua.preferencias_expresion)}</div>
          <div><strong className="text-sm text-slate-700">Motivación:</strong>{renderList(dua.preferencias_motivacion)}</div>
          <div><strong className="text-sm text-slate-700">Habilidades Base:</strong>{renderMatrixOrPipe('matrices_habilidades_base', dua.habilidades_base)}</div>
          {dua.barreras_personalizadas && (
            <div><strong className="text-sm text-slate-700">Barreras Personalizadas:</strong><p className="text-sm text-slate-600 mt-1">{dua.barreras_personalizadas}</p></div>
          )}
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
          {paecVars.length > 0 && (
            <div className="border-t border-warning/30 pt-3 space-y-2">
              <strong className="text-sm text-slate-700">Variables PAEC Estructuradas:</strong>
              {['Activador', 'Estrategia', 'Desregulacion', 'Protocolo'].map((tipo) => {
                const vars = paecVars.filter((v) => v.tipo === tipo);
                if (vars.length === 0) return null;
                return (
                  <div key={tipo} className="ml-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">{tipo}:</span>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5 ml-2">
                      {vars.map((v) => (
                        <li key={v.id}>{v.descripcion}{v.estrategia ? ` → ${v.estrategia}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {/* Horario de Apoyo */}
      {paci.formato_generado === 'Completo' ? (
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
            Horario de Apoyo
          </h3>
          {!horarioApoyo || !(horarioApoyo.filas || []).length ? (
            <p className="text-sm text-slate-400">No hay horario de apoyo registrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[760px] text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {(horarioApoyo.columnas || []).map((col) => (
                      <th key={col.key} className="px-2 py-2 text-left font-semibold text-slate-700">{col.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {horarioFilas.map((row) => (
                    <tr key={row.id || row.orden}>
                      {(horarioApoyo.columnas || []).map((col) => (
                        <td key={col.key} className="px-2 py-2 text-slate-600 align-top whitespace-pre-wrap">
                          {col.key === 'hora' ? (row.hora || '—') : ((row.celdas || {})[col.key] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

                  {/* Indicadores seleccionados */}
                  {item.indicadores_seleccionados?.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <strong className="text-xs text-slate-500 uppercase">Indicadores seleccionados:</strong>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5 mt-1">
                        {item.indicadores_seleccionados.map((ind) => (
                          <li key={ind.id}>{ind.texto_indicador} <Badge color="secondary" className="text-xs">{ind.nivel_desempeno}</Badge></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Meta integradora (adecuación OA) */}
                  {item.adecuacion_oa && (
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
                      <strong className="text-xs text-slate-500 uppercase">Meta Integradora / OA Adaptado:</strong>
                      {item.adecuacion_oa.meta_integradora && (
                        <p className="text-slate-600"><strong className="text-slate-700">Meta:</strong> {item.adecuacion_oa.meta_integradora}</p>
                      )}
                      {item.adecuacion_oa.estrategias && (
                        <p className="text-slate-600"><strong className="text-slate-700">Estrategias:</strong> {item.adecuacion_oa.estrategias}</p>
                      )}
                      {item.adecuacion_oa.indicadores_nivelados && (
                        <p className="text-slate-600"><strong className="text-slate-700">Indicadores Nivelados:</strong> {item.adecuacion_oa.indicadores_nivelados}</p>
                      )}
                      {item.adecuacion_oa.actividades_graduales && (
                        <p className="text-slate-600"><strong className="text-slate-700">Actividades:</strong> {item.adecuacion_oa.actividades_graduales}</p>
                      )}
                      {item.adecuacion_oa.lectura_complementaria && (
                        <p className="text-slate-600"><strong className="text-slate-700">Lectura Complementaria:</strong> {item.adecuacion_oa.lectura_complementaria}</p>
                      )}
                      {item.adecuacion_oa.criterios_evaluacion && (
                        <p className="text-slate-600"><strong className="text-slate-700">Criterios:</strong> {item.adecuacion_oa.criterios_evaluacion}</p>
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
