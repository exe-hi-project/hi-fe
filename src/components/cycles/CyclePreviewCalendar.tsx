import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { CycleInsights, CycleRecord, CoupleAnniversarySummary, CoupleAnniversaryColor } from '../../types/shared';
import {
  CYCLE_DAY_CLASSES,
  CYCLE_LEGEND,
  getCalendarAnchor,
  getCalendarRange,
  getCycleDayKind,
  toIsoDate,
} from '../../utils/cycleCalendar';
import {
  getDayAnniversaryOccurrences,
  anniversaryEffectClass,
  STICKER_MAP,
} from '../../utils/coupleAnniversaryCalendar';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const ANNIVERSARY_BORDER_CLASSES: Record<CoupleAnniversaryColor, string> = {
  pink: 'border-pink-500 border-2 border-solid shadow-[0_0_8px_rgba(244,114,182,0.4)]',
  rose: 'border-rose-500 border-2 border-solid shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  violet: 'border-violet-500 border-2 border-solid shadow-[0_0_8px_rgba(139,92,246,0.4)]',
  sky: 'border-sky-500 border-2 border-solid shadow-[0_0_8px_rgba(14,165,233,0.4)]',
  emerald: 'border-emerald-500 border-2 border-solid shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  amber: 'border-amber-500 border-2 border-solid shadow-[0_0_8px_rgba(245,158,11,0.4)]',
};

interface CyclePreviewCalendarProps {
  cycles: CycleRecord[];
  insights?: CycleInsights | null;
  className?: string;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

export default function CyclePreviewCalendar({ cycles, insights, className = '' }: CyclePreviewCalendarProps) {
  const { user } = useAuthStore();
  const hasPartner = !!user?.partnerId;
  const [weeksOffset, setWeeksOffset] = useState(0);

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => data.anniversaries),
    enabled: hasPartner,
  });
  const anniversaries = anniversariesQuery.data;

  const baseAnchor = getCalendarAnchor(insights, cycles);
  const anchor = new Date(baseAnchor.getFullYear(), baseAnchor.getMonth(), baseAnchor.getDate() + weeksOffset * 7);
  const days = getCalendarRange(anchor, 3);
  const todayIso = toIsoDate(new Date());
  const monthCounts = days.reduce((acc, date) => {
    const label = monthLabel(date);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const shownMonths = Object.keys(monthCounts).reduce((a, b) =>
    monthCounts[a] >= monthCounts[b] ? a : b
  );

  return (
    <div className={`rounded-[2rem] border border-rose-100/70 bg-white/80 p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Lịch chu kỳ</p>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-slate-900">{shownMonths}</h4>
            {weeksOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeeksOffset(0)}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all border border-rose-100/50 shadow-sm active:scale-95 cursor-pointer"
              >
                Hôm nay
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Dự đoán chỉ mang tính tham khảo</p>
      </div>

      <div className="relative px-7">
        {/* Nút lướt về sau (quá khứ) */}
        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev - 3)}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-rose-500 hover:text-rose-600 active:scale-90 transition-all select-none z-10 cursor-pointer"
          aria-label="Previous weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_left</span>
        </button>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-[10px] font-extrabold text-slate-400">
              {day}
            </div>
          ))}
          {days.map((date) => {
            const iso = toIsoDate(date);
            const kind = getCycleDayKind(date, cycles, insights);
            const isToday = iso === todayIso;

            // Anniversary check
            const occurrences = getDayAnniversaryOccurrences(anniversaries, iso, date.getFullYear(), date.getMonth());
            const primary = occurrences[0];
            const event = primary?.event;
            const decorated = Boolean(primary && event);

            let cellClass = '';
            if (kind) {
              if (decorated) {
                if (kind === 'recorded') {
                  cellClass = 'bg-rose-200 text-rose-800';
                } else if (kind === 'predicted') {
                  cellClass = 'bg-white text-rose-500';
                } else if (kind === 'fertile') {
                  cellClass = 'bg-sky-50 text-sky-700';
                } else if (kind === 'ovulation') {
                  cellClass = 'bg-sky-200 text-sky-900';
                } else if (kind === 'delayed') {
                  cellClass = 'bg-slate-100 text-slate-500';
                }
              } else {
                cellClass = `${CYCLE_DAY_CLASSES[kind]} border-transparent`;
              }
            } else {
              if (decorated) {
                cellClass = 'bg-slate-50/80 text-slate-500';
              } else {
                cellClass = 'border-slate-50/50 bg-slate-50/80 text-slate-500';
              }
            }

            const borderClass = decorated
              ? `${ANNIVERSARY_BORDER_CLASSES[event.color ?? 'pink']} ${anniversaryEffectClass(event.effect)}`
              : '';

            return (
              <div
                key={iso}
                className={[
                  'relative flex aspect-[1.25] min-h-9 items-center justify-center rounded-2xl text-sm font-extrabold transition-all border',
                  cellClass,
                  borderClass,
                  isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
                ].join(' ')}
                title={decorated ? `${event.title}` : date.toLocaleDateString('vi-VN')}
              >
                {date.getDate()}
                {decorated && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-white/90 shadow-sm border border-slate-100 text-[10px] anniversary-icon">
                    {STICKER_MAP[event.sticker] ? STICKER_MAP[event.sticker] : (
                      <span className="material-symbols-outlined text-[10px]" style={{ color: event.color === 'sky' ? '#0ea5e9' : event.color === 'emerald' ? '#10b981' : event.color === 'amber' ? '#f59e0b' : event.color === 'violet' ? '#8b5cf6' : event.color === 'rose' ? '#f43f5e' : '#ec4899' }}>
                        {event.icon || 'favorite'}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Nút lướt tới (tương lai) */}
        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev + 3)}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-rose-500 hover:text-rose-600 active:scale-90 transition-all select-none z-10 cursor-pointer"
          aria-label="Next weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_right</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {CYCLE_LEGEND.map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className={`size-2.5 rounded-full ${item.dotClassName}`} />
            {item.label}
          </span>
        ))}
        {hasPartner && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border-l border-slate-200 pl-4">
            <span className="size-2.5 rounded-full bg-pink-400" />
            Ngày đặc biệt / Kỷ niệm
          </span>
        )}
      </div>
    </div>
  );
}
