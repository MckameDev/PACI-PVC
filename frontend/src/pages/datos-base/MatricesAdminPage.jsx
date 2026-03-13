import { useState } from 'react';
import {
  ShieldAlert, Star, BookOpen, PenLine, MessageCircle, Wrench,
} from 'lucide-react';
import MatrizPage from './MatrizPage';

// ── Matrix configurations ────────────────────────────────────────────────────

const MATRICES = [
  {
    key: 'barreras',
    label: 'Barreras',
    icon: ShieldAlert,
    apiPath: '/matrices/barreras',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'categoria', label: 'Categoría' },
      { key: 'dimension', label: 'Dimensión' },
    ],
    formFields: [
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
    ],
  },
  {
    key: 'fortalezas',
    label: 'Fortalezas',
    icon: Star,
    apiPath: '/matrices/fortalezas',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'categoria', label: 'Categoría' },
      { key: 'valor_dua', label: 'Valor DUA' },
    ],
    formFields: [
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
    ],
  },
  {
    key: 'lectura',
    label: 'Est. Lectura',
    icon: BookOpen,
    apiPath: '/matrices/estrategias-lectura',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'momento_lectura', label: 'Momento' },
    ],
    formFields: [
      { name: 'codigo', label: 'Código *', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
      {
        name: 'momento_lectura', label: 'Momento *', type: 'select', required: true,
        options: ['Antes', 'Durante', 'Después'],
      },
      { name: 'descripcion_pedagogica', label: 'Descripción pedagógica *', type: 'textarea', required: true },
      { name: 'objetivo_metacognitivo', label: 'Objetivo metacognitivo', type: 'textarea' },
    ],
  },
  {
    key: 'escritura',
    label: 'Est. Escritura',
    icon: PenLine,
    apiPath: '/matrices/estrategias-escritura',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'tipo_apoyo', label: 'Tipo de apoyo' },
    ],
    formFields: [
      { name: 'codigo', label: 'Código *', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
      { name: 'problema_ataca', label: 'Problema que ataca', type: 'text' },
      { name: 'descripcion', label: 'Descripción *', type: 'textarea', required: true },
      {
        name: 'tipo_apoyo', label: 'Tipo de apoyo', type: 'select',
        options: ['Estructural', 'Social', 'Tecnológico', 'Léxico', 'Metacognitivo', 'Modelado', 'Procesual'],
      },
    ],
  },
  {
    key: 'comunicacion',
    label: 'Est. Comunicación',
    icon: MessageCircle,
    apiPath: '/matrices/estrategias-comunicacion',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'nivel_sugerido', label: 'Nivel sugerido' },
      { key: 'foco_intervencion', label: 'Foco', truncate: true },
    ],
    formFields: [
      { name: 'codigo', label: 'Código *', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
      { name: 'nivel_sugerido', label: 'Nivel sugerido', type: 'text' },
      { name: 'descripcion_pedagogica', label: 'Descripción pedagógica *', type: 'textarea', required: true },
      { name: 'foco_intervencion', label: 'Foco de intervención', type: 'text' },
    ],
  },
  {
    key: 'herramientas',
    label: 'Herramientas',
    icon: Wrench,
    apiPath: '/matrices/herramientas-apoyo',
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre', truncate: true },
      { key: 'proposito_acceso', label: 'Propósito', truncate: true },
      { key: 'barrera_mitiga', label: 'Barrera que mitiga', truncate: true },
    ],
    formFields: [
      { name: 'codigo', label: 'Código *', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre *', type: 'text', required: true },
      { name: 'proposito_acceso', label: 'Propósito de acceso', type: 'text' },
      { name: 'descripcion', label: 'Descripción *', type: 'textarea', required: true },
      { name: 'barrera_mitiga', label: 'Barrera que mitiga', type: 'text' },
    ],
  },
];

// ── Page component ───────────────────────────────────────────────────────────

export default function MatricesAdminPage() {
  const [activeTab, setActiveTab] = useState('barreras');
  const activeMatrix = MATRICES.find((m) => m.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Matrices Pedagógicas</h1>
        <p className="mt-1 text-sm text-secondary">
          Gestione los catálogos de barreras, fortalezas y estrategias pedagógicas.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {MATRICES.map((m) => {
          const Icon = m.icon;
          const isActive = m.key === activeTab;
          return (
            <button
              key={m.key}
              onClick={() => setActiveTab(m.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Active matrix panel */}
      {activeMatrix && (
        <MatrizPage
          key={activeMatrix.key}
          title={activeMatrix.label}
          icon={activeMatrix.icon}
          apiPath={activeMatrix.apiPath}
          tableColumns={activeMatrix.tableColumns}
          formFields={activeMatrix.formFields}
        />
      )}
    </div>
  );
}
