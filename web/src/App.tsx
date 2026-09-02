import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { RequireAuth } from './features/auth/RequireAuth';
import { AuthPage } from './features/auth/AuthPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { ReminderCenterProvider } from './hooks/reminderCenter';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { CalendarPage } from './pages/CalendarPage';
import { FinancePage } from './pages/FinancePage';
import { SettingsPage } from './pages/SettingsPage';
import { RemindersPage } from './pages/RemindersPage';
import { GymPage } from './pages/GymPage';
import { GymDashboardPage } from './pages/gym/GymDashboardPage';
import { RoutinesPage } from './pages/gym/RoutinesPage';
import { RoutineEditorPage } from './pages/gym/RoutineEditorPage';
import { GymCalendarPage } from './pages/gym/GymCalendarPage';
import { ActiveWorkoutPage } from './pages/gym/ActiveWorkoutPage';

// Páginas que cargan recharts (la dependencia más pesada del bundle): se
// separan en su propio chunk y solo se descargan cuando el usuario las visita.
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const GymProgressPage = lazy(() => import('./pages/gym/GymProgressPage').then((m) => ({ default: m.GymProgressPage })));

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
            <ReminderCenterProvider>
              <AppLayout />
            </ReminderCenterProvider>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="habitos" element={<HabitsPage />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="finanzas" element={<FinancePage />} />
        <Route path="estadisticas" element={<Suspense fallback={<PageFallback />}><StatisticsPage /></Suspense>} />

        <Route path="recordatorios" element={<RemindersPage />} />

        <Route path="gimnasio" element={<GymPage />}>
          <Route index element={<GymDashboardPage />} />
          <Route path="rutinas" element={<RoutinesPage />} />
          <Route path="rutinas/:routineId" element={<RoutineEditorPage />} />
          <Route path="progreso" element={<Suspense fallback={<PageFallback />}><GymProgressPage /></Suspense>} />
          <Route path="calendario" element={<GymCalendarPage />} />
        </Route>
        <Route path="gimnasio/entrenar" element={<ActiveWorkoutPage />} />
        <Route path="gimnasio/entrenar/:dayId" element={<ActiveWorkoutPage />} />

        <Route path="configuracion" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
