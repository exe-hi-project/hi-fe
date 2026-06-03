import type { CycleInsights, CycleRecord } from '../../types/shared';
import { CYCLE_DAY_CLASSES, CYCLE_LEGEND, getCalendarAnchor, getCalendarRange, getCycleDayKind, toIsoDate } from '../../utils/cycleCalendar';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface CyclePreviewCalendarProps {
  cycles: CycleRecord[];
  insights?: CycleInsights | null;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

export default function CyclePreviewCalendar({ cycles, insights }: CyclePreviewCalendarProps) {
  const anchor = getCalendarAnchor(insights);
  const days = getCalendarRange(anchor, 3);
  const todayIso = toIsoDate(new Date());
  const shownMonths = Array.from(new Set(days.map((date) => monthLabel(date)))).join(' / ');

  return (
    <div className="rounded-[2rem] border border-rose-100/70 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Lịch chu kỳ</p>
          <h4 className="text-base font-extrabold text-slate-900">{shownMonths}</h4>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Dự đoán chỉ mang tính tham khảo</p>
      </div>

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
          return (
            <div
              key={iso}
              className={[
                'flex aspect-[1.25] min-h-9 items-center justify-center rounded-2xl text-sm font-extrabold transition-all',
                kind ? CYCLE_DAY_CLASSES[kind] : 'bg-slate-50/80 text-slate-500',
                isToday ? 'outline outline-2 outline-slate-800 outline-offset-2' : '',
              ].join(' ')}
              title={date.toLocaleDateString('vi-VN')}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {CYCLE_LEGEND.map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className={`size-2.5 rounded-full ${item.dotClassName}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
