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

// Datos base (Admin only)
import AsignaturasPage from '../pages/datos-base/AsignaturasPage';
import CursosNivelesPage from '../pages/datos-base/CursosNivelesPage';
import LetrasPage from '../pages/datos-base/LetrasPage';
import EstablecimientosPage from '../pages/datos-base/EstablecimientosPage';
import UsersPage from '../pages/datos-base/UsersPage';
import OaPage from '../pages/datos-base/OaPage';

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

            {/* Datos base — Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="asignaturas" element={<AsignaturasPage />} />
              <Route path="cursos-niveles" element={<CursosNivelesPage />} />
              <Route path="letras" element={<LetrasPage />} />
              <Route path="establecimientos" element={<EstablecimientosPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="objetivos-aprendizaje" element={<OaPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
