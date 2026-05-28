import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { Cycle } from '../types';

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

function getDayType(date: Date, cycles: Cycle[]): 'period' | 'predicted' | 'ovulation' | null {
  for (const cycle of cycles) {
    const start = new Date(cycle.startDate);
    const periodLen = cycle.periodLength || 5;
    const cycleLen = cycle.cycleLength || 28;

    const end = new Date(start);
    end.setDate(start.getDate() + periodLen - 1);
    if (date >= start && date <= end) return 'period';

    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + cycleLen);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + periodLen - 1);
    if (date >= nextStart && date <= nextEnd) return 'predicted';

    const ovulationStart = new Date(start);
    ovulationStart.setDate(start.getDate() + 13);
    const ovulationEnd = new Date(ovulationStart);
    ovulationEnd.setDate(ovulationStart.getDate() + 2);
    if (date >= ovulationStart && date <= ovulationEnd) return 'ovulation';
  }
  return null;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/cycle-records');
        return (data.cycleRecords ?? []) as Cycle[];
      } catch {
        const { data } = await api.get('/cycles');
        return data.cycles as Cycle[];
      }
    },
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const avgCycle = cycles.length
    ? Math.round(cycles.reduce((total, cycle) => total + (cycle.cycleLength || 28), 0) / cycles.length)
    : 28;
  const periodDays = cycles.reduce((total, cycle) => total + (cycle.periodLength || 5), 0);

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

  const dayColorMap: Record<string, string> = {
    period: 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-sm shadow-rose-200',
    predicted: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
    ovulation: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
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
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Lịch sức khỏe của bạn</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Xem nhanh ngày kinh nguyệt, dự đoán chu kỳ tiếp theo và khung rụng trứng trong cùng một lịch.
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
                const type = getDayType(date, cycles);

                return (
                  <div
                    key={day}
                    className={`flex aspect-square min-h-10 items-center justify-center rounded-2xl text-sm font-bold transition-all sm:min-h-14 ${
                      type ? dayColorMap[type] : 'text-slate-600 hover:bg-slate-50'
                    } ${isToday && !type ? 'bg-white text-rose-500 ring-2 ring-rose-400 ring-offset-2' : ''}`}
                  >
                    {day}
                  </div>
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
              {[
                { color: 'bg-rose-400', label: 'Kinh nguyệt', desc: 'Ngày đã ghi nhận' },
                { color: 'bg-purple-200', label: 'Dự đoán', desc: 'Kỳ tiếp theo' },
                { color: 'bg-emerald-200', label: 'Rụng trứng', desc: 'Khung dễ thụ thai' },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                  <span className={`h-3.5 w-3.5 rounded-full ${color}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
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
              Ghi chu kỳ đều đặn giúp AI dự đoán chính xác hơn và cá nhân hóa lời khuyên theo từng giai đoạn.
            </p>
            <Button className="mt-5 w-full" onClick={() => window.location.assign('/cycles')}>
              Xem lịch sử chu kỳ
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
