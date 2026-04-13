import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import FemaleDashboardPage from './pages/FemaleDashboardPage';
import CalendarPage from './pages/CalendarPage';
import ChatPage from './pages/ChatPage';
import CyclesPage from './pages/CyclesPage';
import SymptomsPage from './pages/SymptomsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import SettingsNotificationsPage from './pages/SettingsNotificationsPage';
import MaleDashboardPage from './pages/MaleDashboardPage';
import MaleSettingsNotificationsPage from './pages/MaleSettingsNotificationsPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/layout/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user && !user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function UserOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function authDest(user: ReturnType<typeof useAuthStore.getState>['user']) {
  if (user?.role === 'admin') return '/admin';
  if (!user?.onboardingCompleted) return '/onboarding';
  return user.gender === 'female' ? '/female-dashboard' : '/male-dashboard';
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to={authDest(user)} replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (token) return <Navigate to={authDest(user)} replace />;
  return <>{children}</>;
}

function HomeRoute() {
  const { token, user } = useAuthStore();
  if (token) return <Navigate to={authDest(user)} replace />;
  return <LandingPage />;
}

/** Redirect /dashboard → gender-specific dashboard */
function DashboardRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to={user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      {/* Female dashboard — standalone (no sidebar Layout) */}
      <Route path="/female-dashboard" element={<UserOnlyRoute><ProtectedRoute><FemaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Standalone pages for female users */}
      <Route path="/settings/notifications" element={<UserOnlyRoute><ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/cycles" element={<UserOnlyRoute><ProtectedRoute><CyclesPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Male dashboard — standalone (no sidebar Layout) */}
      <Route path="/male-dashboard" element={<UserOnlyRoute><ProtectedRoute><MaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/male-settings/notifications" element={<UserOnlyRoute><ProtectedRoute><MaleSettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route element={<Layout />}>
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/symptoms" element={<ProtectedRoute><SymptomsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
