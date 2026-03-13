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
        <h2 className="text-lg font-semibold text-slate-900">Paso 5: Resumen y Confirmación</h2>
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
          <div><span className="text-secondary">Año Escolar:</span> <strong>{data.anio_escolar || '—'}</strong></div>
          <div><span className="text-secondary">Tipo NEE:</span> <Badge color={estudiante?.tipo_nee === 'NEEP' ? 'danger' : 'accent'}>{estudiante?.tipo_nee}</Badge></div>
          <div><span className="text-secondary">Diagnóstico:</span> <strong>{estudiante?.diagnostico || '—'}</strong></div>
          <div><span className="text-secondary">Profesor/a Jefe:</span> <strong>{data.profesor_jefe || '—'}</strong></div>
          <div><span className="text-secondary">Profesor/a Asignatura:</span> <strong>{data.profesor_asignatura || '—'}</strong></div>
          <div><span className="text-secondary">Educador/a Diferencial:</span> <strong>{data.educador_diferencial || '—'}</strong></div>
        </div>
      </Card>

      {/* Perfil del Estudiante (DUA) */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Perfil del Estudiante
        </h3>
        <div className="space-y-3">
          <div><strong className="text-sm text-slate-700">Fortalezas:</strong>{renderList(dua.fortalezas)}</div>
          <div><strong className="text-sm text-slate-700">Barreras:</strong>{renderList(dua.barreras)}</div>
          <div><strong className="text-sm text-slate-700">Acceso Curricular Clave:</strong>{renderList(dua.acceso_curricular)}</div>
          {dua.barreras_personalizadas && (
            <div><strong className="text-sm text-slate-700">Barreras Personalizadas:</strong><p className="text-sm text-slate-600 mt-1">{dua.barreras_personalizadas}</p></div>
          )}
          <div><strong className="text-sm text-slate-700">Preferencias de Representación:</strong>{renderList(dua.preferencias_representacion)}</div>
          <div><strong className="text-sm text-slate-700">Preferencias de Expresión:</strong>{renderList(dua.preferencias_expresion)}</div>
          <div><strong className="text-sm text-slate-700">Preferencias de Motivación:</strong>{renderList(dua.preferencias_motivacion)}</div>
          <div><strong className="text-sm text-slate-700">Habilidades Base Permanentes:</strong>{renderList(dua.habilidades_base)}</div>
        </div>
      </Card>

      {/* PAEC */}
      {data.aplica_paec ? (
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
            PAEC — Plan de Regulación Emocional y Conductual
          </h3>
          <div className="space-y-3 text-sm">
            {data.paec_activadores && <div><strong className="text-slate-700">Activadores:</strong><p className="text-slate-600 mt-1">{data.paec_activadores}</p></div>}
            {data.paec_estrategias && <div><strong className="text-slate-700">Estrategias:</strong><p className="text-slate-600 mt-1">{data.paec_estrategias}</p></div>}
            {data.paec_desregulacion && <div><strong className="text-slate-700">Protocolo:</strong><p className="text-slate-600 mt-1">{data.paec_desregulacion}</p></div>}

            {(data.paec_variables || []).length > 0 && (
              <div className="mt-3 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Variables Estructuradas</h4>
                {['Activador', 'Estrategia', 'Desregulacion', 'Protocolo'].map((tipo) => {
                  const items = (data.paec_variables || []).filter(v => v.tipo === tipo);
                  if (items.length === 0) return null;
                  return (
                    <div key={tipo}>
                      <h5 className="text-xs font-semibold text-slate-700 mb-1">{tipo}s ({items.length})</h5>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                        {items.map((v, i) => <li key={i}><strong>{v.descripcion}</strong>{v.estrategia ? ` — ${v.estrategia}` : ''}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
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
                {item.meta_especifica && (
                  <div className="text-sm"><strong className="text-slate-700">Meta Específica:</strong> <span className="text-slate-600">{item.meta_especifica}</span></div>
                )}
                {item.estrategias_dua && (
                  <div className="text-sm"><strong className="text-slate-700">Estrategias DUA:</strong> <span className="text-slate-600">{item.estrategias_dua}</span></div>
                )}
                {item.habilidades && (
                  <div className="text-sm"><strong className="text-slate-700">Habilidades:</strong> <span className="text-slate-600">{item.habilidades}</span></div>
                )}
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
                {item.seguimiento_registro && (
                  <div className="text-sm"><strong className="text-slate-700">Seguimiento:</strong> <span className="text-slate-600">{item.seguimiento_registro}</span></div>
                )}
                {(item.indicadores_seleccionados || []).length > 0 && (
                  <div className="text-sm"><strong className="text-slate-700">Indicadores Seleccionados:</strong> <Badge color="accent">{item.indicadores_seleccionados.length}</Badge></div>
                )}
                {item.adecuacion_oa?.meta_integradora && (
                  <div className="text-sm"><strong className="text-slate-700">Meta Integradora:</strong> <span className="text-slate-600">{item.adecuacion_oa.meta_integradora}</span></div>
                )}
                {item.adecuacion_oa?.estrategias && (
                  <div className="text-sm"><strong className="text-slate-700">Estrategias Adecuación:</strong> <span className="text-slate-600">{item.adecuacion_oa.estrategias}</span></div>
                )}
                {item.adecuacion_oa?.adecuaciones && (
                  <div className="text-sm"><strong className="text-slate-700">Adecuaciones:</strong> <span className="text-slate-600">{item.adecuacion_oa.adecuaciones}</span></div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
