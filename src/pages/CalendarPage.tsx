import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import api from '../lib/api';
import { Cycle } from '../types';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

function getDayType(date: Date, cycles: Cycle[]): 'period' | 'predicted' | 'ovulation' | null {
  for (const cycle of cycles) {
    const start = new Date(cycle.startDate);
    const periodLen = cycle.periodLength || 5;
    const cycleLen = cycle.cycleLength || 28;
    // actual period
    const end = new Date(start);
    end.setDate(start.getDate() + periodLen - 1);
    if (date >= start && date <= end) return 'period';
    // predicted next period
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + cycleLen);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + periodLen - 1);
    if (date >= nextStart && date <= nextEnd) return 'predicted';
    // ovulation (~day 14)
    const ovul = new Date(start);
    ovul.setDate(start.getDate() + 13);
    const ovulEnd = new Date(ovul);
    ovulEnd.setDate(ovul.getDate() + 2);
    if (date >= ovul && date <= ovulEnd) return 'ovulation';
  }
  return null;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycles').then((r) => r.data.cycles),
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const dayColorMap: Record<string, string> = {
    period: 'bg-rose-400 text-white',
    predicted: 'bg-purple-200 text-purple-800',
    ovulation: 'bg-emerald-200 text-emerald-800',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Lịch chu kỳ 📅</h1>
        <p className="text-gray-500 text-sm mt-0.5">Theo dõi chu kỳ của bạn</p>
      </div>

      <Card>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { color: 'bg-rose-400', label: 'Kinh nguyệt' },
            { color: 'bg-purple-200', label: 'Dự đoán' },
            { color: 'bg-emerald-200', label: 'Rụng trứng' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-base font-bold text-gray-800">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const type = getDayType(date, cycles);
            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all
                  ${type ? dayColorMap[type] : 'text-gray-700 hover:bg-gray-100'}
                  ${isToday && !type ? 'ring-2 ring-rose-400 ring-offset-1 font-bold text-rose-500' : ''}
                `}
              >
                {day}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
