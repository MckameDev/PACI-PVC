import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../api/axios';
import { validateRut, autoFormatRut, extractApiErrors } from '../../utils/validation';
import useAuthStore from '../../stores/useAuthStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

export default function EstudianteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isEditing = Boolean(id);

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Catalogues
  const [establecimientos, setEstablecimientos] = useState([]);
  const [cursosNiveles, setCursosNiveles] = useState([]);
  const [letras, setLetras] = useState([]);

  // Form data
  const [form, setForm] = useState({
    rut: '',
    nombre_completo: '',
    usuario_id: user?.id || '',
    establecimiento_id: '',
    curso_nivel_id: '',
    letra_id: '',
    diagnostico: '',
    comorbilidad: '',
    nivel_subtipo: '',
    tipo_nee: 'NEET',
  });

  // Load catalogues
  useEffect(() => {
    const loadCatalogues = async () => {
      try {
        const [estRes, cnRes, letRes] = await Promise.all([
          api.get('/establecimientos', { params: { limit: 100 } }),
          api.get('/cursos-niveles', { params: { limit: 50 } }),
          api.get('/letras', { params: { limit: 30 } }),
        ]);
        setEstablecimientos(estRes.data.data?.items || []);
        setCursosNiveles(cnRes.data.data?.items || []);
        setLetras(letRes.data.data?.items || []);
      } catch {
        setAlert({ type: 'error', message: 'Error al cargar catálogos' });
      }
    };
    loadCatalogues();
  }, []);

  // Load student data for editing
  useEffect(() => {
    if (!isEditing) return;
    const loadStudent = async () => {
      try {
        const res = await api.get(`/estudiantes/${id}`);
        const data = res.data.data;
        setForm({
          rut: data.rut || '',
          nombre_completo: data.nombre_completo || '',
          usuario_id: data.usuario_id || user?.id || '',
          establecimiento_id: data.establecimiento_id || '',
          curso_nivel_id: data.curso_nivel_id || '',
          letra_id: data.letra_id || '',
          diagnostico: data.diagnostico || '',
          comorbilidad: data.comorbilidad || '',
          nivel_subtipo: data.nivel_subtipo || '',
          tipo_nee: data.tipo_nee || 'NEET',
        });
      } catch {
        setAlert({ type: 'error', message: 'Error al cargar datos del estudiante' });
      } finally {
        setLoading(false);
      }
    };
    loadStudent();
  }, [id, isEditing, user?.id]);

  const handleRutChange = (e) => {
    const formatted = autoFormatRut(e.target.value);
    setForm((prev) => ({ ...prev, rut: formatted }));
    // Validar en tiempo real
    if (formatted.length >= 8) {
      const result = validateRut(formatted);
      setFormErrors((prev) => ({ ...prev, rut: result.error || '' }));
    } else {
      setFormErrors((prev) => ({ ...prev, rut: '' }));
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Client-side validation
    const errors = {};
    if (!form.nombre_completo.trim()) errors.nombre_completo = 'El nombre es requerido';
    if (!form.rut.trim()) {
      errors.rut = 'El RUT es requerido';
    } else {
      const rutResult = validateRut(form.rut);
      if (!rutResult.valid) errors.rut = rutResult.error;
    }
    if (!form.establecimiento_id) errors.establecimiento_id = 'El establecimiento es requerido';
    if (!form.curso_nivel_id) errors.curso_nivel_id = 'El curso es requerido';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);

    try {
      const payload = { ...form };
      if (!payload.letra_id) delete payload.letra_id;
      if (!payload.diagnostico) delete payload.diagnostico;
      if (!payload.comorbilidad) delete payload.comorbilidad;
      if (!payload.nivel_subtipo) delete payload.nivel_subtipo;

      if (isEditing) {
        await api.put(`/estudiantes/${id}`, payload);
        setAlert({ type: 'success', message: 'Estudiante actualizado correctamente' });
      } else {
        await api.post('/estudiantes', payload);
        setAlert({ type: 'success', message: 'Estudiante registrado correctamente' });
        setTimeout(() => navigate('/estudiantes'), 1200);
      }
    } catch (err) {
      const msg = extractApiErrors(err);
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="h-64" size="lg" />;

  // Sort cursos by valor_numerico
  const sortedCursos = [...cursosNiveles].sort((a, b) => (a.valor_numerico || 0) - (b.valor_numerico || 0));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/estudiantes')}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar Estudiante' : 'Registrar Estudiante'}
          </h1>
          <p className="text-sm text-secondary">
            {isEditing ? 'Modifique los datos del estudiante' : 'Complete los datos para registrar un nuevo estudiante'}
          </p>
        </div>
      </div>

      {alert.message && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="nombre_completo"
              label="Nombre Completo *"
              placeholder="Nombre del estudiante"
              value={form.nombre_completo}
              onChange={handleChange('nombre_completo')}
              error={formErrors.nombre_completo}
              required
            />
            <Input
              id="rut"
              label="RUT *"
              placeholder="12.345.678-9"
              value={form.rut}
              onChange={handleRutChange}
              error={formErrors.rut}
              required
            />
            {!formErrors.rut && form.rut && (
              <p className="text-xs text-slate-400 mt-0.5">Formato: 12.345.678-K (se valida dígito verificador)</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              id="establecimiento_id"
              label="Establecimiento *"
              placeholder="Seleccione establecimiento"
              value={form.establecimiento_id}
              onChange={handleChange('establecimiento_id')}
              options={establecimientos.map((e) => ({ value: e.id, label: e.nombre }))}
              error={formErrors.establecimiento_id}
              required
            />
            <Select
              id="tipo_nee"
              label="Tipo NEE *"
              value={form.tipo_nee}
              onChange={handleChange('tipo_nee')}
              options={[
                { value: 'NEET', label: 'NEET — Transitoria' },
                { value: 'NEEP', label: 'NEEP — Permanente' },
              ]}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              id="curso_nivel_id"
              label="Curso / Nivel *"
              placeholder="Seleccione curso"
              value={form.curso_nivel_id}
              onChange={handleChange('curso_nivel_id')}
              options={sortedCursos.map((c) => ({ value: c.id, label: c.nombre }))}
              error={formErrors.curso_nivel_id}
              required
            />
            <Select
              id="letra_id"
              label="Letra (Opcional)"
              placeholder="Seleccione letra"
              value={form.letra_id}
              onChange={handleChange('letra_id')}
              options={letras.map((l) => ({ value: l.id, label: l.letra }))}
            />
          </div>

          <TextArea
            id="diagnostico"
            label="Diagnóstico"
            placeholder="Describa el diagnóstico del estudiante..."
            value={form.diagnostico}
            onChange={handleChange('diagnostico')}
            rows={3}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="comorbilidad"
              label="Comorbilidad (Opcional)"
              placeholder="Ej: TDAH, Dispraxia"
              value={form.comorbilidad}
              onChange={handleChange('comorbilidad')}
            />
            <Input
              id="nivel_subtipo"
              label="Nivel / Subtipo (Opcional)"
              placeholder="Ej: Grado 1, Apoyo moderado"
              value={form.nivel_subtipo}
              onChange={handleChange('nivel_subtipo')}
            />
          </div>

          {/* Hidden: usuario_id comes from current user */}
          <input type="hidden" value={form.usuario_id} />

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <Button variant="ghost" type="button" onClick={() => navigate('/estudiantes')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              {isEditing ? 'Guardar Cambios' : 'Registrar Estudiante'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
