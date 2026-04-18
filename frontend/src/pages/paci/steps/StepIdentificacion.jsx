import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import SearchSelect from '../../../components/ui/SearchSelect';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/ui/Spinner';
import PaciFieldHelpButton from '../components/PaciFieldHelpButton';

export default function StepIdentificacion({ data, onChange, onRequestFieldHelp }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [estRes, profRes, asigRes] = await Promise.all([
          api.get('/estudiantes', { params: { limit: 200 } }),
          api.get('/profesores', { params: { limit: 200 } }),
          api.get('/asignaturas', { params: { limit: 200 } }),
        ]);
        setEstudiantes(estRes.data.data?.items || []);
        setProfesores(profRes.data.data?.items || []);
        setAsignaturas(asigRes.data.data?.items || asigRes.data.data || []);
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

  const selectedStudent = estudiantes.find((e) => String(e.id) === String(data.estudiante_id));

  const requestHelp = (title, description, meaning) => {
    if (!onRequestFieldHelp) return;
    onRequestFieldHelp({ title, description, meaning });
  };

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
          labelAction={
            <PaciFieldHelpButton
              title="Estudiante"
              onClick={() => requestHelp(
                'Estudiante',
                'Este campo define a quién se le construye el PACI. La IA puede buscar al estudiante por RUT, nombre o clave parcial y usar sus datos para completar el formulario.',
                'Es la ficha principal del documento. Si el estudiante es correcto, el resto del PACI puede heredar su curso, diagnóstico y contexto.'
              )}
            />
          }
          required
        />

        <SearchSelect
          id="asignatura_id"
          label="Asignatura *"
          placeholder="Seleccione la asignatura"
          value={data.asignatura_id}
          onChange={(val) => onChange('asignatura_id', val)}
          options={asignaturas.map((a) => ({
            value: a.id,
            label: a.nombre,
          }))}
          labelAction={
            <PaciFieldHelpButton
              title="Asignatura"
              onClick={() => requestHelp(
                'Asignatura',
                'Indica la materia sobre la que se construirá la trayectoria de OA y las adaptaciones. La IA puede reconocer el nombre de la asignatura y traducirlo al ID correcto del catálogo.',
                'Aquí eliges el ramo o sector de aprendizaje. Sin este dato, la trayectoria no puede buscar los OA y ejes asociados.'
              )}
            />
          }
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
            labelAction={
              <PaciFieldHelpButton
                title="Fecha de emisión"
                onClick={() => requestHelp(
                  'Fecha de emisión',
                  'Es la fecha formal del documento PACI. Normalmente corresponde al día en que se genera o firma el plan.',
                  'Sirve para dejar trazabilidad del momento exacto en que el PACI fue emitido.'
                )}
              />
            }
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
            labelAction={
              <PaciFieldHelpButton
                title="Formato de salida"
                onClick={() => requestHelp(
                  'Formato de salida',
                  'Define cuánto detalle tendrá el PACI. Un formato compacto prioriza síntesis; uno completo incluye más tablas, apoyos y trazabilidad.',
                  'Es como decidir si el documento será breve y ejecutivo o más extenso y operativo.'
                )}
              />
            }
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
            labelAction={
              <PaciFieldHelpButton
                title="Año escolar"
                onClick={() => requestHelp(
                  'Año escolar',
                  'Es el período académico al que queda asociado el PACI. Sirve para ordenar la vigencia del documento y los reportes.',
                  'Ayuda a ubicar el plan dentro del año lectivo correcto.'
                )}
              />
            }
          />
          <SearchSelect
            id="profesor_jefe"
            label="Profesor/a Jefe"
            placeholder="Seleccione profesor/a jefe"
            value={data.profesor_jefe || ''}
            onChange={(val) => onChange('profesor_jefe', val)}
            options={profesorOptions}
            labelAction={
              <PaciFieldHelpButton
                title="Profesor/a jefe"
                onClick={() => requestHelp(
                  'Profesor/a jefe',
                  'Permite asociar al docente responsable del curso. La IA puede sugerirlo por nombre o correo y dejarlo listo como referencia del plan.',
                  'Es la persona que acompaña al curso como referente principal.'
                )}
              />
            }
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
            labelAction={
              <PaciFieldHelpButton
                title="Profesor/a de asignatura"
                onClick={() => requestHelp(
                  'Profesor/a de asignatura',
                  'Es el docente que dicta la materia del PACI. Su selección permite que el plan quede vinculado al contexto real de la clase.',
                  'Ayuda a identificar quién enseña la asignatura donde se aplicarán las adaptaciones.'
                )}
              />
            }
          />
          <Input
            id="educador_diferencial"
            label="Educador/a Diferencial"
            placeholder="Nombre del educador/a diferencial"
            value={data.educador_diferencial || ''}
            onChange={(e) => onChange('educador_diferencial', e.target.value)}
            labelAction={
              <PaciFieldHelpButton
                title="Educador/a diferencial"
                onClick={() => requestHelp(
                  'Educador/a diferencial',
                  'Es el profesional PIE o especialista que acompaña el diseño y seguimiento de las adecuaciones.',
                  'Sirve para dejar visible quién apoya pedagógicamente el proceso.'
                )}
              />
            }
          />
        </div>
      </Card>
    </div>
  );
}
