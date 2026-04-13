import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

const femaleItems = [
  { to: '/dashboard', icon: '🏠', label: 'Trang chủ' },
  { to: '/calendar', icon: '📅', label: 'Lịch' },
  { to: '/cycles', icon: '🌸', label: 'Chu kỳ' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

const maleItems = [
  { to: '/dashboard', icon: '🏠', label: 'Trang chủ' },
  { to: '/calendar', icon: '📅', label: 'Lịch' },
  { to: '/notifications', icon: '🔔', label: 'Thông báo' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

const adminItems = [
  { to: '/admin', icon: '🛠️', label: 'Admin' },
  { to: '/notifications', icon: '🔔', label: 'Thông báo' },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function MobileNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  const items = user?.role === 'admin' ? adminItems : user?.gender === 'male' ? maleItems : femaleItems;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-inset-bottom shadow-lg">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                active ? 'text-purple-400' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <span className={clsx('text-xl transition-transform', active && 'scale-110')}>{item.icon}</span>
              <span className={clsx('text-xs font-medium', active && 'font-semibold')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
