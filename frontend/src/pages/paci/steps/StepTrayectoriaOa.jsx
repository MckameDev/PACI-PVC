import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import api from '../../../api/axios';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Alert from '../../../components/ui/Alert';

export default function StepTrayectoriaOa({ data, onChange, estudiante }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [cursosNiveles, setCursosNiveles] = useState([]);
  const [oaList, setOaList] = useState({});
  const [loadingOa, setLoadingOa] = useState({});
  const [evalSugerencias, setEvalSugerencias] = useState({});

  const trayectoria = data.trayectoria || [];

  // Load catalogues
  useEffect(() => {
    const load = async () => {
      try {
        const [asigRes, cnRes] = await Promise.all([
          api.get('/asignaturas', { params: { limit: 100 } }),
          api.get('/cursos-niveles', { params: { limit: 50 } }),
        ]);
        setAsignaturas(asigRes.data.data?.items || []);
        setCursosNiveles(cnRes.data.data?.items || []);
      } catch {
        console.error('Error loading catalogues');
      }
    };
    load();
  }, []);

  const sortedCursos = [...cursosNiveles].sort((a, b) => (a.valor_numerico || 0) - (b.valor_numerico || 0));

  // Get student's official level numeric value
  const nivelOficial = estudiante?.curso_valor_numerico || 0;

  // Load OAs by asignatura
  const loadOas = useCallback(async (asignaturaId, index) => {
    if (!asignaturaId) return;
    const key = asignaturaId;
    if (oaList[key]) return;

    setLoadingOa((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await api.get('/oa', { params: { asignatura_id: asignaturaId, limit: 200 } });
      setOaList((prev) => ({ ...prev, [key]: res.data.data?.items || [] }));
    } catch {
      console.error('Error loading OAs');
    } finally {
      setLoadingOa((prev) => ({ ...prev, [index]: false }));
    }
  }, [oaList]);

  // Load eval suggestions
  const loadEvalSugerencias = useCallback(async (index, habilidad, nivelId, tipoAdecuacion) => {
    if (!habilidad || !nivelId || !tipoAdecuacion) return;
    try {
      const res = await api.get('/evaluaciones', {
        params: { habilidad, nivel_id: nivelId, tipo_adecuacion: tipoAdecuacion, limit: 5 },
      });
      const items = res.data.data?.items || [];
      if (items.length > 0) {
        setEvalSugerencias((prev) => ({ ...prev, [index]: items[0] }));
      }
    } catch {
      // Silently fail - suggestions are optional
    }
  }, []);

  const updateItem = (index, field, value) => {
    const newTray = [...trayectoria];
    newTray[index] = { ...newTray[index], [field]: value };

    // Calculate DIF when nivel_trabajo_id changes
    if (field === 'nivel_trabajo_id' && value) {
      const nivelTrabajo = cursosNiveles.find((c) => c.id === value);
      if (nivelTrabajo) {
        const dif = nivelOficial - (nivelTrabajo.valor_numerico || 0);
        newTray[index].diferencia_calculada = dif;
        newTray[index].tipo_adecuacion = dif >= 3 ? 'Significativa' : 'Acceso';

        // Clear justificacion if switching to Acceso
        if (dif < 3) {
          newTray[index].justificacion_tecnica = '';
          newTray[index].eval_modalidad = '';
          newTray[index].eval_instrumento = '';
          newTray[index].eval_criterio = '';
        }

        // Pre-fill justificación for Significativa
        if (dif >= 3 && !newTray[index].justificacion_tecnica) {
          newTray[index].justificacion_tecnica =
            'La presente adecuación curricular significativa se fundamenta en evaluación diagnóstica funcional que evidencia desfase en habilidades estructurantes del aprendizaje, requiriendo intervención en niveles previos para asegurar progresión, acceso curricular y continuidad formativa.';
        }

        // Load eval suggestions for Significativa
        if (dif >= 3) {
          const oa = findOa(newTray[index]._asignatura_id, newTray[index].oa_id);
          if (oa?.habilidad_core) {
            loadEvalSugerencias(index, oa.habilidad_core, value, 'Significativa');
          }
        }
      }
    }

    // When asignatura changes, load OAs
    if (field === '_asignatura_id') {
      loadOas(value, index);
      newTray[index].oa_id = '';
      newTray[index].nivel_trabajo_id = '';
      newTray[index].diferencia_calculada = 0;
      newTray[index].tipo_adecuacion = 'Acceso';
    }

    onChange('trayectoria', newTray);
  };

  const addItem = () => {
    onChange('trayectoria', [
      ...trayectoria,
      {
        _asignatura_id: '',
        oa_id: '',
        nivel_trabajo_id: '',
        diferencia_calculada: 0,
        tipo_adecuacion: 'Acceso',
        justificacion_tecnica: '',
        eval_modalidad: '',
        eval_instrumento: '',
        eval_criterio: '',
      },
    ]);
  };

  const removeItem = (index) => {
    const newTray = trayectoria.filter((_, i) => i !== index);
    onChange('trayectoria', newTray);
  };

  const applyEvalSugerencia = (index) => {
    const sug = evalSugerencias[index];
    if (!sug) return;
    const newTray = [...trayectoria];
    newTray[index] = {
      ...newTray[index],
      eval_modalidad: sug.modalidad_sugerida || '',
      eval_instrumento: sug.instrumento_sugerido || '',
      eval_criterio: sug.criterio_logro || '',
    };
    onChange('trayectoria', newTray);
  };

  const findOa = (asignaturaId, oaId) => {
    const oas = oaList[asignaturaId] || [];
    return oas.find((o) => o.id === oaId);
  };

  // Check if any Significativa items are missing justification
  const hasBlockingErrors = trayectoria.some(
    (item) => item.tipo_adecuacion === 'Significativa' && !item.justificacion_tecnica?.trim()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 3: Trayectoria de Objetivos de Aprendizaje</h2>
        <p className="text-sm text-secondary mt-1">
          Agregue los OA a trabajar. El sistema calculará automáticamente el tipo de adecuación según la diferencia entre el nivel oficial y el nivel de trabajo.
        </p>
        {nivelOficial > 0 && (
          <p className="text-sm text-primary font-medium mt-1">
            Nivel oficial del estudiante: <strong>{estudiante?.curso_nivel_nombre}</strong> (valor: {nivelOficial})
          </p>
        )}
      </div>

      {hasBlockingErrors && (
        <Alert
          type="warning"
          message="Existen adecuaciones Significativas sin Justificación Técnica. Debe completarlas antes de continuar."
        />
      )}

      {/* OA Items */}
      {trayectoria.map((item, index) => {
        const oas = oaList[item._asignatura_id] || [];
        const selectedOa = findOa(item._asignatura_id, item.oa_id);
        const isSignificativa = item.tipo_adecuacion === 'Significativa';
        const sug = evalSugerencias[index];

        return (
          <Card
            key={index}
            className={`space-y-4 ${isSignificativa ? 'border-warning/50 bg-warning/5' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  {index + 1}
                </span>
                <h4 className="text-sm font-semibold text-slate-900">Objetivo de Aprendizaje</h4>
                {item.diferencia_calculada !== 0 && (
                  <Badge color={isSignificativa ? 'warning' : 'success'}>
                    DIF: {item.diferencia_calculada} — {item.tipo_adecuacion}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => removeItem(index)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                title="Eliminar OA"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Asignatura + OA Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id={`asignatura_${index}`}
                label="Asignatura *"
                placeholder="Seleccione asignatura"
                value={item._asignatura_id}
                onChange={(e) => updateItem(index, '_asignatura_id', e.target.value)}
                options={asignaturas.map((a) => ({ value: a.id, label: a.nombre }))}
              />
              <Select
                id={`oa_${index}`}
                label="Objetivo de Aprendizaje *"
                placeholder={loadingOa[index] ? 'Cargando OAs...' : 'Seleccione OA'}
                value={item.oa_id}
                onChange={(e) => updateItem(index, 'oa_id', e.target.value)}
                options={oas.map((o) => ({
                  value: o.id,
                  label: `${o.codigo_oa || o.id_oa} — ${o.texto_oa?.substring(0, 80)}...`,
                }))}
                disabled={!item._asignatura_id || loadingOa[index]}
              />
            </div>

            {/* OA Detail */}
            {selectedOa && (
              <div className="rounded-lg bg-white border border-slate-200 p-3 text-sm">
                <p className="text-slate-600">{selectedOa.texto_oa}</p>
                <div className="mt-2 flex gap-4 text-xs text-secondary">
                  {selectedOa.eje && <span>Eje: <strong>{selectedOa.eje}</strong></span>}
                  {selectedOa.habilidad_core && <span>Habilidad: <strong>{selectedOa.habilidad_core}</strong></span>}
                </div>
              </div>
            )}

            {/* Nivel de Trabajo */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id={`nivel_${index}`}
                label="Nivel de Trabajo *"
                placeholder="Seleccione nivel"
                value={item.nivel_trabajo_id}
                onChange={(e) => updateItem(index, 'nivel_trabajo_id', e.target.value)}
                options={sortedCursos.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (valor: ${c.valor_numerico})`,
                }))}
              />
              <div className="flex items-end">
                <div className="rounded-lg bg-slate-50 p-3 w-full">
                  <div className="text-xs text-secondary">Cálculo Automático</div>
                  <div className="flex items-center gap-2 mt-1">
                    {isSignificativa ? (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                    <span className="text-sm font-semibold">
                      DIF = {nivelOficial} − {
                        cursosNiveles.find((c) => c.id === item.nivel_trabajo_id)?.valor_numerico ?? '?'
                      } = {item.diferencia_calculada}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 font-medium ${isSignificativa ? 'text-warning' : 'text-success'}`}>
                    Tipo: {item.tipo_adecuacion}
                    {isSignificativa && ' — Requiere Justificación Técnica'}
                  </div>
                </div>
              </div>
            </div>

            {/* Significativa: Justification + Eval */}
            {isSignificativa && (
              <div className="space-y-4 border-t border-warning/30 pt-4">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">Adecuación Significativa — Campos Obligatorios</span>
                </div>

                <TextArea
                  id={`justificacion_${index}`}
                  label="Justificación Técnica *"
                  placeholder="Fundamente técnicamente por qué se requiere una adecuación significativa para este OA..."
                  value={item.justificacion_tecnica || ''}
                  onChange={(e) => updateItem(index, 'justificacion_tecnica', e.target.value)}
                  rows={3}
                  error={
                    isSignificativa && !item.justificacion_tecnica?.trim()
                      ? 'Obligatoria para adecuaciones significativas'
                      : undefined
                  }
                />

                {/* Eval suggestions */}
                {sug && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-accent">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm font-semibold">Sugerencia de Evaluación Diferenciada</span>
                      </div>
                      <Button size="sm" variant="accent" onClick={() => applyEvalSugerencia(index)}>
                        Aplicar Sugerencia
                      </Button>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p><strong>Modalidad:</strong> {sug.modalidad_sugerida}</p>
                      <p><strong>Instrumento:</strong> {sug.instrumento_sugerido}</p>
                      <p><strong>Criterio de Logro:</strong> {sug.criterio_logro}</p>
                    </div>
                  </div>
                )}

                <TextArea
                  id={`eval_modalidad_${index}`}
                  label="Modalidad de Evaluación"
                  placeholder="Ej: Evaluación oral con apoyo visual"
                  value={item.eval_modalidad || ''}
                  onChange={(e) => updateItem(index, 'eval_modalidad', e.target.value)}
                  rows={2}
                />
                <TextArea
                  id={`eval_instrumento_${index}`}
                  label="Instrumento de Evaluación"
                  placeholder="Ej: Rúbrica adaptada con indicadores simplificados"
                  value={item.eval_instrumento || ''}
                  onChange={(e) => updateItem(index, 'eval_instrumento', e.target.value)}
                  rows={2}
                />
                <TextArea
                  id={`eval_criterio_${index}`}
                  label="Criterio de Logro"
                  placeholder="Ej: Identifica al menos 3 de 5 elementos..."
                  value={item.eval_criterio || ''}
                  onChange={(e) => updateItem(index, 'eval_criterio', e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </Card>
        );
      })}

      {/* Add OA button */}
      <button
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
      >
        <Plus className="h-5 w-5" />
        Agregar Objetivo de Aprendizaje
      </button>
    </div>
  );
}
