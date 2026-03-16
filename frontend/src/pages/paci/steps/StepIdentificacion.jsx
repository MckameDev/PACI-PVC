import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import SearchSelect from '../../../components/ui/SearchSelect';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/ui/Spinner';

export default function StepIdentificacion({ data, onChange }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [estRes, profRes] = await Promise.all([
          api.get('/estudiantes', { params: { limit: 200 } }),
          api.get('/profesores', { params: { limit: 200 } }),
        ]);
        setEstudiantes(estRes.data.data?.items || []);
        setProfesores(profRes.data.data?.items || []);
      } catch {
        console.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-fill año escolar on mount if empty
  useEffect(() => {
    if (!data.anio_escolar) {
      onChange('anio_escolar', new Date().getFullYear().toString());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnioEscolar = (e) => {
    const val = e.target.value;
    // Only allow digits, max 4 chars
    if (/^\d{0,4}$/.test(val)) {
      onChange('anio_escolar', val);
    }
  };

  const anioError = data.anio_escolar && data.anio_escolar.length === 4 && !data.anio_escolar.startsWith('20')
    ? 'El año debe iniciar con 20'
    : '';

  const profesorOptions = profesores.map((p) => ({
    value: p.usuario_nombre || p.nombre || p.id,
    label: `${p.usuario_nombre || p.nombre || 'Sin nombre'}${p.especialidad ? ' — ' + p.especialidad : ''}${p.cargo ? ' (' + p.cargo + ')' : ''}`,
  }));

  if (loading) return <Spinner className="h-40" />;

  const selectedStudent = estudiantes.find((e) => e.id === data.estudiante_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 1: Identificación y Contexto</h2>
        <p className="text-sm text-secondary mt-1">
          Seleccione al estudiante y configure los parámetros iniciales del PACI.
        </p>
      </div>

      <Card className="space-y-5">
        <SearchSelect
          id="estudiante_id"
          label="Estudiante *"
          placeholder="Seleccione un estudiante"
          value={data.estudiante_id}
          onChange={(val) => onChange('estudiante_id', val)}
          options={estudiantes.map((est) => ({
            value: est.id,
            label: `${est.nombre_completo} — ${est.rut}`,
          }))}
          required
        />

        {selectedStudent && (
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">Datos del Estudiante</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-secondary">Curso:</span> <span className="font-medium">{selectedStudent.curso_nivel_nombre}{selectedStudent.letra_nombre ? ` ${selectedStudent.letra_nombre}` : ''}</span></div>
              <div><span className="text-secondary">Tipo NEE:</span> <span className="font-medium">{selectedStudent.tipo_nee}</span></div>
              <div><span className="text-secondary">Establecimiento:</span> <span className="font-medium">{selectedStudent.establecimiento_nombre}</span></div>
              <div><span className="text-secondary">Diagnóstico:</span> <span className="font-medium">{selectedStudent.diagnostico || '—'}</span></div>
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="fecha_emision"
            label="Fecha de Emisión *"
            type="date"
            value={data.fecha_emision}
            onChange={(e) => onChange('fecha_emision', e.target.value)}
            required
          />
          <SearchSelect
            id="formato_generado"
            label="Formato de Salida *"
            value={data.formato_generado}
            onChange={(val) => onChange('formato_generado', val)}
            options={[
              { value: 'Compacto', label: 'Compacto — Resumen 2-3 páginas' },
              { value: 'Completo', label: 'Completo — Tablas extendidas' },
              { value: 'Modular', label: 'Modular — Con anexos PAEC y DUA' },
            ]}
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="anio_escolar"
            label="Año Escolar"
            placeholder="Ej: 2026"
            value={data.anio_escolar || ''}
            onChange={handleAnioEscolar}
            error={anioError}
            maxLength={4}
          />
          <SearchSelect
            id="profesor_jefe"
            label="Profesor/a Jefe"
            placeholder="Seleccione profesor/a jefe"
            value={data.profesor_jefe || ''}
            onChange={(val) => onChange('profesor_jefe', val)}
            options={profesorOptions}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SearchSelect
            id="profesor_asignatura"
            label="Profesor/a de Asignatura"
            placeholder="Seleccione profesor/a de asignatura"
            value={data.profesor_asignatura || ''}
            onChange={(val) => onChange('profesor_asignatura', val)}
            options={profesorOptions}
          />
          <Input
            id="educador_diferencial"
            label="Educador/a Diferencial"
            placeholder="Nombre del educador/a diferencial"
            value={data.educador_diferencial || ''}
            onChange={(e) => onChange('educador_diferencial', e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
