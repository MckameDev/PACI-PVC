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
} from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/estudiantes', icon: Users, label: 'Estudiantes' },
  { to: '/paci', icon: FileText, label: 'Mis PACIs' },
  { to: '/paci/nuevo', icon: FilePlus, label: 'Crear PACI' },
];

const adminItems = [
  { to: '/usuarios', icon: UserCog, label: 'Usuarios' },
  { to: '/establecimientos', icon: School, label: 'Establecimientos' },
  { to: '/asignaturas', icon: BookOpen, label: 'Asignaturas' },
  { to: '/cursos-niveles', icon: GraduationCap, label: 'Cursos/Niveles' },
  { to: '/letras', icon: Type, label: 'Letras' },
  { to: '/objetivos-aprendizaje', icon: GraduationCap, label: 'Objetivos OA' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'Admin';

  return (
    <aside
      className={`
        flex flex-col bg-primary-dark text-white transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[250px]'}
      `}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white text-sm">
          P
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight">PACI PVC</h1>
            <p className="text-[10px] text-white/50 leading-tight">Adecuación Curricular</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Administración section — Admin only */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="mt-6 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                Administración
              </p>
            )}
            {collapsed && <div className="my-4 border-t border-white/10" />}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors cursor-pointer"
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
