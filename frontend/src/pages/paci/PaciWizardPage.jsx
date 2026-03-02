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
import StepResumen from './steps/StepResumen';

const STEPS = ['Identificación', 'Perfil DUA', 'Trayectoria OA', 'Resumen'];

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
    aplica_paec: 0,
    paec_activadores: '',
    paec_estrategias: '',
    paec_desregulacion: '',
    perfil_dua: {
      fortalezas: '',
      barreras: '',
      preferencias_representacion: '',
      preferencias_expresion: '',
      preferencias_motivacion: '',
    },
    trayectoria: [],
  });

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
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.estudiante_id) return 'Debe seleccionar un estudiante';
        if (!formData.fecha_emision) return 'Debe ingresar la fecha de emisión';
        if (!formData.formato_generado) return 'Debe seleccionar un formato de salida';
        return null;
      case 2:
        // DUA is optional but useful
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

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setAlert({ type: 'error', message: error });
      return;
    }
    setAlert({ type: '', message: '' });
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setAlert({ type: '', message: '' });
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    const error = validateStep(3);
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
        aplica_paec: formData.aplica_paec,
        paec_activadores: formData.paec_activadores || null,
        paec_estrategias: formData.paec_estrategias || null,
        paec_desregulacion: formData.paec_desregulacion || null,
        perfil_dua: formData.perfil_dua,
        trayectoria: formData.trayectoria.map((item) => ({
          oa_id: item.oa_id,
          nivel_trabajo_id: item.nivel_trabajo_id,
          diferencia_calculada: item.diferencia_calculada,
          tipo_adecuacion: item.tipo_adecuacion,
          justificacion_tecnica: item.justificacion_tecnica || null,
          eval_modalidad: item.eval_modalidad || null,
          eval_instrumento: item.eval_instrumento || null,
          eval_criterio: item.eval_criterio || null,
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
