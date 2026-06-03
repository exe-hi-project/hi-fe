import { Link } from 'react-router-dom';
import HiLogo from '../ui/HiLogo';

interface SiteFooterProps {
  tone?: 'rose' | 'blue' | 'admin' | 'neutral';
  className?: string;
}

const toneClasses = {
  rose: 'hover:text-pink-500',
  blue: 'hover:text-blue-500',
  admin: 'hover:text-violet-500',
  neutral: 'hover:text-slate-700',
};

export default function SiteFooter({ tone = 'neutral', className = '' }: SiteFooterProps) {
  const linkClass = `transition-colors ${toneClasses[tone]}`;

  return (
    <footer className={`border-t border-white/60 bg-white/65 px-4 py-8 text-sm text-slate-500 backdrop-blur-xl ${className}`}>
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 md:grid-cols-[1.2fr_1fr_1fr] md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <HiLogo size={34} />
            <div>
              <p className="font-extrabold text-slate-900">Hi</p>
              <p className="text-xs font-semibold text-slate-400">Sức khỏe sinh sản thông minh</p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-400">
            Hi giúp bạn theo dõi chu kỳ, cảm xúc và sức khỏe sinh sản theo cách riêng tư, mềm mại và dễ hiểu.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold md:justify-center">
          <Link className={linkClass} to="/female-dashboard">Tổng quan</Link>
          <Link className={linkClass} to="/cycles">Chu kỳ</Link>
          <Link className={linkClass} to="/pricing">Gói Hi</Link>
          <Link className={linkClass} to="/settings">Cài đặt</Link>
        </div>

        <div className="space-y-2 text-xs md:text-right">
          <p>
            Liên hệ:{' '}
            <a className={`font-bold text-slate-700 ${linkClass}`} href="mailto:hilover.space@gmail.com">
              hilover.space@gmail.com
            </a>
          </p>
          <p>
            Cộng đồng:{' '}
            <a
              className={`font-bold text-slate-700 ${linkClass}`}
              href="https://www.facebook.com/share/1HJnvBpE6L/"
              target="_blank"
              rel="noreferrer"
            >
              Facebook Hi
            </a>
          </p>
          <p className="text-slate-400">© 2026 Hi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
