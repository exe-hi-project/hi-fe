import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { CoupleAnniversarySummary } from '../../types/shared';
import {
  anniversaryBackground,
  anniversaryDotClass,
  anniversaryEffectClass,
  getDayAnniversaryOccurrences,
  getUpcomingAnniversaryOccurrences,
  normalizeAnniversarySummary,
  toLocalIsoDate,
} from '../../utils/coupleAnniversaryCalendar';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

interface CoupleAnniversaryCompactCardProps {
  enabled: boolean;
  variant?: 'female' | 'male';
  className?: string;
}

function shortDate(value?: string) {
  if (!value) return '--';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getCalendarRange(today = new Date(), weeksCount = 3) {
  const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
  
  const days: Date[] = [];
  for (let i = 0; i < weeksCount * 7; i++) {
    days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }
  return days;
}

export default function CoupleAnniversaryCompactCard({
  enabled,
  variant = 'female',
  className = '',
}: CoupleAnniversaryCompactCardProps) {
  const isMale = variant === 'male';
  const accent = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentSoft = isMale ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-pink-50 text-pink-700 border-pink-100';
  const today = new Date();
  const days = getCalendarRange(today, 3);
  const todayIso = toLocalIsoDate(today);
  const shownMonths = Array.from(new Set(days.map((date) => monthLabel(date)))).join(' / ');

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => normalizeAnniversarySummary(data.anniversaries)),
    enabled,
  });

  if (!enabled) return null;

  const anniversaries = anniversariesQuery.data;
  const upcoming = getUpcomingAnniversaryOccurrences(anniversaries, today, 3);

  return (
    <div className={`rounded-[2rem] border bg-white/95 p-6 shadow-md backdrop-blur ${isMale ? 'border-blue-100' : 'border-pink-100'} ${className}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Days count & list of events */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${accent}`}>
                  {anniversaries?.startDate?.title || 'Ngày bên nhau'}
                </p>
                <p
                  className="mt-1 text-4xl font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {anniversariesQuery.isLoading ? '--' : anniversaries?.daysTogether ?? '--'}
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-400">
                  {anniversaries?.startDate?.eventDate ? `Từ ${shortDate(anniversaries.startDate.eventDate)}` : 'Chưa chọn ngày bắt đầu'}
                </p>
              </div>
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl border ${accentSoft}`}>
                <span className="material-symbols-outlined text-[22px]">favorite</span>
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {anniversariesQuery.isError ? (
                <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">Không tải được kỷ niệm.</p>
              ) : upcoming.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {anniversaries?.startDate ? 'Chưa có note kỷ niệm sắp tới.' : 'Chọn ngày bên nhau để bắt đầu lưu kỷ niệm.'}
                </p>
              ) : upcoming.map((item) => (
                <div key={item.key} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${anniversaryBackground(item.event.color, item.event.effect)}`}>
                  <span className={`size-2.5 rounded-full ${anniversaryDotClass[item.event.color] ?? anniversaryDotClass.pink}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-800">{item.event.title}</p>
                    <p className="text-[11px] font-bold opacity-70">{shortDate(item.displayDate)}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">{item.event.icon}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/partner?view=anniversaries"
            className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-black transition ${
              isMale ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-pink-500 text-white hover:bg-pink-600'
            }`}
          >
            {anniversaries?.startDate ? 'Mở lịch kỷ niệm' : 'Chọn ngày bên nhau'}
          </Link>
        </div>

        {/* Right Column: 3-week Anniversary Calendar Grid */}
        <div className="lg:col-span-7 border-t border-slate-100 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>Lịch kỷ niệm</p>
              <h4 className="text-base font-extrabold text-slate-900">{shownMonths}</h4>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">Các mốc ngày đặc biệt</p>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-center text-[10px] font-extrabold text-slate-400">
                {day}
              </div>
            ))}
            {days.map((date) => {
              const iso = toLocalIsoDate(date);
              const isToday = iso === todayIso;
              const occurrences = getDayAnniversaryOccurrences(anniversaries, iso, date.getFullYear(), date.getMonth());
              const primary = occurrences[0];
              const event = primary?.event;
              const decorated = Boolean(primary && event);

              return (
                <div
                  key={iso}
                  className={[
                    'relative flex aspect-[1.25] min-h-9 flex-col items-center justify-center rounded-2xl text-sm font-extrabold transition-all border',
                    decorated
                      ? `${anniversaryBackground(event.color, event.effect)} ${anniversaryEffectClass(event.effect)}`
                      : 'border-slate-50/50 bg-slate-50/80 text-slate-500',
                    isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
                  ].join(' ')}
                  title={decorated ? `${event.title}` : undefined}
                >
                  <span>{date.getDate()}</span>
                  {decorated && (
                    <span className="anniversary-icon absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-white/90 shadow-sm border border-slate-100">
                      <span className="material-symbols-outlined text-[12px]" style={{ color: event.color === 'sky' ? '#0ea5e9' : event.color === 'emerald' ? '#10b981' : event.color === 'amber' ? '#f59e0b' : event.color === 'violet' ? '#8b5cf6' : event.color === 'rose' ? '#f43f5e' : '#ec4899' }}>
                        {event.icon}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100/50 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className="size-2 rounded-full bg-pink-400" />
              Kỷ niệm yêu thương
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className="size-2 rounded-full bg-violet-400" />
              Ngày đặc biệt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

