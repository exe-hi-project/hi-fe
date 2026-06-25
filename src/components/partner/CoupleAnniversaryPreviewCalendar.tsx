import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { CoupleAnniversarySummary } from '../../types/shared';
import {
  getDayAnniversaryOccurrences,
  anniversaryBackground,
  anniversaryEffectClass,
  normalizeAnniversarySummary,
  toLocalIsoDate,
} from '../../utils/coupleAnniversaryCalendar';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

interface CoupleAnniversaryPreviewCalendarProps {
  enabled: boolean;
  className?: string;
  variant?: 'female' | 'male';
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

export default function CoupleAnniversaryPreviewCalendar({
  enabled,
  className = '',
  variant = 'female',
}: CoupleAnniversaryPreviewCalendarProps) {
  const isMale = variant === 'male';
  const [weeksOffset, setWeeksOffset] = useState(0);

  const today = new Date();
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate() + weeksOffset * 7);
  const days = getCalendarRange(anchor, 3);
  const todayIso = toLocalIsoDate(today);

  const monthCounts = days.reduce((acc, date) => {
    const label = monthLabel(date);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const shownMonths = Object.keys(monthCounts).reduce((a, b) =>
    monthCounts[a] >= monthCounts[b] ? a : b
  );

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => normalizeAnniversarySummary(data.anniversaries)),
    enabled,
  });

  if (!enabled) return null;

  const anniversaries = anniversariesQuery.data;

  return (
    <div className={`rounded-[2rem] border p-6 shadow-md backdrop-blur bg-white/95 ${isMale ? 'border-blue-100' : 'border-pink-100'} ${className}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>Lịch kỷ niệm</p>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>{shownMonths}</h4>
            {weeksOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeeksOffset(0)}
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border shadow-sm active:scale-95 cursor-pointer ${
                  isMale
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100/50'
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-600 border-pink-100/50'
                }`}
              >
                Hôm nay
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Các mốc ngày đặc biệt của hai bạn</p>
      </div>

      <div className="relative px-7">
        {/* Nút lướt về sau (quá khứ) */}
        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev - 3)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 active:scale-90 transition-all select-none z-10 cursor-pointer ${
            isMale ? 'text-blue-500 hover:text-blue-600' : 'text-pink-500 hover:text-pink-600'
          }`}
          aria-label="Previous weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_left</span>
        </button>

        <div className="grid grid-cols-7 gap-2">
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
                  'relative flex aspect-[1.3] min-h-[72px] flex-col items-center justify-between p-2 rounded-2xl text-sm font-extrabold transition-all border',
                  decorated
                    ? `${anniversaryBackground(event.color, event.effect)} ${anniversaryEffectClass(event.effect)}`
                    : 'border-slate-50/50 bg-slate-50/80 text-slate-500',
                  isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
                ].join(' ')}
                title={decorated ? `${event.title}` : undefined}
              >
                <span className="self-start text-[10px] font-bold text-slate-400">{date.getDate()}</span>
                {decorated && (
                  <div className="w-full text-center flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px]" style={{ color: event.color === 'sky' ? '#0ea5e9' : event.color === 'emerald' ? '#10b981' : event.color === 'amber' ? '#f59e0b' : event.color === 'violet' ? '#8b5cf6' : event.color === 'rose' ? '#f43f5e' : '#ec4899' }}>
                      {event.icon}
                    </span>
                    <span
                      className="text-[10px] font-extrabold text-slate-800 truncate max-w-full block px-1"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      title={event.title}
                    >
                      {event.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nút lướt tới (tương lai) */}
        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev + 3)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 active:scale-90 transition-all select-none z-10 cursor-pointer ${
            isMale ? 'text-blue-500 hover:text-blue-600' : 'text-pink-500 hover:text-pink-600'
          }`}
          aria-label="Next weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_right</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100/50 pt-3" style={{ fontFamily: "'Inter', sans-serif" }}>
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
  );
}

