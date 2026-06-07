import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import SiteFooter from './SiteFooter';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8f6f7] relative overflow-x-hidden font-sans">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-28 -top-28 h-[420px] w-[420px] rounded-full bg-pink-200/35 blur-3xl" />
        <div className="absolute right-[-120px] top-32 h-[360px] w-[360px] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-200/25 blur-3xl" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-16 pt-6">
          <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
            <Outlet />
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
