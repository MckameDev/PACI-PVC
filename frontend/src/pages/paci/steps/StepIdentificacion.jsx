import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/ui/Spinner';

export default function StepIdentificacion({ data, onChange }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/estudiantes', { params: { limit: 100 } });
        setEstudiantes(res.data.data?.items || []);
      } catch {
        console.error('Error loading students');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <Select
          id="estudiante_id"
          label="Estudiante *"
          placeholder="Seleccione un estudiante"
          value={data.estudiante_id}
          onChange={(e) => onChange('estudiante_id', e.target.value)}
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
          <Select
            id="formato_generado"
            label="Formato de Salida *"
            value={data.formato_generado}
            onChange={(e) => onChange('formato_generado', e.target.value)}
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
            onChange={(e) => onChange('anio_escolar', e.target.value)}
          />
          <Input
            id="profesor_jefe"
            label="Profesor/a Jefe"
            placeholder="Nombre del profesor/a jefe"
            value={data.profesor_jefe || ''}
            onChange={(e) => onChange('profesor_jefe', e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="profesor_asignatura"
            label="Profesor/a de Asignatura"
            placeholder="Nombre del profesor/a de asignatura"
            value={data.profesor_asignatura || ''}
            onChange={(e) => onChange('profesor_asignatura', e.target.value)}
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
