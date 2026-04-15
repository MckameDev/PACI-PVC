import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';
import { Puzzle } from 'lucide-react';

const TABLE_COLUMNS = [
  { key: 'nombre', label: 'Nombre', truncate: true },
  { key: 'descripcion', label: 'Descripción', truncate: true },
  { key: 'orden', label: 'Orden' },
];

const FORM_FIELDS = [
  { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
  { name: 'orden', label: 'Orden', type: 'text' },
];

export default function DuaHabilidadesBasePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Habilidades Base</h1>
          <p className="mt-1 text-sm text-secondary">
            Administre el catálogo de habilidades base permanentes del Perfil DUA.
          </p>
        </div>
        <HelpButton
          title="Habilidades Base Permanentes"
          description="Gestiona las habilidades base que el profesional puede seleccionar en el Perfil DUA (Paso 2 del PACI). Estas habilidades se trabajarán durante todo el año escolar y se consideran en el seguimiento del PACI."
          meaning="Es el listado de habilidades fundamentales (ej: 'Atención sostenida', 'Comprensión de instrucciones') que se trabajan de forma transversal durante todo el año. Aparecen como opciones de check en la sección 6 del perfil del estudiante."
        />
      </div>

      <MatrizPage
        title="Habilidad Base"
        icon={Puzzle}
        apiPath="/matrices/habilidades-base"
        tableColumns={TABLE_COLUMNS}
        formFields={FORM_FIELDS}
      />
    </div>
  );
}
