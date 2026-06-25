import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';
import type { CycleInsights, CycleRecord, CoupleAnniversarySummary, CoupleAnniversaryEvent } from '../types/shared';
import { CYCLE_DAY_CLASSES, CYCLE_LEGEND, getCycleDayKind, toIsoDate } from '../utils/cycleCalendar';
import { getDayAnniversaryOccurrences, anniversaryBackground, anniversaryEffectClass } from '../utils/coupleAnniversaryCalendar';
import AnniversaryEventModal from '../components/partner/AnniversaryEventModal';
import { useAuthStore } from '../store/authStore';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export default function CalendarPage() {
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const queryFrom = toIsoDate(new Date(year, month - 1, 1));
  const queryTo = toIsoDate(new Date(year, month + 2, 0));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAnniversary, setSelectedAnniversary] = useState<CoupleAnniversaryEvent | null>(null);

  const { data: cycles = [] } = useQuery<CycleRecord[]>({
    queryKey: ['cycles', queryFrom, queryTo],
    queryFn: () => api.get('/cycle-records', { params: { from: queryFrom, to: queryTo } }).then(({ data }) => data.cycleRecords ?? []),
  });
  const { data: insights } = useQuery<CycleInsights>({
    queryKey: ['cycle-insights'],
    queryFn: () => api.get('/cycle-records/insights').then(({ data }) => data.insights),
  });
  const { data: anniversaries } = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => data.anniversaries),
    enabled: !!user?.partnerId,
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const avgCycle = Math.round(insights?.averageCycleLength ?? 28);
  const periodDays = Math.round(insights?.averagePeriodLength ?? 5);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((value) => value - 1);
    } else {
      setMonth((value) => value - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((value) => value + 1);
    } else {
      setMonth((value) => value + 1);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className="material-symbols-outlined text-pink-400 text-[20px]">calendar_month</span>
              <span>Theo dõi chu kỳ</span>
            </div>
            <h1 className="hi-page-title text-3xl">Lịch sức khỏe của bạn</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Xem nhanh ngày kinh nguyệt, kỳ dự đoán, rụng trứng và cửa sổ thụ thai trong cùng một lịch.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm">
            {[
              { label: 'Chu kỳ TB', value: `${avgCycle} ngày` },
              { label: 'Đã ghi', value: `${cycles.length}` },
              { label: 'Ngày kinh', value: `${periodDays}` },
            ].map((item) => (
              <div key={item.label} className="min-w-20 rounded-xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden border-white/80 bg-white/90 p-0 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-pink-50 bg-gradient-to-r from-pink-50 via-white to-sky-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition-colors hover:bg-pink-50 hover:text-pink-500"
                aria-label="Tháng trước"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {MONTHS[month]} {year}
                </h2>
                <p className="text-xs font-medium text-slate-400">Hôm nay: {today.toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
            <button
              onClick={nextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition-colors hover:bg-pink-50 hover:text-pink-500 sm:ml-auto"
              aria-label="Tháng sau"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-3 grid grid-cols-7 gap-1.5">
              {DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const date = new Date(year, month, day);
                const isToday = date.toDateString() === today.toDateString();
                const type = getCycleDayKind(date, cycles, insights);
                const iso = toIsoDate(date);
                const occurrences = getDayAnniversaryOccurrences(anniversaries, iso, year, month);
                const primary = occurrences[0];
                const event = primary?.event;
                const decorated = Boolean(primary && event);

                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(iso);
                      setSelectedAnniversary(event || null);
                      setModalOpen(true);
                    }}
                    className={`relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all sm:min-h-14 cursor-pointer outline-none ${
                      type ? CYCLE_DAY_CLASSES[type] : 'text-slate-600 hover:bg-slate-50'
                    } ${isToday ? 'ring-2 ring-slate-800 ring-offset-2' : ''} ${
                      decorated && !type ? `${anniversaryBackground(event.color, event.effect)} ${anniversaryEffectClass(event.effect)}` : ''
                    }`}
                    title={decorated ? `${date.toLocaleDateString('vi-VN')} - ${event.title}` : date.toLocaleDateString('vi-VN')}
                  >
                    <span>{day}</span>
                    {decorated && (
                      <span className="anniversary-icon absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-white/90 shadow-sm border border-slate-100 ring-1 ring-black/5">
                        <span className="material-symbols-outlined text-[12px] font-bold text-slate-700">{event.icon}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-800">
              <span className="material-symbols-outlined text-pink-400 text-[20px]">palette</span>
              Chú giải
            </h3>
            <div className="space-y-3">
              {CYCLE_LEGEND.map((item) => (
                <div key={item.kind} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                  <span className={`h-3.5 w-3.5 rounded-full ${item.dotClassName}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">
                      {item.kind === 'recorded'
                        ? 'Ngày đã ghi nhận'
                        : item.kind === 'predicted'
                          ? 'Kỳ tiếp theo ước tính'
                          : item.kind === 'ovulation'
                            ? 'Ngày rụng trứng ước tính'
                            : item.kind === 'fertile'
                              ? 'Cửa sổ thụ thai ước tính'
                              : 'Kỳ đã trễ chưa ghi nhận'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border-pink-100 bg-gradient-to-br from-pink-50 to-violet-50 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm">
              <span className="material-symbols-outlined">tips_and_updates</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Mẹo nhỏ hôm nay</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Ghi chu kỳ đều đặn giúp Hi dự đoán chính xác hơn và cá nhân hóa lời khuyên theo từng giai đoạn.
            </p>
            <Button className="mt-5 w-full" onClick={() => window.location.assign('/cycles')}>
              Xem lịch sử chu kỳ
            </Button>
          </Card>
          <p className="px-1 text-xs leading-relaxed text-slate-400">
            Các ngày dự kiến chỉ là ước tính, không thay thế biện pháp tránh thai hoặc tư vấn y khoa.
          </p>
        </aside>
    </div>
    <AnniversaryEventModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      date={selectedDate}
      existingEvent={selectedAnniversary}
      variant={user?.gender === 'male' ? 'male' : 'female'}
    />
  </div>
  );
}
