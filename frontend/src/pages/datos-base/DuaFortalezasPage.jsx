import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';
import { Star } from 'lucide-react';

const TABLE_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre', truncate: true },
  { key: 'categoria', label: 'Categoría' },
  { key: 'valor_dua', label: 'Valor DUA' },
];

const FORM_FIELDS = [
  { name: 'codigo', label: 'Código *', type: 'text', required: true },
  { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
  {
    name: 'categoria', label: 'Categoría *', type: 'select', required: true,
    options: ['Cognitiva', 'Comunicativa', 'Motivacional', 'Socioemocional', 'Instrumental', 'Motriz', 'Expresiva'],
  },
  { name: 'descripcion_ia', label: 'Descripción pedagógica', type: 'textarea' },
  {
    name: 'valor_dua', label: 'Valor DUA *', type: 'select', required: true,
    options: ['Representación', 'Expresión', 'Motivación'],
  },
];

export default function DuaFortalezasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fortalezas del Estudiante</h1>
          <p className="mt-1 text-sm text-secondary">
            Administre el catálogo de fortalezas disponibles en el Perfil DUA.
          </p>
        </div>
        <HelpButton
          title="Fortalezas del Estudiante"
          description="Gestiona las fortalezas que el profesional puede seleccionar al completar el Perfil DUA de un estudiante (Paso 2 del PACI). Cada fortaleza tiene una categoría y un valor DUA asociado que orientan las estrategias de enseñanza sugeridas por el sistema."
          meaning="Es el listado de puntos fuertes del estudiante (ej: 'Buena memoria visual', 'Interés por la lectura') que aparecen como opciones de check en el paso 2 del PACI. El docente selecciona entre 4 y 5."
        />
      </div>

      <MatrizPage
        title="Fortaleza"
        icon={Star}
        apiPath="/matrices/fortalezas"
        tableColumns={TABLE_COLUMNS}
        formFields={FORM_FIELDS}
      />
    </div>
  );
}
