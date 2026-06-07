import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const QUICK_MOOD_OPTIONS = [
  { label: 'Vui vẻ', icon: 'sentiment_satisfied', score: 5, className: 'bg-amber-50 text-amber-700 border-amber-100' },
  { label: 'Bình tĩnh', icon: 'self_improvement', score: 4, className: 'bg-sky-50 text-sky-700 border-sky-100' },
  { label: 'Lo lắng', icon: 'rainy', score: 2, className: 'bg-violet-50 text-violet-700 border-violet-100' },
  { label: 'Mệt mỏi', icon: 'battery_1_bar', score: 2, className: 'bg-slate-50 text-slate-600 border-slate-100' },
  { label: 'Bực bội', icon: 'mood_bad', score: 1, className: 'bg-rose-50 text-rose-700 border-rose-100' },
  { label: 'Thiếu năng lượng', icon: 'bedtime', score: 2, className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
];

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface QuickMoodCardProps {
  accent?: 'rose' | 'blue';
  className?: string;
  sendToPartner?: boolean;
  onSaved?: (payload: { moodScore: number; partnerNotificationSent?: boolean }) => void;
}

export default function QuickMoodCard({
  accent = 'rose',
  className = '',
  sendToPartner = false,
  onSaved,
}: QuickMoodCardProps) {
  const queryClient = useQueryClient();
  const todayIso = toIsoDate(new Date());

  const todayLogQuery = useQuery({
    queryKey: ['daily-log', todayIso],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/daily-logs/${todayIso}`);
        return data.dailyLog as { moodScore?: number } | null;
      } catch {
        return null;
      }
    },
  });

  const moodMutation = useMutation({
    mutationFn: async (moodScore: number) => {
      const { data } = await api.patch(`/daily-logs/${todayIso}/mood`, { moodScore });
      return { moodScore, partnerNotificationSent: Boolean(data?.partnerNotificationSent) };
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', todayIso] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      onSaved?.(payload);
      toast.success(payload.partnerNotificationSent ? 'Đã gửi cảm xúc tới Người ấy' : 'Đã ghi cảm xúc nhanh');
    },
    onError: () => toast.error('Không thể lưu cảm xúc lúc này'),
  });

  const activeScore = todayLogQuery.data?.moodScore;
  const iconClass = accent === 'blue' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className={`rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <span className={`material-symbols-outlined text-[20px] ${iconClass}`}>emoji_emotions</span>
            Cảm xúc nhanh
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {sendToPartner
              ? 'Chạm một lần để ghi lại cảm xúc và gửi tới Người ấy.'
              : 'Chạm một lần để ghi lại cảm xúc hiện tại.'}
          </p>
        </div>
        {moodMutation.isPending && <span className="text-[10px] font-bold text-slate-400">Đang lưu...</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_MOOD_OPTIONS.map((mood) => {
          const active = activeScore === mood.score;
          return (
            <button
              key={mood.label}
              type="button"
              onClick={() => moodMutation.mutate(mood.score)}
              disabled={moodMutation.isPending}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-60 ${mood.className} ${active ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}
            >
              <span className="material-symbols-outlined text-[17px]">{mood.icon}</span>
              {mood.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
