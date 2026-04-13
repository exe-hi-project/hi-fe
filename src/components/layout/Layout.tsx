import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
