import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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
import FloatingHiChat from './components/chat/FloatingHiChat';
import { HelpPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentCancelPage from './pages/payment/PaymentCancelPage';
import { getSafeOAuthState } from './lib/googleAuth';

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

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.onboardingCompleted) return <Navigate to={authDest(user)} replace />;
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
  const { socialLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const state = params.get('state');
      if (accessToken) {
        // Clear hash from URL immediately to keep the URL clean
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        const performRedirectLogin = async () => {
          toast.loading('Đang xử lý đăng nhập Google...', { id: 'google-redirect-login' });
          try {
            const user = await socialLogin('google', { accessToken });
            toast.dismiss('google-redirect-login');
            toast.success('Đăng nhập Google thành công!');
            
            // Navigate to appropriate page
            let destination = '/male-dashboard';
            if (user.role === 'admin') destination = '/admin';
            else if (!user.onboardingCompleted) destination = '/onboarding';
            else if (user.gender === 'female') destination = '/female-dashboard';

            navigate(getSafeOAuthState(state, destination));
          } catch (err: any) {
            toast.dismiss('google-redirect-login');
            toast.error(err.message || 'Đăng nhập Google thất bại');
          }
        };
        performRedirectLogin();
      }
    }
  }, [location.hash, socialLogin, navigate]);

  return (
    <>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
      <Route path="/reset-password/:token" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      {/* Female dashboard — standalone (no sidebar Layout) */}
      <Route path="/female-dashboard" element={<UserOnlyRoute><ProtectedRoute><FemaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Standalone pages for female users */}
      <Route path="/settings/notifications" element={<UserOnlyRoute><ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/cycles" element={<UserOnlyRoute><ProtectedRoute><CyclesPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Male dashboard — standalone (no sidebar Layout) */}
      <Route path="/male-dashboard" element={<UserOnlyRoute><ProtectedRoute><MaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/male-settings/notifications" element={<UserOnlyRoute><ProtectedRoute><MaleSettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Standalone payment routes */}
      <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancelPage /></ProtectedRoute>} />

      {/* Admin — standalone, no Navbar */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/symptoms" element={<ProtectedRoute><SymptomsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
    <FloatingHiChat />
    </>
  );
}
