import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { RequireAuth } from './features/auth/RequireAuth';
import { AuthPage } from './features/auth/AuthPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { CalendarPage } from './pages/CalendarPage';
import { FinancePage } from './pages/FinancePage';
import { SettingsPage } from './pages/SettingsPage';

// Estadísticas carga recharts (la dependencia más pesada del bundle): se
// separa en su propio chunk y solo se descarga cuando el usuario la visita.
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));

function PageFallback() {
  return <div className="p-6 text-sm text-[var(--text-muted)]">Cargando…</div>;
}

function LoginRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

export default function App() {
  const { isPasswordRecovery, loading } = useAuth();

  // El link de "recuperar contraseña" tiene prioridad sobre cualquier ruta:
  // no dejamos que el usuario navegue a otro lado hasta que defina la
  // contraseña nueva (o cierre esa sesión temporal).
  if (!loading && isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="habitos" element={<HabitsPage />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="finanzas" element={<FinancePage />} />
        <Route path="estadisticas" element={<Suspense fallback={<PageFallback />}><StatisticsPage /></Suspense>} />
        <Route path="configuracion" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
