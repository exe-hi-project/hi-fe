import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';
import HiLogo from '../ui/HiLogo';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const femaleNavItems: NavItem[] = [
  { to: '/dashboard', icon: '🏠', label: 'Trang chủ' },
  { to: '/calendar', icon: '📅', label: 'Lịch' },
  { to: '/cycles', icon: '🌸', label: 'Chu kỳ' },
  { to: '/symptoms', icon: '📝', label: 'Triệu chứng' },
  { to: '/chat', icon: '💬', label: 'AI Chat' },
];

const maleNavItems: NavItem[] = [
  { to: '/dashboard', icon: '🏠', label: 'Trang chủ' },
  { to: '/calendar', icon: '📅', label: 'Lịch' },
  { to: '/chat', icon: '💬', label: 'AI Chat' },
  { to: '/notifications', icon: '🔔', label: 'Thông báo' },
];

const adminNavItems: NavItem[] = [
  { to: '/admin', icon: '🛠️', label: 'Quản trị' },
  { to: '/notifications', icon: '🔔', label: 'Thông báo' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin'
    ? adminNavItems
    : user?.gender === 'male'
      ? maleNavItems
      : femaleNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center gap-3">
          <HiLogo size={36} />
          <span
            className="text-lg font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >Hi, Lover</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #a8dff0 0%, #d4a8e8 50%, #f9a8c9 100%)' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              location.pathname === item.to
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-500'
            )}
            style={location.pathname === item.to ? { background: 'linear-gradient(135deg, #a8dff0 0%, #d4a8e8 50%, #f9a8c9 100%)' } : {}}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {user?.role !== 'admin' && (
          <>
            <Link
              to="/notifications"
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                location.pathname === '/notifications'
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-purple-50 hover:text-purple-500'
              )}
              style={location.pathname === '/notifications' ? { background: 'linear-gradient(135deg, #a8dff0 0%, #d4a8e8 50%, #f9a8c9 100%)' } : {}}
            >
              <span className="text-lg">🔔</span>
              Thông báo
            </Link>
            <Link
              to="/settings"
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                location.pathname === '/settings'
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-purple-50 hover:text-purple-500'
              )}
              style={location.pathname === '/settings' ? { background: 'linear-gradient(135deg, #a8dff0 0%, #d4a8e8 50%, #f9a8c9 100%)' } : {}}
            >
              <span className="text-lg">⚙️</span>
              Cài đặt
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200 w-full"
        >
          <span className="text-lg">🚪</span>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
