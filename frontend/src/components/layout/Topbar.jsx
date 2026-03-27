import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';

const pageTitles = {
  '/': 'Dashboard',
  '/estudiantes': 'Estudiantes',
  '/estudiantes/nuevo': 'Registrar Estudiante',
  '/paci': 'Documentos PACI',
  '/paci/nuevo': 'Crear PACI',
  '/asignaturas': 'Asignaturas',
  '/cursos-niveles': 'Cursos / Niveles',
  '/letras': 'Letras de Curso',
  '/establecimientos': 'Establecimientos',
  '/usuarios': 'Gestión de Usuarios',
  '/objetivos-aprendizaje': 'Objetivos de Aprendizaje',
};

function resolveTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (/^\/estudiantes\/[^/]+\/editar$/.test(pathname)) return 'Editar Estudiante';
  if (/^\/paci\/[^/]+$/.test(pathname)) return 'Detalle PACI';
  return 'PACI PVC';
}

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const pageTitle = resolveTitle(location.pathname);

  const roleColors = {
    Admin: 'bg-accent/10 text-accent',
    Coordinador: 'bg-success/10 text-success',
    Docente: 'bg-primary/10 text-primary',
    Especialista: 'bg-warning/10 text-warning',
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-xl p-2.5 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all duration-200 cursor-pointer">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange" />
        </button>

        <div className="h-8 w-px bg-slate-200/80" />

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-bold text-white text-sm shadow-md shadow-primary/20">
            {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.nombre || 'Usuario'}</p>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleColors[user?.rol] || 'bg-slate-100 text-slate-600'}`}>
              {user?.rol || 'Sin rol'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
