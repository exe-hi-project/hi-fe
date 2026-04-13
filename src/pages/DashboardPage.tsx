import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';

function MaleDashboard() {
  const { user } = useAuthStore();
  const { data: partnerData, isLoading } = useQuery({
    queryKey: ['partnerCycles'],
    queryFn: () => api.get('/users/partner/cycles').then((r) => r.data).catch(() => null),
    enabled: !!user?.partnerId,
  });

  const today = new Date();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Xin chào, {user?.name?.split(' ').pop()} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">Hôm nay là ngày {today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {!user?.partnerId ? (
        <Card variant="gradient" className="text-center py-8">
          <div className="text-5xl mb-4">💑</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Kết nối với bạn đời</h3>
          <p className="text-sm text-gray-500 mb-4">Kết nối để theo dõi và hỗ trợ bạn đời tốt hơn</p>
          <a href="/settings" className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:underline">
            Kết nối ngay →
          </a>
        </Card>
      ) : (
        <Card variant="gradient">
          <CardHeader>
            <CardTitle>Thông tin bạn đời</CardTitle>
          </CardHeader>
          {isLoading ? (
            <Spinner size="sm" className="py-4" />
          ) : partnerData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-2xl">👩</div>
                <div>
                  <p className="font-semibold text-gray-800">{partnerData.partner?.name}</p>
                  <Badge variant="period">{partnerData.currentPhase ?? 'Đang cập nhật'}</Badge>
                </div>
              </div>
              {partnerData.daysUntilPeriod !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🗓️</span>
                  <span>
                    {partnerData.daysUntilPeriod <= 0
                      ? 'Đang có kinh'
                      : `Kỳ kinh tiếp theo trong ${partnerData.daysUntilPeriod} ngày`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Chưa có dữ liệu từ bạn đời</p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📅', label: 'Lịch', href: '/calendar' },
          { icon: '💬', label: 'AI Chat', href: '/chat' },
          { icon: '🔔', label: 'Thông báo', href: '/notifications' },
          { icon: '⚙️', label: 'Cài đặt', href: '/settings' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-100 transition-all duration-200">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  // Female users get their own full-page dashboard (no sidebar)
  if (user?.gender === 'female') return <Navigate to="/female-dashboard" replace />;
  return <MaleDashboard />;
}
