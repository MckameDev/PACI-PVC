import { useState } from 'react';
import {
  BookOpen, Zap, Eye, PenLine, MessageCircle, TrendingUp, Target, Activity,
  BarChart3, Sliders, GitBranch,
} from 'lucide-react';
import MatrizPage from './MatrizPage';
import HelpButton from '../../components/ui/HelpButton';

// ── Core table configurations ────────────────────────────────────────────────

const CORE_TABLES = [
  {
    key: 'habilidades_lenguaje',
    label: 'Hab. Lenguaje',
    icon: BookOpen,
    apiPath: '/habilidades-lenguaje',
    tableColumns: [
      { key: 'nivel', label: 'Nivel' },
      { key: 'eje', label: 'Eje' },
      { key: 'habilidad', label: 'Habilidad', truncate: true },
    ],
    formFields: [
      { name: 'nivel', label: 'Nivel *', type: 'text', required: true },
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'habilidad', label: 'Habilidad *', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'activacion_paci',
    label: 'Activación PACI',
    icon: Zap,
    apiPath: '/activacion-paci',
    tableColumns: [
      { key: 'eje', label: 'Eje' },
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'id_oa', label: 'ID OA' },
      { key: 'habilidad_detectada', label: 'Habilidad', truncate: true },
    ],
    formFields: [
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'id_oa', label: 'ID OA', type: 'text' },
      { name: 'habilidad_detectada', label: 'Habilidad detectada *', type: 'text', required: true },
      { name: 'estrategia_sugerida', label: 'Estrategia sugerida', type: 'textarea' },
      { name: 'actividad_sugerida', label: 'Actividad sugerida', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'core_lectura',
    label: 'Core Lectura',
    icon: Eye,
    apiPath: '/core-lectura',
    tableColumns: [
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'core_habilidad', label: 'Core Habilidad', truncate: true },
      { key: 'indicador', label: 'Indicador', truncate: true },
    ],
    formFields: [
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'core_habilidad', label: 'Core Habilidad *', type: 'text', required: true },
      { name: 'indicador', label: 'Indicador', type: 'textarea' },
      { name: 'estrategia_sugerida', label: 'Estrategia sugerida', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'core_escritura',
    label: 'Core Escritura',
    icon: PenLine,
    apiPath: '/core-escritura',
    tableColumns: [
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'core_habilidad', label: 'Core Habilidad', truncate: true },
      { key: 'indicador', label: 'Indicador', truncate: true },
    ],
    formFields: [
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'core_habilidad', label: 'Core Habilidad *', type: 'text', required: true },
      { name: 'indicador', label: 'Indicador', type: 'textarea' },
      { name: 'estrategia_sugerida', label: 'Estrategia sugerida', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'core_comunicacion',
    label: 'Core Com. Oral',
    icon: MessageCircle,
    apiPath: '/core-comunicacion-oral',
    tableColumns: [
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'core_habilidad', label: 'Core Habilidad', truncate: true },
      { key: 'indicador', label: 'Indicador', truncate: true },
    ],
    formFields: [
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'core_habilidad', label: 'Core Habilidad *', type: 'text', required: true },
      { name: 'indicador', label: 'Indicador', type: 'textarea' },
      { name: 'estrategia_sugerida', label: 'Estrategia sugerida', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'matriz_progresion',
    label: 'Progresión',
    icon: TrendingUp,
    apiPath: '/matriz-progresion',
    tableColumns: [
      { key: 'asignatura', label: 'Asignatura' },
      { key: 'eje', label: 'Eje' },
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'habilidad_clave', label: 'Habilidad clave', truncate: true },
    ],
    formFields: [
      { name: 'asignatura', label: 'Asignatura *', type: 'text', required: true },
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'habilidad_clave', label: 'Habilidad clave *', type: 'text', required: true },
      { name: 'indicador_logro', label: 'Indicador de logro', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'estrategias_core',
    label: 'Estrategias Core',
    icon: Target,
    apiPath: '/estrategias-core',
    tableColumns: [
      { key: 'asignatura', label: 'Asignatura' },
      { key: 'eje', label: 'Eje' },
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'estrategia', label: 'Estrategia', truncate: true },
    ],
    formFields: [
      { name: 'asignatura', label: 'Asignatura *', type: 'text', required: true },
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'estrategia', label: 'Estrategia *', type: 'textarea', required: true },
      { name: 'tipo', label: 'Tipo', type: 'text' },
      { name: 'recurso_sugerido', label: 'Recurso sugerido', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'diagnostico_core',
    label: 'Diagnóstico',
    icon: Activity,
    apiPath: '/diagnostico-core',
    tableColumns: [
      { key: 'curso', label: 'Curso' },
      { key: 'eje', label: 'Eje' },
      { key: 'habilidad_evaluada', label: 'Habilidad evaluada', truncate: true },
      { key: 'nivel_logro', label: 'Nivel logro' },
    ],
    formFields: [
      { name: 'estudiante_id', label: 'ID Estudiante (UUID)', type: 'text' },
      { name: 'curso', label: 'Curso', type: 'text' },
      { name: 'eje', label: 'Eje', type: 'text' },
      { name: 'habilidad_evaluada', label: 'Habilidad evaluada', type: 'text' },
      { name: 'nivel_logro', label: 'Nivel de logro', type: 'text' },
      { name: 'observacion', label: 'Observación', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'progresion_lectora',
    label: 'Prog. Lectora',
    icon: BarChart3,
    apiPath: '/progresion-lectora',
    tableColumns: [
      { key: 'nivel', label: 'Nivel' },
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'descriptor', label: 'Descriptor', truncate: true },
    ],
    formFields: [
      { name: 'nivel', label: 'Nivel *', type: 'text', required: true },
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'descriptor', label: 'Descriptor *', type: 'textarea', required: true },
      { name: 'ejemplo_texto', label: 'Ejemplo texto', type: 'textarea' },
      { name: 'criterio_logro', label: 'Criterio de logro', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'matriz_adecuaciones',
    label: 'Adecuaciones',
    icon: Sliders,
    apiPath: '/matriz-adecuaciones',
    tableColumns: [
      { key: 'asignatura', label: 'Asignatura' },
      { key: 'eje', label: 'Eje' },
      { key: 'core_nivel', label: 'Core Nivel' },
      { key: 'tipo_adecuacion', label: 'Tipo adecuación' },
    ],
    formFields: [
      { name: 'asignatura', label: 'Asignatura *', type: 'text', required: true },
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'core_nivel', label: 'Core Nivel *', type: 'text', required: true },
      { name: 'tipo_adecuacion', label: 'Tipo adecuación *', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'ejemplo', label: 'Ejemplo', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
  {
    key: 'progresion_curricular',
    label: 'Prog. Curricular',
    icon: GitBranch,
    apiPath: '/progresion-curricular',
    tableColumns: [
      { key: 'habilidad', label: 'Habilidad', truncate: true },
      { key: 'nivel_core', label: 'Nivel Core' },
      { key: 'eje', label: 'Eje' },
      { key: 'descriptor', label: 'Descriptor', truncate: true },
    ],
    formFields: [
      { name: 'habilidad', label: 'Habilidad *', type: 'text', required: true },
      { name: 'nivel_core', label: 'Nivel Core *', type: 'text', required: true },
      { name: 'eje', label: 'Eje *', type: 'text', required: true },
      { name: 'descriptor', label: 'Descriptor *', type: 'textarea', required: true },
      { name: 'indicador_logro', label: 'Indicador de logro', type: 'textarea' },
      { name: 'ejemplo', label: 'Ejemplo', type: 'textarea' },
      { name: 'orden', label: 'Orden', type: 'text' },
    ],
  },
];

// ── Page component ───────────────────────────────────────────────────────────

export default function CoreAdminPage() {
  const [activeTab, setActiveTab] = useState('habilidades_lenguaje');
  const activeTable = CORE_TABLES.find((t) => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tablas Core Curriculares</h1>
          <p className="mt-1 text-sm text-secondary">
            Gestione habilidades, progresiones, estrategias core, diagnósticos y adecuaciones curriculares.
          </p>
        </div>
        <HelpButton
          title="Core Curricular"
          description="Gestiona las tablas del sistema Core Curricular v7: Habilidades de Lenguaje, Activación PACI, Core Lectura/Escritura/Comunicación, Progresiones, Estrategias Core, Diagnóstico y Adecuaciones. Son los catálogos base que alimentan las sugerencias automáticas del PACI."
          meaning="Es el motor de sugerencias del sistema. Aquí se guardan las habilidades, estrategias y progresiones curriculares que el sistema usa para recomendar automáticamente qué trabajar con cada estudiante."
        />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {CORE_TABLES.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {activeTable && (
        <MatrizPage
          key={activeTable.key}
          title={activeTable.label}
          icon={activeTable.icon}
          apiPath={activeTable.apiPath}
          tableColumns={activeTable.tableColumns}
          formFields={activeTable.formFields}
        />
      )}
    </div>
  );
}
