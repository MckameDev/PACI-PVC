import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';
import { Compass } from 'lucide-react';

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

export default function DuaAccesoCurricularPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acceso Curricular</h1>
          <p className="mt-1 text-sm text-secondary">
            Administre el catálogo de opciones de acceso curricular del Perfil DUA.
          </p>
        </div>
        <HelpButton
          title="Acceso Curricular"
          description="Gestiona las opciones de acceso curricular clave que el profesional puede seleccionar en el Perfil DUA (Paso 2 del PACI). Estas opciones permiten identificar si el estudiante requiere trabajar habilidades base y si necesita OA de niveles anteriores."
          meaning="Es el listado de necesidades de acceso curricular (ej: 'Requiere OA de nivel anterior', 'Necesita apoyo en habilidades básicas') que aparecen como check en el paso 2. El docente selecciona entre 3 y 4 opciones."
        />
      </div>

      <MatrizPage
        title="Acceso Curricular"
        icon={Compass}
        apiPath="/matrices/acceso-curricular"
        tableColumns={TABLE_COLUMNS}
        formFields={FORM_FIELDS}
      />
    </div>
  );
}
