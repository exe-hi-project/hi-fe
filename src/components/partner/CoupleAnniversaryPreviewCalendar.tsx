import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import api from '../../lib/api';
import type { CoupleAnniversarySummary } from '../../types/shared';
import {
  type AnniversaryOccurrence,
  getDayAnniversaryOccurrences,
  anniversaryBackground,
  anniversaryEffectClass,
  normalizeAnniversarySummary,
  toLocalIsoDate,
} from '../../utils/coupleAnniversaryCalendar';
import { AnniversarySticker, AnniversarySymbol } from './AnniversaryVisuals';

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
  const [selectedOccurrence, setSelectedOccurrence] = useState<AnniversaryOccurrence | null>(null);

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
    <section className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${isMale ? 'border-blue-100' : 'border-pink-100'} ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-bold ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>Lịch kỷ niệm</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold capitalize text-slate-900">{shownMonths}</h4>
            {weeksOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeeksOffset(0)}
                className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition active:scale-95 ${
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
        <p className="hidden max-w-48 text-right text-xs font-medium leading-relaxed text-slate-400 sm:block">Ba tuần gần nhất của hai bạn</p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev - 3)}
          className={`absolute -left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg border bg-white shadow-sm transition hover:-translate-y-[55%] active:scale-95 ${
            isMale ? 'border-blue-100 text-blue-600' : 'border-pink-100 text-pink-600'
          }`}
          aria-label="Xem ba tuần trước"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <div className="grid grid-cols-7 gap-1.5 px-5 sm:gap-2 sm:px-6">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-[10px] font-bold text-slate-400">
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
            const dayOfWeek = date.getDay();
            const tooltipPosition = dayOfWeek === 0 || dayOfWeek === 6
              ? 'right-0'
              : dayOfWeek === 1 || dayOfWeek === 2
                ? 'left-0'
                : 'left-1/2 -translate-x-1/2';

            return (
              <button
                type="button"
                key={iso}
                onClick={() => {
                  if (!primary) return;
                  setSelectedOccurrence((current) => current?.key === primary.key ? null : primary);
                }}
                disabled={!decorated}
                className={[
                  'group relative isolate flex h-12 min-w-0 rounded-xl border p-1.5 text-left text-xs transition sm:h-16 sm:p-2',
                  decorated
                    ? `${anniversaryBackground(event.color, event.effect)} ${anniversaryEffectClass(event.effect)} cursor-pointer hover:-translate-y-0.5 hover:shadow-md`
                    : 'border-slate-100 bg-slate-50/70 text-slate-500',
                  isToday ? 'ring-2 ring-slate-700 ring-offset-1' : '',
                  selectedOccurrence && primary && selectedOccurrence.key === primary.key ? 'ring-2 ring-pink-400 ring-offset-1' : '',
                ].join(' ')}
                aria-label={decorated ? `Xem chi tiết ${event.title}` : undefined}
              >
                <span className="relative z-10 text-[10px] font-bold text-slate-500">{date.getDate()}</span>
                {decorated && (
                  <div className="absolute inset-x-1 bottom-1 flex min-w-0 items-center gap-1 sm:inset-x-2 sm:bottom-2">
                    <AnniversarySymbol name={event.icon} size={14} className="anniversary-icon shrink-0 text-current" />
                    <span
                      className="hidden min-w-0 truncate text-[10px] font-bold text-slate-700 sm:block"
                      title={event.title}
                    >
                      {event.title}
                    </span>
                  </div>
                )}
                {decorated && (
                  <span className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-30 hidden w-56 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl opacity-0 transition group-hover:opacity-100 sm:block ${tooltipPosition}`}>
                    <span className="flex items-start gap-2.5">
                      <AnniversarySticker name={event.sticker} size={28} className="shrink-0" />
                      <span className="min-w-0">
                        <strong className="block text-xs font-extrabold text-slate-900">{event.title}</strong>
                        <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                          {new Date(`${primary.displayDate}T00:00:00`).toLocaleDateString('vi-VN')}
                        </span>
                        {event.note && <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{event.note}</span>}
                      </span>
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setWeeksOffset((prev) => prev + 3)}
          className={`absolute -right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg border bg-white shadow-sm transition hover:-translate-y-[55%] active:scale-95 ${
            isMale ? 'border-blue-100 text-blue-600' : 'border-pink-100 text-pink-600'
          }`}
          aria-label="Xem ba tuần tiếp theo"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {selectedOccurrence && (
        <div className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${isMale ? 'border-blue-100 bg-blue-50/50' : 'border-pink-100 bg-pink-50/50'}`}>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
            <AnniversarySticker name={selectedOccurrence.event.sticker} size={30} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong className="text-sm font-extrabold text-slate-900">{selectedOccurrence.event.title}</strong>
              <span className="text-[11px] font-bold text-slate-400">
                {new Date(`${selectedOccurrence.displayDate}T00:00:00`).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {selectedOccurrence.event.note || (selectedOccurrence.isStartDate ? 'Cột mốc ngày hai bạn bắt đầu bên nhau.' : 'Ngày kỷ niệm đặc biệt của hai bạn.')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span className="size-2 rounded-full bg-pink-400" />
          Kỷ niệm yêu thương
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span className="size-2 rounded-full bg-violet-400" />
          Ngày đặc biệt
        </span>
      </div>
    </section>
  );
}

