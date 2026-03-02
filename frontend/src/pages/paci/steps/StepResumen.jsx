import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

export default function StepResumen({ data, estudiante }) {
  const dua = data.perfil_dua || {};
  const trayectoria = data.trayectoria || [];

  const renderList = (pipeString) => {
    if (!pipeString) return <span className="text-slate-400">No seleccionado</span>;
    return (
      <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
        {pipeString.split('|').filter(Boolean).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 4: Resumen y Confirmación</h2>
        <p className="text-sm text-secondary mt-1">
          Revise toda la información antes de guardar el PACI.
        </p>
      </div>

      {/* Identification */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Identificación y Contexto
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-secondary">Estudiante:</span> <strong>{estudiante?.nombre_completo || '—'}</strong></div>
          <div><span className="text-secondary">RUT:</span> <strong>{estudiante?.rut || '—'}</strong></div>
          <div><span className="text-secondary">Curso:</span> <strong>{estudiante?.curso_nivel_nombre}{estudiante?.letra_nombre ? ` ${estudiante.letra_nombre}` : ''}</strong></div>
          <div><span className="text-secondary">Establecimiento:</span> <strong>{estudiante?.establecimiento_nombre || '—'}</strong></div>
          <div><span className="text-secondary">Fecha Emisión:</span> <strong>{data.fecha_emision || '—'}</strong></div>
          <div><span className="text-secondary">Formato:</span> <Badge color="accent">{data.formato_generado || '—'}</Badge></div>
          <div><span className="text-secondary">Diagnóstico:</span> <strong>{estudiante?.diagnostico || '—'}</strong></div>
          <div><span className="text-secondary">Tipo NEE:</span> <Badge color={estudiante?.tipo_nee === 'NEEP' ? 'danger' : 'accent'}>{estudiante?.tipo_nee}</Badge></div>
        </div>
      </Card>

      {/* DUA */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Perfil DUA
        </h3>
        <div className="space-y-3">
          <div><strong className="text-sm text-slate-700">Fortalezas:</strong>{renderList(dua.fortalezas)}</div>
          <div><strong className="text-sm text-slate-700">Barreras:</strong>{renderList(dua.barreras)}</div>
          <div><strong className="text-sm text-slate-700">Preferencias de Representación:</strong>{renderList(dua.preferencias_representacion)}</div>
          <div><strong className="text-sm text-slate-700">Preferencias de Expresión:</strong>{renderList(dua.preferencias_expresion)}</div>
          <div><strong className="text-sm text-slate-700">Preferencias de Motivación:</strong>{renderList(dua.preferencias_motivacion)}</div>
        </div>
      </Card>

      {/* PAEC */}
      {data.aplica_paec ? (
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
            PAEC — Plan de Regulación Emocional y Conductual
          </h3>
          <div className="space-y-3 text-sm">
            <div><strong className="text-slate-700">Activadores:</strong><p className="text-slate-600 mt-1">{data.paec_activadores || '—'}</p></div>
            <div><strong className="text-slate-700">Estrategias:</strong><p className="text-slate-600 mt-1">{data.paec_estrategias || '—'}</p></div>
            <div><strong className="text-slate-700">Protocolo de Desregulación:</strong><p className="text-slate-600 mt-1">{data.paec_desregulacion || '—'}</p></div>
          </div>
        </Card>
      ) : null}

      {/* Trayectoria OA */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Trayectoria de Objetivos de Aprendizaje ({trayectoria.length} OA)
        </h3>
        {trayectoria.length === 0 ? (
          <p className="text-sm text-slate-400">No se han agregado OAs a este PACI.</p>
        ) : (
          <div className="space-y-4">
            {trayectoria.map((item, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 space-y-2 ${
                  item.tipo_adecuacion === 'Significativa'
                    ? 'border-warning/50 bg-warning/5'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">OA #{index + 1}</span>
                  <Badge color={item.tipo_adecuacion === 'Significativa' ? 'warning' : 'success'}>
                    DIF: {item.diferencia_calculada} — {item.tipo_adecuacion}
                  </Badge>
                </div>
                {item.justificacion_tecnica && (
                  <div className="text-sm"><strong className="text-slate-700">Justificación:</strong> <span className="text-slate-600">{item.justificacion_tecnica}</span></div>
                )}
                {item.eval_modalidad && (
                  <div className="text-sm"><strong className="text-slate-700">Modalidad Evaluación:</strong> <span className="text-slate-600">{item.eval_modalidad}</span></div>
                )}
                {item.eval_instrumento && (
                  <div className="text-sm"><strong className="text-slate-700">Instrumento:</strong> <span className="text-slate-600">{item.eval_instrumento}</span></div>
                )}
                {item.eval_criterio && (
                  <div className="text-sm"><strong className="text-slate-700">Criterio de Logro:</strong> <span className="text-slate-600">{item.eval_criterio}</span></div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
