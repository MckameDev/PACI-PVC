import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../stores/useAuthStore';
import Button from '../../components/ui/Button';
import StepIndicator from '../../components/ui/StepIndicator';
import Alert from '../../components/ui/Alert';

import StepIdentificacion from './steps/StepIdentificacion';
import StepPerfilDua from './steps/StepPerfilDua';
import StepTrayectoriaOa from './steps/StepTrayectoriaOa';
import StepPAEC from './steps/StepPAEC';
import StepHorarioApoyo from './steps/StepHorarioApoyo';
import StepResumen from './steps/StepResumen';

const BASE_STEPS = [
  { key: 'identificacion', label: 'Identificación' },
  { key: 'perfil_dua', label: 'Perfil DUA' },
  { key: 'trayectoria', label: 'Trayectoria OA' },
  { key: 'paec', label: 'PAEC' },
  { key: 'resumen', label: 'Resumen' },
];

const COMPLETO_STEPS = [
  { key: 'identificacion', label: 'Identificación' },
  { key: 'perfil_dua', label: 'Perfil DUA' },
  { key: 'trayectoria', label: 'Trayectoria OA' },
  { key: 'paec', label: 'PAEC' },
  { key: 'horario_apoyo', label: 'Horario Apoyo' },
  { key: 'resumen', label: 'Resumen' },
];

export default function PaciWizardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [savedPaciId, setSavedPaciId] = useState(null);

  // All PACI data in one state
  const [formData, setFormData] = useState({
    estudiante_id: '',
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
    // Matrix ID arrays (v2)
    fortaleza_ids: [],
    barrera_ids: [],
    estrategia_dua_ids: [],
    acceso_curricular_ids: [],
    habilidad_base_ids: [],
    trayectoria: [],
    horario_apoyo: {
      columnas: [
        { key: 'hora', titulo: 'Hora', orden: 1, es_fija: 1 },
        { key: 'lunes', titulo: 'Lunes', orden: 2, es_fija: 1 },
        { key: 'martes', titulo: 'Martes', orden: 3, es_fija: 1 },
        { key: 'miercoles', titulo: 'Miércoles', orden: 4, es_fija: 1 },
        { key: 'jueves', titulo: 'Jueves', orden: 5, es_fija: 1 },
        { key: 'viernes', titulo: 'Viernes', orden: 6, es_fija: 1 },
      ],
      filas: [],
    },
  });

  const activeSteps = formData.formato_generado === 'Completo' ? COMPLETO_STEPS : BASE_STEPS;
  const currentStepKey = activeSteps[currentStep - 1]?.key;

  useEffect(() => {
    if (currentStep > activeSteps.length) {
      setCurrentStep(activeSteps.length);
    }
  }, [currentStep, activeSteps.length]);

  // Store full student data for display in steps
  const [estudiante, setEstudiante] = useState(null);

  // Load student details when selected
  useEffect(() => {
    if (!formData.estudiante_id) {
      setEstudiante(null);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get(`/estudiantes/${formData.estudiante_id}`);
        setEstudiante(res.data.data);
      } catch {
        setEstudiante(null);
      }
    };
    load();
  }, [formData.estudiante_id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation per step
  const validateStep = (stepKey) => {
    switch (stepKey) {
      case 'identificacion':
        if (!formData.estudiante_id) return 'Debe seleccionar un estudiante';
        if (!formData.fecha_emision) return 'Debe ingresar la fecha de emisión';
        if (!formData.formato_generado) return 'Debe seleccionar un formato de salida';
        return null;
      case 'perfil_dua':
        // DUA is optional but useful
        return null;
      case 'trayectoria':
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

  const handleNext = () => {
    const error = validateStep(currentStepKey);
    if (error) {
      setAlert({ type: 'error', message: error });
      return;
    }
    setAlert({ type: '', message: '' });
    setCurrentStep((prev) => Math.min(prev + 1, activeSteps.length));
  };

  const handleBack = () => {
    setAlert({ type: '', message: '' });
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    const error = validateStep('trayectoria');
    if (error) {
      setAlert({ type: 'error', message: error });
      return;
    }

    setSaving(true);
    setAlert({ type: '', message: '' });

    try {
      // Prepare payload: remove _asignatura_id (frontend-only field)
      const payload = {
        estudiante_id: formData.estudiante_id,
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
        // Matrix ID arrays (v2)
        fortaleza_ids: formData.fortaleza_ids || [],
        barrera_ids: formData.barrera_ids || [],
        estrategia_dua_ids: formData.estrategia_dua_ids || [],
        acceso_curricular_ids: formData.acceso_curricular_ids || [],
        habilidad_base_ids: formData.habilidad_base_ids || [],
        horario_apoyo:
          formData.formato_generado === 'Completo' && (formData.horario_apoyo?.filas || []).length > 0
            ? formData.horario_apoyo
            : null,
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
      setAlert({ type: 'success', message: 'PACI creado exitosamente' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar el PACI';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Success state
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Step indicator */}
    <StepIndicator steps={activeSteps.map((step) => step.label)} currentStep={currentStep} />

      {/* Alert */}
      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      {/* Step content */}
      <div>
        {currentStepKey === 'identificacion' && (
          <StepIdentificacion data={formData} onChange={handleChange} />
        )}
        {currentStepKey === 'perfil_dua' && (
          <StepPerfilDua data={formData} onChange={handleChange} />
        )}
        {currentStepKey === 'trayectoria' && (
          <StepTrayectoriaOa data={formData} onChange={handleChange} estudiante={estudiante} />
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
  );
}
