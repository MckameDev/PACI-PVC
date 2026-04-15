import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';
import { ShieldAlert } from 'lucide-react';

const TABLE_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre', truncate: true },
  { key: 'categoria', label: 'Categoría' },
  { key: 'dimension', label: 'Dimensión' },
];

const FORM_FIELDS = [
  { name: 'codigo', label: 'Código *', type: 'text', required: true },
  { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
  {
    name: 'categoria', label: 'Categoría *', type: 'select', required: true,
    options: ['Cognitiva', 'Socioemocional', 'Comunicativa', 'Sensorial', 'Física', 'Contextual'],
  },
  { name: 'definicion', label: 'Definición', type: 'textarea' },
  {
    name: 'dimension', label: 'Dimensión *', type: 'select', required: true,
    options: ['Curricular', 'Neuropsicológica', 'Emocional', 'Social', 'Comunicativa', 'Acceso', 'Motivacional', 'Contextual'],
  },
];

export default function DuaBarrerasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Barreras de Aprendizaje</h1>
          <p className="mt-1 text-sm text-secondary">
            Administre el catálogo de barreras disponibles en el Perfil DUA.
          </p>
        </div>
        <HelpButton
          title="Barreras de Aprendizaje"
          description="Gestiona las barreras de aprendizaje que el profesional puede seleccionar al completar el Perfil DUA (Paso 2 del PACI). Cada barrera tiene una categoría y una dimensión que ayudan a identificar los obstáculos principales del proceso educativo del estudiante."
          meaning="Es el listado de dificultades u obstáculos (ej: 'Baja tolerancia a la frustración', 'Dificultad en comprensión lectora') que aparecen como opciones de check. El docente selecciona entre 4 y 5 para describir las barreras del estudiante."
        />
      </div>

      <MatrizPage
        title="Barrera"
        icon={ShieldAlert}
        apiPath="/matrices/barreras"
        tableColumns={TABLE_COLUMNS}
        formFields={FORM_FIELDS}
      />
    </div>
  );
}
