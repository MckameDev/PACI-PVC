import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle, FileDown, Loader2 } from 'lucide-react';
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
import StepResumen from './steps/StepResumen';

const STEPS = ['Identificación', 'Perfil DUA', 'Trayectoria OA', 'PAEC', 'Resumen'];

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
};

export default function PaciWizardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // ---------- State ----------
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [savedPaciId, setSavedPaciId] = useState(null);
  const [estudiante, setEstudiante] = useState(null);

  // Draft-related state
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftModal, setDraftModal] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null); // { nombre, rut, asignatura, paso }
  const draftDataRef = useRef(null); // holds parsed form_data until user decides
  const draftReady = useRef(false); // prevents auto-save until draft resolution

  // ---------- Load draft from server on mount ----------
  useEffect(() => {
    let cancelled = false;
    const fetchDraft = async () => {
      try {
        const res = await api.get('/paci-borrador');
        const d = res.data.data;
        if (cancelled) return;

        const nombre = d.estudiante_nombre || 'Sin nombre';

        setDraftMeta({
          nombre,
          rut: d.estudiante_rut || '—',
          asignatura: d.asignatura_nombre || '—',
          paso: d.paso_actual || 1,
        });
        draftDataRef.current = { formData: d.form_data, step: d.paso_actual || 1 };
        setDraftModal(true);
      } catch {
        // 404 = no draft, just start fresh
        draftReady.current = true;
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    };
    fetchDraft();
    return () => { cancelled = true; };
  }, []);

  // ---------- Draft modal handlers ----------
  const handleContinueDraft = () => {
    if (draftDataRef.current) {
      setFormData({ ...defaultFormData, ...draftDataRef.current.formData });
      setCurrentStep(draftDataRef.current.step);
    }
    draftDataRef.current = null;
    draftReady.current = true;
    setDraftModal(false);
  };

  const handleDiscardDraft = async () => {
    try { await api.patch('/paci-borrador'); } catch { /* ignore */ }
    draftDataRef.current = null;
    draftReady.current = true;
    setDraftModal(false);
  };

  // ---------- Save draft to server ----------
  const saveDraft = useCallback(async (fd, step) => {
    if (!draftReady.current) return;
    try {
      await api.put('/paci-borrador', {
        paso_actual: step,
        form_data: fd,
        estudiante_id: fd.estudiante_id || null,
        asignatura_id: fd.asignatura_id || null,
      });
    } catch { /* silent */ }
  }, []);

  const deleteDraft = useCallback(async () => {
    try { await api.patch('/paci-borrador'); } catch { /* ignore */ }
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
    if (!formData.estudiante_id) { setEstudiante(null); return; }
    let c = false;
    (async () => {
      try {
        const res = await api.get(`/estudiantes/${formData.estudiante_id}`);
        if (!c) setEstudiante(res.data.data);
      } catch { if (!c) setEstudiante(null); }
    })();
    return () => { c = true; };
  }, [formData.estudiante_id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ---------- Validation ----------
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.estudiante_id) return 'Debe seleccionar un estudiante';
        if (!formData.asignatura_id) return 'Debe seleccionar una asignatura';
        if (!formData.fecha_emision) return 'Debe ingresar la fecha de emisión';
        if (!formData.formato_generado) return 'Debe seleccionar un formato de salida';
        return null;
      case 2:
        return null;
      case 3:
        if (formData.trayectoria.length === 0) return 'Debe agregar al menos un Objetivo de Aprendizaje';
        for (let i = 0; i < formData.trayectoria.length; i++) {
          const item = formData.trayectoria[i];
          if (!item.oa_id) return `OA #${i + 1}: Debe seleccionar un Objetivo de Aprendizaje`;
          if (!item.nivel_trabajo_id) return `OA #${i + 1}: Debe seleccionar un Nivel de Trabajo`;
          if (item.tipo_adecuacion === 'Significativa' && !item.justificacion_tecnica?.trim()) {
            return `OA #${i + 1}: La Justificación Técnica es obligatoria para adecuaciones Significativas`;
          }
        }
        return null;
      default:
        return null;
    }
  };

  // ---------- Navigation ----------
  const handleNext = async () => {
    const error = validateStep(currentStep);
    if (error) { setAlert({ type: 'error', message: error }); return; }
    setAlert({ type: '', message: '' });
    const nextStep = Math.min(currentStep + 1, STEPS.length);
    setCurrentStep(nextStep);
    await saveDraft(formData, nextStep);
  };

  const handleBack = async () => {
    setAlert({ type: '', message: '' });
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    await saveDraft(formData, prevStep);
  };

  // ---------- Final save ----------
  const handleSave = async () => {
    const error = validateStep(3);
    if (error) { setAlert({ type: 'error', message: error }); return; }

    setSaving(true);
    setAlert({ type: '', message: '' });

    try {
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
        <span className="ml-3 text-secondary">Cargando borrador…</span>
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
          <h2 className="text-2xl font-bold text-slate-900">¡PACI Creado Exitosamente!</h2>
          <p className="mt-2 text-sm text-secondary">
            El Plan de Adecuación Curricular Individual ha sido guardado correctamente.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/paci/${savedPaciId}`)}>
            Ver Detalle
          </Button>
          <Button onClick={() => navigate('/paci')}>
            Ir a Listado PACI
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Main wizard ----------
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Draft modal */}
      <Modal open={draftModal} onClose={() => {}} title="Borrador encontrado">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Tiene un borrador PACI en progreso:
          </p>
          <div className="rounded-lg bg-slate-50 p-4 space-y-1 text-sm">
            <p><span className="font-medium text-slate-700">Estudiante:</span> {draftMeta?.nombre} ({draftMeta?.rut})</p>
            <p><span className="font-medium text-slate-700">Asignatura:</span> {draftMeta?.asignatura}</p>
            <p><span className="font-medium text-slate-700">Paso guardado:</span> {draftMeta?.paso} de {STEPS.length}</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" className="text-danger border-danger/30 hover:bg-danger/5" onClick={handleDiscardDraft}>
              Descartar y empezar de nuevo
            </Button>
            <Button onClick={handleContinueDraft}>
              Continuar borrador
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Alert */}
      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Step content */}
      <div>
        {currentStep === 1 && (
          <StepIdentificacion data={formData} onChange={handleChange} />
        )}
        {currentStep === 2 && (
          <StepPerfilDua data={formData} onChange={handleChange} />
        )}
        {currentStep === 3 && (
          <StepTrayectoriaOa data={formData} onChange={handleChange} estudiante={estudiante} />
        )}
        {currentStep === 4 && (
          <StepPAEC data={formData} onChange={handleChange} />
        )}
        {currentStep === 5 && (
          <StepResumen data={formData} estudiante={estudiante} />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
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
            <FileDown className="h-4 w-4" /> Guardar Borrador
          </Button>
          {currentStep < STEPS.length ? (
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
  );
}
