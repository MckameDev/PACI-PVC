import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FilePlus,
  FileText,
  School,
  BookOpen,
  GraduationCap,
  Type,
  UserCog,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileSpreadsheet,
  Layers,
  ListChecks,
  ClipboardCheck,
  UserCheck,
  MessageSquare,
  Grid,
} from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/estudiantes', icon: Users, label: 'Estudiantes' },
  { to: '/paci', icon: FileText, label: 'Mis PACIs' },
  { to: '/paci/nuevo', icon: FilePlus, label: 'Crear PACI' },
];

const adminSections = [
  {
    label: 'Personas',
    items: [
      { to: '/usuarios', icon: UserCog, label: 'Usuarios' },
      { to: '/profesores', icon: UserCheck, label: 'Profesores' },
    ],
  },
  {
    label: 'Institución',
    items: [
      { to: '/establecimientos', icon: School, label: 'Establecimientos' },
      { to: '/cursos-niveles', icon: GraduationCap, label: 'Cursos/Niveles' },
      { to: '/letras', icon: Type, label: 'Letras' },
    ],
  },
  {
    label: 'Currículum',
    items: [
      { to: '/asignaturas', icon: BookOpen, label: 'Asignaturas' },
      { to: '/objetivos-aprendizaje', icon: GraduationCap, label: 'Objetivos OA' },
      { to: '/ejes', icon: Layers, label: 'Ejes' },
      { to: '/indicadores', icon: ListChecks, label: 'Indicadores' },
      { to: '/evaluaciones', icon: ClipboardCheck, label: 'Evaluaciones' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/importar', icon: FileSpreadsheet, label: 'Importar Excel' },
      { to: '/chatbot-admin', icon: MessageSquare, label: 'Chatbot Admin' },
      { to: '/matrices', icon: Grid, label: 'Matrices Pedagógicas' },
      { to: '/core-curricular', icon: Layers, label: 'Core Curricular' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'Admin';

  return (
    <aside
      className={`
        flex flex-col text-white transition-all duration-300 ease-in-out
        bg-gradient-to-b from-primary-dark via-primary-dark to-[#132F5E]
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-green font-bold text-white text-sm shadow-lg shadow-accent/20">
          P
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight">PACI PVC</h1>
            <p className="text-[10px] text-white/40 leading-tight">Adecuación Curricular</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white/15 text-white shadow-sm shadow-black/10'
                  : 'text-white/60 hover:bg-white/8 hover:text-white hover:translate-x-0.5'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Administración sections — Admin only */}
        {isAdmin && (
          <>
            {collapsed && <div className="my-4 border-t border-white/10" />}
            {adminSections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <p className="mt-5 mb-1.5 px-3 text-[9px] font-bold uppercase tracking-widest text-white/25">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-white/15 text-white shadow-sm shadow-black/10'
                          : 'text-white/60 hover:bg-white/8 hover:text-white hover:translate-x-0.5'
                        }`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-danger/20 hover:text-white transition-all duration-200 cursor-pointer"
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/40 hover:bg-white/8 hover:text-white/70 transition-all duration-200 cursor-pointer"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
