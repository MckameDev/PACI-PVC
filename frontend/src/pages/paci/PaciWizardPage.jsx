import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle, FileDown, Loader2, MessageSquare } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../stores/useAuthStore';
import Button from '../../components/ui/Button';
import StepIndicator from '../../components/ui/StepIndicator';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';

import StepIdentificacion from './steps/StepIdentificacion';
import StepPerfilDua from './steps/StepPerfilDua';
import StepTrayectoriaOa from './steps/StepTrayectoriaOa';
import StepPAEC from './steps/StepPAEC';
import StepHorarioApoyo from './steps/StepHorarioApoyo';
import StepResumen from './steps/StepResumen';
import PaciAiAssistantPanel from './components/PaciAiAssistantPanel';

const BASE_STEPS = [
  { key: 'identificacion', label: 'Identificacion' },
  { key: 'perfil_dua', label: 'Perfil DUA' },
  { key: 'trayectoria', label: 'Trayectoria OA' },
  { key: 'paec', label: 'PAEC' },
  { key: 'resumen', label: 'Resumen' },
];

const COMPLETO_STEPS = [
  { key: 'identificacion', label: 'Identificacion' },
  { key: 'perfil_dua', label: 'Perfil DUA' },
  { key: 'trayectoria', label: 'Trayectoria OA' },
  { key: 'paec', label: 'PAEC' },
  { key: 'horario_apoyo', label: 'Horario Apoyo' },
  { key: 'resumen', label: 'Resumen' },
];

const defaultHorarioApoyo = {
  columnas: [
    { key: 'hora', titulo: 'Hora', orden: 1, es_fija: 1 },
    { key: 'lunes', titulo: 'Lunes', orden: 2, es_fija: 1 },
    { key: 'martes', titulo: 'Martes', orden: 3, es_fija: 1 },
    { key: 'miercoles', titulo: 'Miercoles', orden: 4, es_fija: 1 },
    { key: 'jueves', titulo: 'Jueves', orden: 5, es_fija: 1 },
    { key: 'viernes', titulo: 'Viernes', orden: 6, es_fija: 1 },
  ],
  filas: Array.from({ length: 3 }, (_, i) => ({
    id: `row_${i + 1}`,
    orden: i + 1,
    hora: '',
    celdas: {
      lunes: '',
      martes: '',
      miercoles: '',
      jueves: '',
      viernes: '',
    },
  })),
};

const toStartMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})\s-\s(\d{2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return Number.POSITIVE_INFINITY;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return Number.POSITIVE_INFINITY;
  return h * 60 + m;
};

const defaultFormData = {
  estudiante_id: '',
  asignatura_id: '',
  fecha_emision: new Date().toISOString().slice(0, 10),
  formato_generado: 'Compacto',
  anio_escolar: new Date().getFullYear().toString(),
  profesor_jefe: '',
  profesor_asignatura: '',
  educador_diferencial: '',
  aplica_paec: 0,
  paec_activadores: '',
  paec_estrategias: '',
  paec_desregulacion: '',
  paec_variables: [],
  perfil_dua: {
    fortalezas: '',
    barreras: '',
    barreras_personalizadas: '',
    acceso_curricular: '',
    preferencias_representacion: '',
    preferencias_expresion: '',
    preferencias_motivacion: '',
    habilidades_base: '',
  },
  fortaleza_ids: [],
  barrera_ids: [],
  estrategia_dua_ids: [],
  acceso_curricular_ids: [],
  habilidad_base_ids: [],
  trayectoria: [],
  horario_apoyo: defaultHorarioApoyo,
};

const normalizeTrayectoriaItem = (item) => ({
  _asignatura_id: item?._asignatura_id || '',
  _eje: item?._eje || '',
  _unidad: item?._unidad || '',
  oa_id: item?.oa_id || '',
  nivel_trabajo_id: item?.nivel_trabajo_id || '',
  diferencia_calculada: Number(item?.diferencia_calculada || 0),
  tipo_adecuacion: item?.tipo_adecuacion || 'Acceso',
  justificacion_tecnica: item?.justificacion_tecnica || '',
  indicadores_seleccionados: Array.isArray(item?.indicadores_seleccionados) ? item.indicadores_seleccionados : [],
  adecuacion_oa: {
    meta_integradora: item?.adecuacion_oa?.meta_integradora || '',
    estrategias: item?.adecuacion_oa?.estrategias || '',
    indicadores_nivelados: item?.adecuacion_oa?.indicadores_nivelados || '',
    adecuaciones: item?.adecuacion_oa?.adecuaciones || '',
    actividades_graduales: item?.adecuacion_oa?.actividades_graduales || '',
    lectura_complementaria: item?.adecuacion_oa?.lectura_complementaria || '',
    instrumento_evaluacion: item?.adecuacion_oa?.instrumento_evaluacion || '',
    justificacion: item?.adecuacion_oa?.justificacion || '',
    criterios_evaluacion: item?.adecuacion_oa?.criterios_evaluacion || '',
    observaciones: item?.adecuacion_oa?.observaciones || '',
  },
  meta_especifica: item?.meta_especifica || '',
  estrategias_dua: item?.estrategias_dua || '',
  habilidades: item?.habilidades || '',
  seguimiento_registro: item?.seguimiento_registro || '',
  eval_modalidad: item?.eval_modalidad || '',
  eval_instrumento: item?.eval_instrumento || '',
  eval_criterio: item?.eval_criterio || '',
});

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  'estudiante_id',
  'asignatura_id',
  'fecha_emision',
  'formato_generado',
  'anio_escolar',
  'profesor_jefe',
  'profesor_asignatura',
  'educador_diferencial',
  'aplica_paec',
  'paec_activadores',
  'paec_estrategias',
  'paec_desregulacion',
  'paec_variables',
  'perfil_dua',
  'trayectoria',
  'horario_apoyo',
]);

const pickValidSuggestionFields = (suggestion) => {
  if (!suggestion || typeof suggestion !== 'object') return {};

  return Object.entries(suggestion).reduce((acc, [key, value]) => {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) return acc;
    acc[key] = value;
    return acc;
  }, {});
};

