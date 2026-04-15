import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';
import { Sparkles } from 'lucide-react';

const TABLE_COLUMNS = [
  { key: 'nombre', label: 'Nombre', truncate: true },
  { key: 'principio_dua', label: 'Principio DUA' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'orden', label: 'Orden' },
];

const FORM_FIELDS = [
  { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
  {
    name: 'principio_dua', label: 'Principio DUA *', type: 'select', required: true,
    options: ['Representacion', 'Expresion', 'Motivacion'],
  },
  { name: 'categoria', label: 'Categoría', type: 'text' },
  { name: 'orden', label: 'Orden', type: 'text' },
];

export default function DuaEstrategiasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estrategias DUA</h1>
          <p className="mt-1 text-sm text-secondary">
            Administre el catálogo de estrategias DUA organizadas por los 3 principios.
          </p>
        </div>
        <HelpButton
          title="Estrategias DUA"
          description="Gestiona las estrategias de Diseño Universal para el Aprendizaje (DUA) disponibles en el Perfil DUA (Paso 2 del PACI). Se organizan en 3 principios: Representación (cómo comprende mejor), Acción y Expresión (cómo demuestra lo aprendido) y Motivación (qué favorece su participación)."
          meaning="Es el banco de estrategias de enseñanza basadas en el enfoque DUA. Cada estrategia pertenece a uno de los 3 principios DUA y aparece como opción de check en la sección 4 del perfil del estudiante."
        />
      </div>

      <MatrizPage
        title="Estrategia DUA"
        icon={Sparkles}
        apiPath="/matrices/estrategias-dua"
        tableColumns={TABLE_COLUMNS}
        formFields={FORM_FIELDS}
      />
    </div>
  );
}
