import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminRoute from '../components/auth/AdminRoute';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import NotFoundPage from '../pages/NotFoundPage';

// Estudiantes
import EstudiantesPage from '../pages/estudiantes/EstudiantesPage';
import EstudianteFormPage from '../pages/estudiantes/EstudianteFormPage';

// PACI
import PaciListPage from '../pages/paci/PaciListPage';
import PaciWizardPage from '../pages/paci/PaciWizardPage';
import PaciViewPage from '../pages/paci/PaciViewPage';
import SeguimientoPaciPage from '../pages/paci/SeguimientoPaciPage';

// Datos base (Admin only)
import AsignaturasPage from '../pages/datos-base/AsignaturasPage';
import CursosNivelesPage from '../pages/datos-base/CursosNivelesPage';
import LetrasPage from '../pages/datos-base/LetrasPage';
import EstablecimientosPage from '../pages/datos-base/EstablecimientosPage';
import UsersPage from '../pages/datos-base/UsersPage';
import OaPage from '../pages/datos-base/OaPage';
import EjesPage from '../pages/datos-base/EjesPage';
import IndicadoresPage from '../pages/datos-base/IndicadoresPage';
import EvaluacionesPage from '../pages/datos-base/EvaluacionesPage';
import ProfesoresPage from '../pages/datos-base/ProfesoresPage';
import ImportPage from '../pages/datos-base/ImportPage';
import ChatbotAdminPage from '../pages/datos-base/ChatbotAdminPage';
import IaAdminPage from '../pages/datos-base/IaAdminPage';
import MatricesAdminPage from '../pages/datos-base/MatricesAdminPage';
import CoreAdminPage from '../pages/datos-base/CoreAdminPage';
import DuaFortalezasPage from '../pages/datos-base/DuaFortalezasPage';
import DuaBarrerasPage from '../pages/datos-base/DuaBarrerasPage';
import DuaAccesoCurricularPage from '../pages/datos-base/DuaAccesoCurricularPage';
import DuaEstrategiasPage from '../pages/datos-base/DuaEstrategiasPage';
import DuaHabilidadesBasePage from '../pages/datos-base/DuaHabilidadesBasePage';

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />

            {/* Estudiantes */}
            <Route path="estudiantes" element={<EstudiantesPage />} />
            <Route path="estudiantes/nuevo" element={<EstudianteFormPage />} />
            <Route path="estudiantes/:id/editar" element={<EstudianteFormPage />} />

            {/* PACI */}
            <Route path="paci" element={<PaciListPage />} />
            <Route path="paci/nuevo" element={<PaciWizardPage />} />
            <Route path="paci/:id" element={<PaciViewPage />} />
            <Route path="paci/:id/seguimiento" element={<SeguimientoPaciPage />} />

            {/* Datos base — Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="asignaturas" element={<AsignaturasPage />} />
              <Route path="cursos-niveles" element={<CursosNivelesPage />} />
              <Route path="letras" element={<LetrasPage />} />
              <Route path="establecimientos" element={<EstablecimientosPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="objetivos-aprendizaje" element={<OaPage />} />
              <Route path="ejes" element={<EjesPage />} />
              <Route path="indicadores" element={<IndicadoresPage />} />
              <Route path="evaluaciones" element={<EvaluacionesPage />} />
              <Route path="profesores" element={<ProfesoresPage />} />
              <Route path="importar" element={<ImportPage />} />
              <Route path="chatbot-admin" element={<ChatbotAdminPage />} />
              <Route path="ia-admin" element={<IaAdminPage />} />
              <Route path="matrices" element={<MatricesAdminPage />} />
              <Route path="core-curricular" element={<CoreAdminPage />} />
              <Route path="dua/fortalezas" element={<DuaFortalezasPage />} />
              <Route path="dua/barreras" element={<DuaBarrerasPage />} />
              <Route path="dua/acceso-curricular" element={<DuaAccesoCurricularPage />} />
              <Route path="dua/estrategias" element={<DuaEstrategiasPage />} />
              <Route path="dua/habilidades-base" element={<DuaHabilidadesBasePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
