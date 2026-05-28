import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import HiLogo from '../ui/HiLogo';

interface NavbarProps {
  /** Show landing-page anchor links (Tính năng / Blog…). Only visible when not logged in. */
  showAnchors?: boolean;
}

export default function Navbar({ showAnchors = false }: NavbarProps) {
  const { token, user, logout } = useAuthStore();
  const { data: subscription } = useSubscription();
  const isPremium = (subscription?.plan && ['premium', 'monthly', 'yearly', 'premium_monthly', 'premium_yearly'].includes(subscription.plan)) && subscription?.status === 'active';

  const isAdmin = user?.role === 'admin';
  const homePath = isAdmin ? '/admin' : user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard';

  const dashboardLinks = isAdmin ? [
    { to: '/admin', label: 'Quản trị', icon: 'admin_panel_settings' },
    { to: '/notifications', label: 'Thông báo', icon: 'notifications' },
  ] : user?.gender === 'female' ? [
    { to: '/female-dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { to: '/cycles', label: 'Chu kỳ', icon: 'water_drop' },
  ] : [
    { to: '/male-dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { to: '/male-settings/notifications', label: 'Cặp đôi', icon: 'favorite' },
  ];
  const location = useLocation();
  const loggedIn = !!token;

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close on route change
  useEffect(() => { setDropOpen(false); }, [location.pathname]);

  const menuItems = isAdmin ? [
    { to: '/admin', icon: 'admin_panel_settings', label: 'Quản trị hệ thống' },
    { to: '/notifications', icon: 'notifications', label: 'Thông báo' },
    { to: '/settings', icon: 'manage_accounts', label: 'Hồ sơ cá nhân' },
  ] : [
    { to: user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard', icon: 'dashboard', label: 'Tổng quan' },
    { to: user?.gender === 'female' ? '/settings/notifications' : '/male-settings/notifications', icon: 'notifications', label: 'Thông báo & Cặp đôi' },
    { to: '/settings', icon: 'manage_accounts', label: 'Hồ sơ cá nhân' },
    { to: user?.gender === 'female' ? '/cycles' : '/calendar', icon: 'water_drop', label: user?.gender === 'female' ? 'Chu kỳ của tôi' : 'Lịch của bạn' },
  ];

  return (
    <div className="sticky top-4 z-50 flex justify-center w-full px-4">
      <header className="lp-floating-nav flex items-center justify-between whitespace-nowrap rounded-full px-6 py-3 w-full max-w-[1100px]">

        {/* ── Logo ── */}
        <Link
          to={loggedIn ? homePath : '/'}
          className="flex items-center gap-3 flex-shrink-0"
        >
          <HiLogo size={34} />
          <span
            className="text-lg font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Hi, Lover
          </span>
        </Link>

        {/* ── Center links ── */}
        {loggedIn ? (
          /* App nav — always shown when logged in */
          <nav className="hidden md:flex flex-1 justify-center items-center gap-1 bg-gray-100/60 p-1 rounded-xl mx-4">
            {dashboardLinks.map(({ to, label, icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-white shadow-sm text-pink-500'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : showAnchors ? (
          /* Landing page anchor links — only when not logged in */
          <div className="hidden md:flex flex-1 justify-center gap-8">
            <a href="#features" className="text-slate-500 hover:text-purple-400 transition-colors text-sm font-medium">Tính năng</a>
            <a href="#about"    className="text-slate-500 hover:text-purple-400 transition-colors text-sm font-medium">Về chúng tôi</a>
            <a href="#reviews"  className="text-slate-500 hover:text-purple-400 transition-colors text-sm font-medium">Blog</a>
          </div>
        ) : null}

        {/* ── Right actions ── */}
        <div className="flex items-center gap-2 ml-auto">
          {loggedIn ? (
            <>
              {/* Bell */}
              <Link
                to="/notifications"
                className="relative w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-slate-500 hover:text-pink-500 hover:border-pink-200 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              </Link>

              {/* Avatar + name + dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white border border-gray-100 rounded-full hover:shadow-sm transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[16px]">person</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 hidden sm:block">{user?.name?.split(' ').pop()}</span>
                  <span
                    className={`material-symbols-outlined text-slate-400 text-lg transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Dropdown panel */}
                {dropOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-1.5 justify-between">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[110px]">{user?.name}</p>
                        {isPremium ? (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-white text-[9px] font-black uppercase tracking-wider scale-95 shadow-sm">
                            💎 Premium
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[9px] font-bold uppercase tracking-wider scale-95">
                            Free
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">{user?.email}</p>
                    </div>

                    {/* Menu items */}
                    {menuItems.map(({ to, icon, label }) => (
                      <Link
                        key={`${to}-${label}`}
                        to={to}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-pink-400">{icon}</span>
                        {label}
                      </Link>
                    ))}

                    {/* Divider + logout */}
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={() => { setDropOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:flex cursor-pointer items-center justify-center rounded-full h-9 px-5 lp-btn-white text-slate-900 text-sm font-bold"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="lp-btn-gradient flex cursor-pointer items-center justify-center rounded-full h-9 px-5 text-white text-sm font-bold shadow-md"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>
    </div>
  );
}


