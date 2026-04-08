import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle, Zap, ChevronDown, ChevronUp, Target, MessageCircle } from 'lucide-react';
import api from '../../../api/axios';
import SearchSelect from '../../../components/ui/SearchSelect';
import TextArea from '../../../components/ui/TextArea';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Alert from '../../../components/ui/Alert';

export default function StepTrayectoriaOa({ data, onChange, estudiante }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [cursosNiveles, setCursosNiveles] = useState([]);
  const [ejesPorAsignatura, setEjesPorAsignatura] = useState({});
  const [oaList, setOaList] = useState({});
  const [indicadoresPorOa, setIndicadoresPorOa] = useState({});
  const [loadingEjes, setLoadingEjes] = useState({});
  const [loadingOa, setLoadingOa] = useState({});
  const [loadingIndicadores, setLoadingIndicadores] = useState({});
  const [expandedIndicadores, setExpandedIndicadores] = useState({});
  const [expandedMeta, setExpandedMeta] = useState({});
  const [evalSugerencias, setEvalSugerencias] = useState({});
  const [coreSugerencias, setCoreSugerencias] = useState({});

  const trayectoria = data.trayectoria || [];
  const paciAsignaturaId = data.asignatura_id || '';

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

  // Pre-load ejes for the PACI-level asignatura as soon as it is known
  useEffect(() => {
    if (!paciAsignaturaId) return;
    const key = paciAsignaturaId;
    api.get('/oa/ejes', { params: { asignatura_id: paciAsignaturaId } })
      .then(res => setEjesPorAsignatura(prev => {
        if (prev[key]?.length > 0) return prev;
        return { ...prev, [key]: res.data.data || [] };
      }))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciAsignaturaId]);

  const sortedCursos = [...cursosNiveles].sort((a, b) => (a.valor_numerico || 0) - (b.valor_numerico || 0));

  // Get student's official level numeric value
  const nivelOficial = estudiante?.curso_valor_numerico || 0;

  // Load Ejes by asignatura
  const loadEjes = useCallback(async (asignaturaId, index) => {
    if (!asignaturaId) return;
    const key = asignaturaId;
    if (ejesPorAsignatura[key]?.length > 0) return;

    setLoadingEjes((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await api.get('/oa/ejes', { params: { asignatura_id: asignaturaId } });
      setEjesPorAsignatura((prev) => ({ ...prev, [key]: res.data.data || [] }));
    } catch {
      console.error('Error loading ejes');
      setEjesPorAsignatura((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingEjes((prev) => ({ ...prev, [index]: false }));
    }
  }, [ejesPorAsignatura]);

  // Load OAs by asignatura + nivel (ambos requeridos, filtro por ID)
  const loadOas = useCallback(async (asignaturaId, nivelId, index) => {
    if (!asignaturaId || !nivelId) return;
    const key = `${asignaturaId}_${nivelId}`;
    if (oaList[key]?.length > 0) return;

    setLoadingOa((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await api.get('/oa', {
        params: { asignatura_id: asignaturaId, nivel_trabajo_id: nivelId, limit: 500 },
      });
      const items = res.data.data?.items || [];
      setOaList((prev) => ({ ...prev, [key]: items }));
    } catch {
      console.error('Error loading OAs');
      setOaList((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingOa((prev) => ({ ...prev, [index]: false }));
    }
  }, [oaList]);

  // Load indicadores by OA
  const loadIndicadores = useCallback(async (oaId) => {
    if (!oaId || indicadoresPorOa[oaId]) return;

    setLoadingIndicadores((prev) => ({ ...prev, [oaId]: true }));
    try {
      const res = await api.get('/indicadores', { params: { oa_id: oaId, limit: 100 } });
      const items = res.data.data?.items || [];
      
      // Agrupar por nivel de desempeño
      const grouped = {
        L: items.filter(i => i.nivel_desempeno === 'L'),
        ED: items.filter(i => i.nivel_desempeno === 'ED'),
        NL: items.filter(i => i.nivel_desempeno === 'NL'),
      };
      
      setIndicadoresPorOa((prev) => ({ ...prev, [oaId]: grouped }));
    } catch {
      console.error('Error loading indicadores');
      setIndicadoresPorOa((prev) => ({ ...prev, [oaId]: { L: [], ED: [], NL: [] } }));
    } finally {
      setLoadingIndicadores((prev) => ({ ...prev, [oaId]: false }));
    }
  }, [indicadoresPorOa]);

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

  // Load core suggestions (estrategias-core, activacion-paci)
  const loadCoreSugerencias = useCallback(async (index, item) => {
    const eje = item._eje;
    const asignatura = asignaturas.find(a => a.id === item._asignatura_id)?.nombre || '';
    const requests = [];

    if (asignatura && eje) {
      requests.push(
        api.get('/estrategias-core', { params: { asignatura, eje, limit: 10 } }).catch(() => ({ data: { data: { items: [] } } })),
        api.get('/activacion-paci', { params: { eje, limit: 10 } }).catch(() => ({ data: { data: { items: [] } } })),
        api.get('/matriz-adecuaciones', { params: { asignatura, eje, limit: 10 } }).catch(() => ({ data: { data: { items: [] } } }))
      );
    }

    if (requests.length === 0) return;

    try {
      const [estrategiasRes, activacionRes, adecuacionesRes] = await Promise.all(requests);
      setCoreSugerencias(prev => ({
        ...prev,
        [index]: {
          estrategias: estrategiasRes.data.data?.items || [],
          activaciones: activacionRes.data.data?.items || [],
          adecuaciones: adecuacionesRes.data.data?.items || [],
        },
      }));
    } catch {
      // Silent fail — suggestions are optional
    }
  }, [asignaturas]);

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

        // Pre-fill justificación for Significativa
        if (dif >= 3 && !newTray[index].justificacion_tecnica) {
          newTray[index].justificacion_tecnica =
            'La presente adecuación curricular significativa se fundamenta en evaluación diagnóstica funcional que evidencia desfase en habilidades estructurantes del aprendizaje, requiriendo intervención en niveles previos para asegurar progresión, acceso curricular y continuidad formativa.';
        }

        // Load OAs for this asignatura + nivel combination
        if (newTray[index]._asignatura_id) {
          loadOas(newTray[index]._asignatura_id, value, index);
        }

        // Load eval suggestions for Significativa
        if (dif >= 3) {
          const oa = findOa(newTray[index]._asignatura_id, value, newTray[index].oa_id);
          if (oa?.habilidad_core) {
            loadEvalSugerencias(index, oa.habilidad_core, value, 'Significativa');
          }
        }
      }
    }

    // When asignatura changes, load Ejes
    if (field === '_asignatura_id') {
      loadEjes(value, index);
      newTray[index]._eje = '';
      newTray[index].oa_id = '';
      newTray[index].nivel_trabajo_id = '';
      newTray[index].diferencia_calculada = 0;
      newTray[index].tipo_adecuacion = 'Acceso';
    }

    // When eje changes, reset OA (eje is client-side filter only)
    if (field === '_eje') {
      newTray[index].oa_id = '';
    }

    // When OA changes, load indicadores
    if (field === 'oa_id' && value) {
      loadIndicadores(value);
      // Load core suggestions (estrategias, activación PACI)
      loadCoreSugerencias(index, newTray[index]);
    }

    onChange('trayectoria', newTray);
  };

  const addItem = () => {
    onChange('trayectoria', [
      ...trayectoria,
      {
        _asignatura_id: paciAsignaturaId,
        _eje: '',
        _unidad: '',
        oa_id: '',
        nivel_trabajo_id: '',
        diferencia_calculada: 0,
        tipo_adecuacion: 'Acceso',
        justificacion_tecnica: '',
        indicadores_seleccionados: [],
        adecuacion_oa: {
          meta_integradora: '',
          estrategias: '',
          adecuaciones: '',
          instrumento_evaluacion: '',
          justificacion: '',
          criterios_evaluacion: '',
          observaciones: '',
        },
        meta_especifica: '',
        estrategias_dua: '',
        habilidades: '',
        seguimiento_registro: '',
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

  const findOa = (asignaturaId, nivelId, oaId) => {
    const key = `${asignaturaId}_${nivelId}`;
    const oas = oaList[key] || [];
    return oas.find((o) => o.id === oaId);
  };

  const toggleIndicadores = (index) => {
    setExpandedIndicadores((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleMeta = (index) => {
    setExpandedMeta((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleIndicadorSelection = (index, indicadorId) => {
    const newTray = [...trayectoria];
    const selected = newTray[index].indicadores_seleccionados || [];
    if (selected.includes(indicadorId)) {
      newTray[index].indicadores_seleccionados = selected.filter((id) => id !== indicadorId);
    } else {
      newTray[index].indicadores_seleccionados = [...selected, indicadorId];
    }
    onChange('trayectoria', newTray);
  };

  const updateAdecuacionOa = (index, field, value) => {
    const newTray = [...trayectoria];
    newTray[index].adecuacion_oa = { ...(newTray[index].adecuacion_oa || {}), [field]: value };
    onChange('trayectoria', newTray);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 3: Trayectoria de Objetivos de Aprendizaje</h2>
        <p className="text-sm text-secondary mt-1">
          Agregue los OA a trabajar. El sistema calculará automáticamente el tipo de adecuación según la diferencia entre el nivel oficial y el nivel de trabajo. <strong>La advertencia de Adecuación Significativa es informativa y puede completarse después.</strong>
        </p>
        {nivelOficial > 0 && (
          <p className="text-sm text-primary font-medium mt-1">
            Nivel oficial del estudiante: <strong>{estudiante?.curso_nivel_nombre}</strong> (valor: {nivelOficial})
          </p>
        )}
      </div>

      {/* OA Items */}
      {trayectoria.map((item, index) => {
        const ejesOptions = ejesPorAsignatura[item._asignatura_id] || [];
        const oaKey = `${item._asignatura_id}_${item.nivel_trabajo_id}`;
        const allOas = oaList[oaKey] || [];
        const oas = item._eje ? allOas.filter(o => o.eje === item._eje) : allOas;
        const selectedOa = findOa(item._asignatura_id, item.nivel_trabajo_id, item.oa_id);
        const isSignificativa = item.tipo_adecuacion === 'Significativa';
        const sug = evalSugerencias[index];
        const indicadores = indicadoresPorOa[item.oa_id] || { L: [], ED: [], NL: [] };
        const hasIndicadores = indicadores.L.length > 0 || indicadores.ED.length > 0 || indicadores.NL.length > 0;

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

            {/* Cascada: Eje -> Nivel -> OA (Asignatura ya seleccionada en Paso 1) */}
            <SearchSelect
              id={`eje_${index}`}
              label="1. Eje (opcional)"
              placeholder={loadingEjes[index] ? 'Cargando ejes...' : ejesOptions.length === 0 ? 'Sin ejes disponibles para esta asignatura' : 'Seleccione eje'}
              value={item._eje || ''}
              onChange={(val) => updateItem(index, '_eje', val)}
              options={ejesOptions.map((e) => ({ value: e.eje || e.nombre, label: e.eje || e.nombre }))}
              disabled={!!loadingEjes[index]}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <SearchSelect
                id={`nivel_${index}`}
                label="2. Nivel de Trabajo *"
                placeholder="Seleccione nivel"
                value={item.nivel_trabajo_id}
                onChange={(val) => updateItem(index, 'nivel_trabajo_id', val)}
                options={sortedCursos.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (valor: ${c.valor_numerico})`,
                }))}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={item._unidad || ''}
                  onChange={(e) => updateItem(index, '_unidad', e.target.value)}
                >
                  <option value="">Sin unidad</option>
                  <option value="Unidad 1">Unidad 1</option>
                  <option value="Unidad 2">Unidad 2</option>
                  <option value="Unidad 3">Unidad 3</option>
                  <option value="Unidad 4">Unidad 4</option>
                  <option value="Unidad 5">Unidad 5</option>
                  <option value="Unidad 6">Unidad 6</option>
                  <option value="Unidad 7">Unidad 7</option>
                  <option value="Unidad 8">Unidad 8</option>
                </select>
              </div>
              
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
                    {isSignificativa && ' — Advertencia: DIF ≥ 3'}
                  </div>
                </div>
              </div>
            </div>

            {/* Unidad badge */}
            {item._unidad && (
              <div className="flex items-center gap-2">
                <Badge color="accent">{item._unidad}</Badge>
              </div>
            )}

            <SearchSelect
              id={`oa_${index}`}
              label="3. Objetivo de Aprendizaje *"
              placeholder={loadingOa[index] ? 'Cargando OAs...' : (!item._asignatura_id || !item.nivel_trabajo_id) ? 'Seleccione asignatura y nivel primero' : oas.length === 0 && item._eje ? `No hay OAs para el eje "${item._eje}"` : oas.length === 0 ? 'No se encontraron OAs para esta combinación' : 'Seleccione OA'}
              value={item.oa_id}
              onChange={(val) => updateItem(index, 'oa_id', val)}
              options={oas.map((o) => ({
                value: o.id,
                label: `${o.codigo_oa || o.id_oa} — ${o.texto_oa?.substring(0, 80)}...`,
              }))}
              disabled={!item._asignatura_id || !item.nivel_trabajo_id || loadingOa[index]}
            />

            {/* OA Detail */}
            {selectedOa && (
              <div className="rounded-lg bg-white border border-slate-200 p-3 text-sm space-y-2">
                <p className="text-slate-600">{selectedOa.texto_oa}</p>
                <div className="flex flex-wrap gap-4 text-xs text-secondary">
                  {selectedOa.eje && <span>Eje: <strong>{selectedOa.eje}</strong></span>}
                  {selectedOa.habilidad_core && <span>Habilidad: <strong>{selectedOa.habilidad_core}</strong></span>}
                  {selectedOa.tipo_oa && <span>Tipo: <strong>{selectedOa.tipo_oa}</strong></span>}
                  {selectedOa.ambito && <span>Ámbito: <strong>{selectedOa.ambito}</strong></span>}
                  {selectedOa.nucleo && <span>Núcleo: <strong>{selectedOa.nucleo}</strong></span>}
                  {selectedOa.base_de_habilidades && <span>Base Habilidades: <strong>{selectedOa.base_de_habilidades}</strong></span>}
                  {selectedOa.nivel_logro && <span>Nivel Logro: <strong>{selectedOa.nivel_logro}</strong></span>}
                  {selectedOa.fuente && <span>Fuente: <strong>{selectedOa.fuente}</strong></span>}
                </div>
                {selectedOa.indicador_logro && (
                  <p className="text-xs text-slate-500 italic">Indicador: {selectedOa.indicador_logro}</p>
                )}

                {/* Indicadores Seleccionables */}
                {item.oa_id && (
                  <div className="border-t border-slate-200 pt-2">
                    <button
                      onClick={() => toggleIndicadores(index)}
                      className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 cursor-pointer"
                    >
                      {expandedIndicadores[index] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Indicadores de Evaluación {(item.indicadores_seleccionados || []).length > 0 && (
                        <Badge color="accent">{(item.indicadores_seleccionados || []).length} seleccionados</Badge>
                      )}
                      {loadingIndicadores[item.oa_id] && <span className="text-xs text-secondary">(Cargando...)</span>}
                    </button>

                    {expandedIndicadores[index] && hasIndicadores && (
                      <div className="mt-3 space-y-4">
                        <p className="text-xs text-secondary">
                          Seleccione los indicadores que se utilizarán para evaluar este OA. Se recomienda al menos 1 indicador.
                        </p>
                        {[
                          { key: 'L', label: 'Logrado (L)', color: 'success' },
                          { key: 'ED', label: 'En Desarrollo (ED)', color: 'warning' },
                          { key: 'NL', label: 'No Logrado (NL)', color: 'danger' },
                        ].map(({ key, label, color }) => (
                          indicadores[key].length > 0 && (
                            <div key={key}>
                              <h5 className={`text-xs font-semibold text-${color} mb-2`}>{label}</h5>
                              <div className="space-y-1.5">
                                {indicadores[key].map((ind) => {
                                  const isSelected = (item.indicadores_seleccionados || []).includes(ind.id);
                                  return (
                                    <label
                                      key={ind.id}
                                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer transition-all ${
                                        isSelected
                                          ? 'border-primary bg-primary/5 text-slate-900 shadow-sm'
                                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleIndicadorSelection(index, ind.id)}
                                        className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                                      />
                                      <span>{ind.texto_indicador}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {expandedIndicadores[index] && !hasIndicadores && !loadingIndicadores[item.oa_id] && (
                      <p className="text-xs text-secondary mt-2">No hay indicadores asociados a este OA.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Meta Integradora / Adecuación OA */}
            {item.oa_id && (
              <div className="border-t border-slate-200 pt-3">
                <button
                  onClick={() => toggleMeta(index)}
                  className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 cursor-pointer"
                >
                  {expandedMeta[index] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <Target className="h-4 w-4" />
                  Meta Integradora y Adecuaciones
                  {item.adecuacion_oa?.meta_integradora && <Badge color="accent">Completada</Badge>}
                </button>

                {expandedMeta[index] && (
                  <div className="mt-3 space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-secondary">
                        Defina la meta integradora, estrategias de adecuación y criterios de evaluación específicos para este OA.
                      </p>
                      <span className="shrink-0 ml-2 inline-flex items-center gap-1 text-xs text-primary">
                        <MessageCircle className="h-3.5 w-3.5" /> Use el chatbot para obtener ayuda pedagógica
                      </span>
                    </div>

                    <TextArea
                      id={`meta_integradora_${index}`}
                      label="Meta Integradora"
                      placeholder="Describa la meta integradora que articula los indicadores seleccionados..."
                      value={item.adecuacion_oa?.meta_integradora || ''}
                      onChange={(e) => updateAdecuacionOa(index, 'meta_integradora', e.target.value)}
                      rows={2}
                    />

                    <TextArea
                      id={`oa_estrategias_${index}`}
                      label="Estrategias de Adecuación"
                      placeholder="Describa las estrategias para alcanzar la meta integradora..."
                      value={item.adecuacion_oa?.estrategias || ''}
                      onChange={(e) => updateAdecuacionOa(index, 'estrategias', e.target.value)}
                      rows={2}
                    />

                    <TextArea
                      id={`oa_adecuaciones_${index}`}
                      label="Adecuaciones Curriculares"
                      placeholder="Describa las adecuaciones curriculares aplicadas..."
                      value={item.adecuacion_oa?.adecuaciones || ''}
                      onChange={(e) => updateAdecuacionOa(index, 'adecuaciones', e.target.value)}
                      rows={2}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextArea
                        id={`oa_instrumento_${index}`}
                        label="Instrumento de Evaluación"
                        placeholder="Instrumento a utilizar..."
                        value={item.adecuacion_oa?.instrumento_evaluacion || ''}
                        onChange={(e) => updateAdecuacionOa(index, 'instrumento_evaluacion', e.target.value)}
                        rows={2}
                      />

                      <TextArea
                        id={`oa_justificacion_${index}`}
                        label="Justificación"
                        placeholder="Justificación de las adecuaciones..."
                        value={item.adecuacion_oa?.justificacion || ''}
                        onChange={(e) => updateAdecuacionOa(index, 'justificacion', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <TextArea
                      id={`oa_criterios_${index}`}
                      label="Criterios de Evaluación"
                      placeholder="Criterios específicos para evaluar el logro de la meta..."
                      value={item.adecuacion_oa?.criterios_evaluacion || ''}
                      onChange={(e) => updateAdecuacionOa(index, 'criterios_evaluacion', e.target.value)}
                      rows={2}
                    />

                    <TextArea
                      id={`oa_observaciones_${index}`}
                      label="Observaciones"
                      placeholder="Observaciones adicionales..."
                      value={item.adecuacion_oa?.observaciones || ''}
                      onChange={(e) => updateAdecuacionOa(index, 'observaciones', e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Campos Pedagógicos Ampliados */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h5 className="text-sm font-semibold text-slate-900">Pedagogía Ampliada</h5>

              {/* Core Suggestions Panel */}
              {coreSugerencias[index] && (coreSugerencias[index].estrategias.length > 0 || coreSugerencias[index].activaciones.length > 0 || coreSugerencias[index].adecuaciones.length > 0) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-semibold">Sugerencias del Sistema Core</span>
                  </div>

                  {coreSugerencias[index].estrategias.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Estrategias sugeridas:</p>
                      <div className="space-y-1">
                        {coreSugerencias[index].estrategias.slice(0, 5).map((e, i) => (
                          <div key={i} className="text-xs text-slate-700 bg-white rounded px-2 py-1.5 border border-slate-100">
                            <strong>{e.estrategia}</strong>
                            {e.tipo && <span className="text-slate-400 ml-1">({e.tipo})</span>}
                            {e.recurso_sugerido && <p className="text-slate-500 mt-0.5">Recurso: {e.recurso_sugerido}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coreSugerencias[index].activaciones.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Activación PACI sugerida:</p>
                      <div className="space-y-1">
                        {coreSugerencias[index].activaciones.slice(0, 3).map((a, i) => (
                          <div key={i} className="text-xs text-slate-700 bg-white rounded px-2 py-1.5 border border-slate-100">
                            <strong>{a.habilidad_detectada}</strong>
                            {a.estrategia_sugerida && <p className="text-slate-500">Estrategia: {a.estrategia_sugerida}</p>}
                            {a.actividad_sugerida && <p className="text-slate-500">Actividad: {a.actividad_sugerida}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coreSugerencias[index].adecuaciones.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Adecuaciones sugeridas:</p>
                      <div className="space-y-1">
                        {coreSugerencias[index].adecuaciones.slice(0, 3).map((a, i) => (
                          <div key={i} className="text-xs text-slate-700 bg-white rounded px-2 py-1.5 border border-slate-100">
                            <strong>{a.tipo_adecuacion}</strong>: {a.descripcion}
                            {a.ejemplo && <p className="text-slate-500 mt-0.5">Ejemplo: {a.ejemplo}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <TextArea
                id={`meta_especifica_${index}`}
                label="Meta Específica"
                placeholder="Describa la meta específica del OA para este estudiante..."
                value={item.meta_especifica || ''}
                onChange={(e) => updateItem(index, 'meta_especifica', e.target.value)}
                rows={2}
              />

              <TextArea
                id={`estrategias_dua_${index}`}
                label="Estrategias (DUA)"
                placeholder="Describa las estrategias del Diseño Universal de Aprendizaje que se aplicarán..."
                value={item.estrategias_dua || ''}
                onChange={(e) => updateItem(index, 'estrategias_dua', e.target.value)}
                rows={2}
              />

              <TextArea
                id={`habilidades_${index}`}
                label="Habilidades"
                placeholder="Especifique las habilidades a desarrollar..."
                value={item.habilidades || ''}
                onChange={(e) => updateItem(index, 'habilidades', e.target.value)}
                rows={2}
              />
              
              <TextArea
                id={`seguimiento_${index}`}
                label="Seguimiento"
                placeholder="Describa el registro de seguimiento y observaciones..."
                value={item.seguimiento_registro || ''}
                onChange={(e) => updateItem(index, 'seguimiento_registro', e.target.value)}
                rows={2}
              />
            </div>

            {/* Significativa: Justification + Eval */}
            {isSignificativa && (
              <div className="space-y-4 border-t border-warning/30 pt-4">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Adecuación Significativa — Opcional por ahora</span>
                </div>

                <TextArea
                  id={`justificacion_${index}`}
                  label="Justificación Técnica"
                  placeholder="Fundamente técnicamente por qué se requiere una adecuación significativa para este OA..."
                  value={item.justificacion_tecnica || ''}
                  onChange={(e) => updateItem(index, 'justificacion_tecnica', e.target.value)}
                  rows={3}
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
