import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { CycleInsights, CycleRecord, CoupleAnniversarySummary, CoupleAnniversaryColor, DailyLog } from '../../types/shared';
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
} from '../../utils/coupleAnniversaryCalendar';
import { AnniversarySticker } from '../partner/AnniversaryVisuals';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CYCLE_KIND_LABELS: Record<string, string> = {
  recorded: 'Kỳ kinh đã ghi nhận',
  predicted: 'Kỳ kinh dự đoán',
  fertile: 'Cửa sổ thụ thai',
  ovulation: 'Ngày rụng trứng',
  delayed: 'Chu kỳ đang trễ',
};

const FLOW_LABELS: Record<string, string> = {
  NONE: 'Không ghi nhận lượng kinh',
  LIGHT: 'Lượng kinh ít',
  MEDIUM: 'Lượng kinh vừa',
  HEAVY: 'Lượng kinh nhiều',
};

const SEVERITY_LABELS: Record<string, string> = {
  MILD: 'Nhẹ',
  MODERATE: 'Vừa',
  SEVERE: 'Nặng',
};

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const anniversariesQuery = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => data.anniversaries),
    enabled: hasPartner,
  });
  const anniversaries = anniversariesQuery.data;

  const baseAnchor = getCalendarAnchor(insights, cycles);
  const anchor = new Date(baseAnchor.getFullYear(), baseAnchor.getMonth(), baseAnchor.getDate() + weeksOffset * 7);
  const days = getCalendarRange(anchor, 3);
  const rangeFrom = toIsoDate(days[0]);
  const rangeTo = toIsoDate(days[days.length - 1]);
  const todayIso = toIsoDate(new Date());

  const dailyLogsQuery = useQuery<DailyLog[]>({
    queryKey: ['daily-logs', rangeFrom, rangeTo],
    queryFn: () => api.get('/daily-logs', { params: { from: rangeFrom, to: rangeTo } })
      .then(({ data }) => data.dailyLogs ?? []),
    enabled: user?.gender === 'female',
  });
  const dailyLogsByDate = useMemo(
    () => new Map((dailyLogsQuery.data ?? []).map((log) => [log.logDate.slice(0, 10), log])),
    [dailyLogsQuery.data],
  );
  const monthCounts = days.reduce((acc, date) => {
    const label = monthLabel(date);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const shownMonths = Object.keys(monthCounts).reduce((a, b) =>
    monthCounts[a] >= monthCounts[b] ? a : b
  );
  const selectedDay = selectedDate ? days.find((day) => toIsoDate(day) === selectedDate) : undefined;
  const selectedLog = selectedDate ? dailyLogsByDate.get(selectedDate) : undefined;
  const selectedKind = selectedDay ? getCycleDayKind(selectedDay, cycles, insights) : null;
  const selectedAnniversaries = selectedDay
    ? getDayAnniversaryOccurrences(anniversaries, selectedDate!, selectedDay.getFullYear(), selectedDay.getMonth())
    : [];

  const moveWeeks = (amount: number) => {
    setWeeksOffset((current) => current + amount);
    setSelectedDate(null);
  };

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
                onClick={() => {
                  setWeeksOffset(0);
                  setSelectedDate(null);
                }}
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
          onClick={() => moveWeeks(-3)}
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
            const dailyLog = dailyLogsByDate.get(iso);
            const symptomNames = dailyLog?.symptoms
              ?.map((symptom) => symptom.symptomName)
              .filter((name): name is string => Boolean(name)) ?? [];
            const hasDetails = Boolean(kind || dailyLog || occurrences.length > 0);
            const dayOfWeek = date.getDay();
            const tooltipPosition = dayOfWeek === 0 || dayOfWeek === 6
              ? 'right-0'
              : dayOfWeek === 1 || dayOfWeek === 2
                ? 'left-0'
                : 'left-1/2 -translate-x-1/2';

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
                cellClass = kind === 'predicted' ? CYCLE_DAY_CLASSES[kind] : `${CYCLE_DAY_CLASSES[kind]} border-transparent`;
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
              <button
                type="button"
                key={iso}
                onClick={() => setSelectedDate((current) => current === iso ? null : iso)}
                aria-pressed={selectedDate === iso}
                aria-label={`Xem chi tiết ngày ${date.toLocaleDateString('vi-VN')}`}
                className={[
                  'group relative flex aspect-square min-h-[32px] items-center justify-center rounded-xl border text-xs font-extrabold transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:aspect-[1.25] sm:min-h-9 sm:rounded-2xl sm:text-sm',
                  cellClass,
                  borderClass,
                  isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
                  selectedDate === iso ? 'ring-2 ring-pink-400 ring-offset-2' : '',
                ].join(' ')}
              >
                {date.getDate()}
                {decorated && (
                  <span className="anniversary-icon absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-slate-100 bg-white shadow-sm sm:size-6">
                    <AnniversarySticker name={event.sticker} size={16} />
                  </span>
                )}
                {hasDetails && (
                  <span className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-40 hidden w-60 rounded-xl border border-slate-200 bg-white p-3 text-left font-normal text-slate-600 shadow-xl opacity-0 transition group-hover:opacity-100 sm:block ${tooltipPosition}`}>
                    <strong className="block text-xs font-extrabold text-slate-900">
                      {date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </strong>
                    {kind && <span className="mt-1 block text-[11px] font-bold text-pink-600">{CYCLE_KIND_LABELS[kind] ?? 'Theo dõi chu kỳ'}</span>}
                    {dailyLog && (
                      <span className="mt-2 block">
                        <span className="block text-[11px] font-bold text-slate-700">{FLOW_LABELS[dailyLog.flowIntensity] ?? 'Nhật ký sức khỏe'}</span>
                        {symptomNames.length > 0 && (
                          <span className="mt-1 block text-[11px] leading-relaxed">{symptomNames.slice(0, 4).join(', ')}{symptomNames.length > 4 ? ` và ${symptomNames.length - 4} triệu chứng khác` : ''}</span>
                        )}
                      </span>
                    )}
                    {occurrences.map((occurrence) => (
                      <span key={occurrence.key} className="mt-2 flex items-start gap-2 border-t border-slate-100 pt-2">
                        <AnniversarySticker name={occurrence.event.sticker} size={20} className="shrink-0" />
                        <span>
                          <strong className="block text-[11px] text-slate-800">{occurrence.event.title}</strong>
                          {occurrence.event.note && <span className="mt-0.5 block text-[10px] leading-relaxed">{occurrence.event.note}</span>}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút lướt tới (tương lai) */}
        <button
          type="button"
          onClick={() => moveWeeks(3)}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-rose-500 hover:text-rose-600 active:scale-90 transition-all select-none z-10 cursor-pointer"
          aria-label="Next weeks"
        >
          <span className="material-symbols-outlined font-black text-3xl">chevron_right</span>
        </button>
      </div>

      {selectedDay && selectedDate && (
        <section className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold capitalize text-slate-900">
                {selectedDay.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {selectedKind ? CYCLE_KIND_LABELS[selectedKind] ?? 'Theo dõi chu kỳ' : 'Ngoài các mốc dự đoán chu kỳ'}
              </p>
            </div>
            {selectedLog?.flowIntensity && selectedLog.flowIntensity !== 'NONE' && (
              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-rose-600 shadow-sm">
                {FLOW_LABELS[selectedLog.flowIntensity]}
              </span>
            )}
          </div>

          {selectedLog ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white bg-white/80 p-3">
                <p className="text-[11px] font-extrabold uppercase text-slate-400">Triệu chứng đã ghi</p>
                {selectedLog.symptoms?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedLog.symptoms.map((symptom) => (
                      <span key={symptom._id} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                        {symptom.symptomName || `Triệu chứng #${symptom.symptomId}`}
                        <span className="ml-1 font-semibold text-rose-400">{SEVERITY_LABELS[symptom.severity] ?? symptom.severity}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-slate-500">Không ghi nhận triệu chứng.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                  {selectedLog.hasClots && <span>Có cục máu đông</span>}
                  {selectedLog.moodScore && <span>Tâm trạng: {selectedLog.moodScore}/5</span>}
                </div>
                {selectedLog.notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{selectedLog.notes}</p>}
              </div>

              <div className="rounded-xl border border-white bg-white/80 p-3">
                <p className="text-[11px] font-extrabold uppercase text-slate-400">Kỷ niệm trong ngày</p>
                {selectedAnniversaries.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedAnniversaries.map((occurrence) => (
                      <div key={occurrence.key} className="flex items-start gap-2.5">
                        <AnniversarySticker name={occurrence.event.sticker} size={24} className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800">{occurrence.event.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {occurrence.event.note || (occurrence.isStartDate ? 'Cột mốc ngày hai bạn bắt đầu bên nhau.' : 'Ngày đặc biệt của hai bạn.')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-slate-500">Không có kỷ niệm trong ngày này.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-white bg-white/80 p-3">
              <p className="text-xs font-medium text-slate-500">
                {user?.gender === 'female' ? 'Chưa có nhật ký sức khỏe cho ngày này.' : 'Chi tiết triệu chứng chỉ hiển thị cho chủ nhân nhật ký.'}
              </p>
              {selectedAnniversaries.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {selectedAnniversaries.map((occurrence) => (
                    <div key={occurrence.key} className="flex items-start gap-2.5">
                      <AnniversarySticker name={occurrence.event.sticker} size={24} className="shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{occurrence.event.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {occurrence.event.note || 'Ngày đặc biệt của hai bạn.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