const normalizeSuggestionValueByField = (field, value, prev) => {
  switch (field) {
    case 'estudiante_id':
    case 'asignatura_id':
      return value ? String(value) : '';
    case 'fecha_emision': {
      const v = String(value || '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : prev?.fecha_emision || defaultFormData.fecha_emision;
    }
    case 'formato_generado': {
      const normalized = String(value || '').trim();
      return normalized === 'Completo' || normalized === 'Compacto'
        ? normalized
        : (prev?.formato_generado || defaultFormData.formato_generado);
    }
    case 'anio_escolar': {
      const v = String(value || '').trim();
      return /^\d{4}$/.test(v) ? v : (prev?.anio_escolar || defaultFormData.anio_escolar);
    }
    case 'profesor_jefe':
    case 'profesor_asignatura':
    case 'educador_diferencial':
    case 'paec_activadores':
    case 'paec_estrategias':
    case 'paec_desregulacion':
      return String(value || '');
    case 'aplica_paec': {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? 1 : 0;
    }
    case 'paec_variables': {
      if (!Array.isArray(value)) return Array.isArray(prev?.paec_variables) ? prev.paec_variables : [];
      return value.map((v, idx) => ({
        tipo: String(v?.tipo || ''),
        descripcion: String(v?.descripcion || ''),
        estrategia: String(v?.estrategia || ''),
        orden: Number(v?.orden || idx + 1),
      }));
    }
    default:
      return value;
  }
};

const sanitizeSuggestion = (suggestion, prev) => {
  const validFields = pickValidSuggestionFields(suggestion);

  return Object.entries(validFields).reduce((acc, [field, value]) => {
    acc[field] = normalizeSuggestionValueByField(field, value, prev);
    return acc;
  }, {});
};

export default function PaciWizardPage() {
  const navigate = useNavigate();
  useAuthStore((s) => s.user);

  // ---------- State ----------
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [savedPaciId, setSavedPaciId] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [assistantState, setAssistantState] = useState(null);
  const [fieldHelpRequest, setFieldHelpRequest] = useState(null);
  const fieldHelpSeq = useRef(0);

  // Draft-related state
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftModal, setDraftModal] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const draftDataRef = useRef(null);
  const draftReady = useRef(false);

  const activeSteps = formData.formato_generado === 'Completo' ? COMPLETO_STEPS : BASE_STEPS;
  const currentStepKey = activeSteps[currentStep - 1]?.key;

  useEffect(() => {
    if (currentStep > activeSteps.length) {
      setCurrentStep(activeSteps.length);
    }
  }, [currentStep, activeSteps.length]);

  // ---------- Load draft from server on mount ----------
  useEffect(() => {
    let cancelled = false;
    const fetchDraft = async () => {
      try {
        const res = await api.get('/paci-borrador');
        const d = res.data.data;
        if (cancelled) return;

        const formato = d.form_data?.formato_generado || 'Compacto';
        const totalPasos = formato === 'Completo' ? COMPLETO_STEPS.length : BASE_STEPS.length;

        setDraftMeta({
          nombre: d.estudiante_nombre || 'Sin nombre',
          rut: d.estudiante_rut || '-',
          asignatura: d.asignatura_nombre || '-',
          paso: d.paso_actual || 1,
          totalPasos,
        });

        draftDataRef.current = {
          formData: d.form_data,
          step: d.paso_actual || 1,
        };
        setDraftModal(true);
      } catch {
        // 404 = no draft, just start fresh
        draftReady.current = true;
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    };

    fetchDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Draft modal handlers ----------
  const handleContinueDraft = () => {
    if (draftDataRef.current) {
      const merged = {
        ...defaultFormData,
        ...draftDataRef.current.formData,
        horario_apoyo: draftDataRef.current.formData?.horario_apoyo || defaultHorarioApoyo,
      };

      const maxSteps = merged.formato_generado === 'Completo' ? COMPLETO_STEPS.length : BASE_STEPS.length;

      setFormData(merged);
      setAssistantState(merged.ai_assistant || null);
      setCurrentStep(Math.min(draftDataRef.current.step, maxSteps));
    }

    draftDataRef.current = null;
    draftReady.current = true;
    setDraftModal(false);
  };

  const handleDiscardDraft = async () => {
    try {
      await api.patch('/paci-borrador');
    } catch {
      // ignore
    }
    setAssistantState(null);
    draftDataRef.current = null;
    draftReady.current = true;
    setDraftModal(false);
  };

  // ---------- Save draft to server ----------
  const saveDraft = useCallback(async (fd, step) => {
    if (!draftReady.current) return;
    try {
      const draftFormData = {
        ...fd,
        ai_assistant: assistantState || fd.ai_assistant || null,
      };

      await api.put('/paci-borrador', {
        paso_actual: step,
        form_data: draftFormData,
        estudiante_id: fd.estudiante_id || null,
        asignatura_id: fd.asignatura_id || null,
      });
    } catch {
      // silent
    }
  }, [assistantState]);

  const deleteDraft = useCallback(async () => {
    try {
      await api.patch('/paci-borrador');
    } catch {
      // ignore
    }
  }, []);

  // Button: manual save draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    await saveDraft(formData, currentStep);
    setSavingDraft(false);
    setAlert({ type: 'success', message: 'Borrador guardado correctamente.' });
  };

  // ---------- Student loader ----------
  useEffect(() => {
    if (!formData.estudiante_id) {
      setEstudiante(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/estudiantes/${formData.estudiante_id}`);
        if (!cancelled) setEstudiante(res.data.data);
      } catch {
        if (!cancelled) setEstudiante(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.estudiante_id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyAiSuggestion = useCallback((suggestion, options = {}) => {
    setFormData((prev) => {
      const safeSuggestion = sanitizeSuggestion(suggestion, prev);

      const merged = {
        ...prev,
        ...safeSuggestion,
      };

      if (safeSuggestion?.perfil_dua && typeof safeSuggestion.perfil_dua === 'object') {
        merged.perfil_dua = {
          ...prev.perfil_dua,
          ...safeSuggestion.perfil_dua,
        };
      }

      if (Array.isArray(safeSuggestion?.trayectoria)) {
        merged.trayectoria = safeSuggestion.trayectoria.map(normalizeTrayectoriaItem);
      }

      if (safeSuggestion?.horario_apoyo && typeof safeSuggestion.horario_apoyo === 'object') {
        merged.horario_apoyo = {
          ...defaultHorarioApoyo,
          ...safeSuggestion.horario_apoyo,
        };
      }

      return merged;
    });

    if (!options.silent) {
      setAlert({
        type: 'success',
        message: 'Se aplicó una propuesta generada por IA al formulario PACI. Revisa y confirma antes de guardar.',
      });
    }
  }, []);

  const handleRequestFieldHelp = useCallback((payload) => {
    fieldHelpSeq.current += 1;
    setFieldHelpRequest({
      id: `help_${fieldHelpSeq.current}`,
      ...payload,
    });
    setAiPanelOpen(true);
  }, []);

  const handleFieldHelpConsumed = useCallback((helpId) => {
    setFieldHelpRequest((current) => (current?.id === helpId ? null : current));
  }, []);

  // ---------- Validation ----------
  const validateStep = (stepKey) => {
    switch (stepKey) {
      case 'identificacion':
        if (!formData.estudiante_id) return 'Debe seleccionar un estudiante';
        if (!formData.asignatura_id) return 'Debe seleccionar una asignatura';
        if (!formData.fecha_emision) return 'Debe ingresar la fecha de emision';
        if (!formData.formato_generado) return 'Debe seleccionar un formato de salida';
        return null;
      case 'perfil_dua':
        return null;
      case 'trayectoria':
        if (formData.trayectoria.length === 0) return 'Debe agregar al menos un Objetivo de Aprendizaje';
        for (let i = 0; i < formData.trayectoria.length; i += 1) {
          const item = formData.trayectoria[i];
          if (!item.oa_id) return `OA #${i + 1}: Debe seleccionar un Objetivo de Aprendizaje`;
          if (!item.nivel_trabajo_id) return `OA #${i + 1}: Debe seleccionar un Nivel de Trabajo`;
          const selectedIndicadores = Array.isArray(item.indicadores_seleccionados) ? item.indicadores_seleccionados.length : 0;
          if (selectedIndicadores < 6) {
            return `OA #${i + 1}: Debe seleccionar al menos 6 indicadores. Recomendación pedagógica obligatoria: 2 de L, 2 de ED y 2 de NL.`;
          }
          if (item.tipo_adecuacion === 'Significativa' && !item.justificacion_tecnica?.trim()) {
            return `OA #${i + 1}: La Justificacion Tecnica es obligatoria para adecuaciones Significativas`;
          }
        }
        return null;
      default:
        return null;
    }
  };

  // ---------- Navigation ----------
  const handleNext = async () => {
    const error = validateStep(currentStepKey);
    if (error) {
      setAlert({ type: 'error', message: error });
      return;
    }

    setAlert({ type: '', message: '' });

    let nextFormData = formData;
    if (currentStepKey === 'horario_apoyo') {
      const source = formData.horario_apoyo || defaultHorarioApoyo;
      const sortedRows = [...(source.filas || [])]
        .sort((a, b) => toStartMinutes(a?.hora) - toStartMinutes(b?.hora))
        .map((row, index) => ({ ...row, orden: index + 1 }));

      nextFormData = {
        ...formData,
        horario_apoyo: {
          ...source,
          filas: sortedRows,
        },
      };
      setFormData(nextFormData);
    }

    const nextStep = Math.min(currentStep + 1, activeSteps.length);
    setCurrentStep(nextStep);
    await saveDraft(nextFormData, nextStep);
  };

  const handleBack = async () => {
    setAlert({ type: '', message: '' });
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    await saveDraft(formData, prevStep);
  };

  // ---------- Final save ----------
  const handleSave = async () => {
    const error = validateStep('trayectoria');
    if (error) {
      setAlert({ type: 'error', message: error });
      return;
    }

    setSaving(true);
    setAlert({ type: '', message: '' });

    try {
      const horarioPayload = (() => {
        if (formData.formato_generado !== 'Completo') return null;

        const source = formData.horario_apoyo || defaultHorarioApoyo;
        const columnas = Array.isArray(source.columnas) && source.columnas.length > 0
          ? source.columnas
          : defaultHorarioApoyo.columnas;

        const baseRows = Array.isArray(source.filas) && source.filas.length > 0
          ? source.filas
          : defaultHorarioApoyo.filas;

        const filas = baseRows.map((row, index) => ({
          ...row,
          orden: row?.orden ?? (index + 1),
          hora: row?.hora || '',
          celdas: {
            ...(row?.celdas || {}),
          },
        }));

        return { columnas, filas };
      })();

      const payload = {
        estudiante_id: formData.estudiante_id,
        asignatura_id: formData.asignatura_id,
        fecha_emision: formData.fecha_emision,
        formato_generado: formData.formato_generado,
        anio_escolar: formData.anio_escolar || null,
        profesor_jefe: formData.profesor_jefe || null,
        profesor_asignatura: formData.profesor_asignatura || null,
        educador_diferencial: formData.educador_diferencial || null,
        aplica_paec: formData.aplica_paec,
        paec_activadores: formData.paec_activadores || null,
        paec_estrategias: formData.paec_estrategias || null,
        paec_desregulacion: formData.paec_desregulacion || null,
        paec_variables: (formData.paec_variables || []).map((v, i) => ({
          tipo: v.tipo,
          descripcion: v.descripcion || '',
          estrategia: v.estrategia || '',
          orden: v.orden ?? (i + 1),
        })),
        perfil_dua: formData.perfil_dua,
        fortaleza_ids: formData.fortaleza_ids || [],
        barrera_ids: formData.barrera_ids || [],
        estrategia_dua_ids: formData.estrategia_dua_ids || [],
        acceso_curricular_ids: formData.acceso_curricular_ids || [],
        habilidad_base_ids: formData.habilidad_base_ids || [],
        horario_apoyo: horarioPayload,
        trayectoria: formData.trayectoria.map((item) => ({
          oa_id: item.oa_id,
          nivel_trabajo_id: item.nivel_trabajo_id,
          diferencia_calculada: item.diferencia_calculada,
          tipo_adecuacion: item.tipo_adecuacion,
          justificacion_tecnica: item.justificacion_tecnica || null,
          meta_especifica: item.meta_especifica || null,
          estrategias_dua: item.estrategias_dua || null,
          habilidades: item.habilidades || null,
          seguimiento_registro: item.seguimiento_registro || null,
          eval_modalidad: item.eval_modalidad || null,
          eval_instrumento: item.eval_instrumento || null,
          eval_criterio: item.eval_criterio || null,
          indicadores_seleccionados: item.indicadores_seleccionados || [],
          adecuacion_oa: item.adecuacion_oa || null,
        })),
      };

      const res = await api.post('/paci', payload);
      const paciId = res.data.data?.id;
      setSavedPaciId(paciId);
      setAssistantState(null);
      await deleteDraft();
      setAlert({ type: 'success', message: 'PACI creado exitosamente' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar el PACI';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Loading state ----------
  if (draftLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-secondary">Cargando borrador...</span>
      </div>
    );
  }

  // ---------- Success state ----------
  if (savedPaciId) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">PACI creado exitosamente</h2>
          <p className="mt-2 text-sm text-secondary">
            El Plan de Adecuacion Curricular Individual ha sido guardado correctamente.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/paci/${savedPaciId}`)}>
            Ver detalle
          </Button>
          <Button onClick={() => navigate('/paci')}>
            Ir a listado PACI
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Main wizard ----------
  const wizardContainerClass = currentStepKey === 'horario_apoyo'
    ? 'mx-auto max-w-7xl space-y-6'
    : 'mx-auto max-w-4xl space-y-6';

  const mainContainerClass = aiPanelOpen
    ? 'mx-auto max-w-[1500px] space-y-6'
    : wizardContainerClass;

  return (
    <div className={mainContainerClass}>
      {/* Draft modal */}
      <Modal open={draftModal} onClose={() => {}} title="Borrador encontrado">
        <div className="space-y-4">
          <p className="text-sm text-secondary">Tiene un borrador PACI en progreso:</p>
          <div className="rounded-lg bg-slate-50 p-4 space-y-1 text-sm">
            <p><span className="font-medium text-slate-700">Estudiante:</span> {draftMeta?.nombre} ({draftMeta?.rut})</p>
            <p><span className="font-medium text-slate-700">Asignatura:</span> {draftMeta?.asignatura}</p>
            <p><span className="font-medium text-slate-700">Paso guardado:</span> {draftMeta?.paso} de {draftMeta?.totalPasos || activeSteps.length}</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" className="text-danger border-danger/30 hover:bg-danger/5" onClick={handleDiscardDraft}>
              Descartar y empezar de nuevo
            </Button>
            <Button onClick={handleContinueDraft}>Continuar borrador</Button>
          </div>
        </div>
      </Modal>

      {/* Step indicator */}
      <StepIndicator steps={activeSteps.map((step) => step.label)} currentStep={currentStep} />

      {/* Alert */}
      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      <div className={aiPanelOpen ? 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start' : ''}>
        <div>
          {/* Step content */}
          <div>
            {currentStepKey === 'identificacion' && (
              <StepIdentificacion
                data={formData}
                onChange={handleChange}
                onRequestFieldHelp={handleRequestFieldHelp}
              />
            )}
            {currentStepKey === 'perfil_dua' && (
              <StepPerfilDua data={formData} onChange={handleChange} />
            )}
            {currentStepKey === 'trayectoria' && (
              <StepTrayectoriaOa
                data={formData}
                onChange={handleChange}
                estudiante={estudiante}
                onRequestFieldHelp={handleRequestFieldHelp}
              />
            )}
            {currentStepKey === 'paec' && (
              <StepPAEC data={formData} onChange={handleChange} />
            )}
            {currentStepKey === 'horario_apoyo' && (
              <StepHorarioApoyo data={formData} onChange={handleChange} />
            )}
            {currentStepKey === 'resumen' && (
              <StepResumen data={formData} estudiante={estudiante} />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
            <div>
              {currentStep > 1 && (
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/paci')}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={handleSaveDraft} loading={savingDraft}>
                <FileDown className="h-4 w-4" /> Guardar borrador
              </Button>
              {currentStep < activeSteps.length ? (
                <Button onClick={handleNext}>
                  Siguiente <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSave} loading={saving}>
                  <Save className="h-4 w-4" /> Guardar PACI
                </Button>
              )}
            </div>
          </div>
        </div>

        {aiPanelOpen && (
          <div className="xl:sticky xl:top-4">
            <PaciAiAssistantPanel
              onApplySuggestion={handleApplyAiSuggestion}
              isOpen={aiPanelOpen}
              onToggle={() => setAiPanelOpen(false)}
              helpRequest={fieldHelpRequest}
              onHelpRequestHandled={handleFieldHelpConsumed}
              assistantState={assistantState || formData.ai_assistant || null}
              onAssistantStateChange={setAssistantState}
              activeStepMeta={{
                currentStep,
                totalSteps: activeSteps.length,
                currentStepKey,
                currentStepLabel: activeSteps[currentStep - 1]?.label || '',
              }}
              formSnapshot={formData}
            />
          </div>
        )}
      </div>

      {!aiPanelOpen && (
        <button
          type="button"
          onClick={() => setAiPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:opacity-95"
        >
          <MessageSquare className="h-4 w-4" /> Abrir chat IA
        </button>
      )}
    </div>
  );
}
