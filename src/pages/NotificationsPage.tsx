import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';
import { Notification } from '../types';

const typeIcon: Record<string, string> = {
  period_coming: '🗓️',
  period_started: '🌸',
  reminder: '⏰',
  partner: '💑',
  PARTNER_CONNECT: '💑',
  PARTNER_DISCONNECT: '💔',
  PERIOD_REMINDER: '🩸',
  PARTNER_PERIOD_REMINDER: '💑',
};

const typeLabel: Record<string, string> = {
  period_coming: 'Sắp đến kỳ',
  period_started: 'Bắt đầu kỳ',
  reminder: 'Nhắc nhở',
  partner: 'Bạn đời',
  PARTNER_CONNECT: 'Kết nối bạn đời',
  PARTNER_DISCONNECT: 'Hủy kết nối',
  PERIOD_REMINDER: 'Nhắc kỳ kinh',
  PARTNER_PERIOD_REMINDER: 'Nhắc kỳ kinh đối phương',
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.notifications),
  });

  const { mutate: markAll } = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Đã đánh dấu tất cả đã đọc');
    },
  });

  const { mutate: markOne } = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thông báo 🔔</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll()}>
            Đánh dấu tất cả
          </Button>
        )}
      </div>

      {isLoading ? (
        <Spinner className="py-8" />
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="font-semibold text-gray-700">Chưa có thông báo nào</p>
          <p className="text-sm text-gray-400 mt-1">Bạn sẽ nhận được thông báo về chu kỳ tại đây</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.read && markOne(n._id!)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
                ${n.read ? 'bg-white border-gray-100' : 'bg-rose-50 border-rose-100 hover:border-rose-200'}
              `}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${n.read ? 'bg-gray-100' : 'bg-rose-100'}`}>
                {typeIcon[n.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                  {!n.read && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full mt-1 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="gray" size="sm">{typeLabel[n.type] ?? n.type}</Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt!).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
