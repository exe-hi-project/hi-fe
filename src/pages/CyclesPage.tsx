import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';
import { Cycle, Symptom } from '../types';

const PHASES = [
  { label: 'Kinh nguyệt', bg: '#fb7185', light: '#fff1f2' },
  { label: 'Nang trứng', bg: '#fbbf24', light: '#fffbeb' },
  { label: 'Rụng trứng', bg: '#34d399', light: '#ecfdf5' },
  { label: 'Hoàng thể', bg: '#a78bfa', light: '#f5f3ff' },
];

function getPhaseColor(day: number, periodLen: number) {
  if (day <= periodLen) return { bg: 'rgba(251,113,133,0.25)', text: '#be123c', label: 'Kinh nguyệt' };
  if (day <= 12) return { bg: 'rgba(251,191,36,0.25)', text: '#92400e', label: 'Nang trứng' };
  if (day <= 16) return { bg: 'rgba(52,211,153,0.25)', text: '#065f46', label: 'Rụng trứng' };
  return { bg: 'rgba(167,139,250,0.25)', text: '#5b21b6', label: 'Hoàng thể' };
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function nextPeriod(startDate: string, cycleLen: number) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + cycleLen);
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

function getCycleDay(cycle: Cycle) {
  const today = new Date();
  const start = new Date(cycle.startDate);
  return Math.min(Math.max(Math.floor((today.getTime() - start.getTime()) / 86400000) + 1, 1), cycle.cycleLength || 28);
}

export default function CyclesPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'history' | 'stats'>('history');

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycles').then((r) => r.data.cycles),
  });

  const { data: symptoms = [] } = useQuery<Symptom[]>({
    queryKey: ['symptoms'],
    queryFn: () => api.get('/symptoms').then((r) => r.data.symptoms),
  });

  useEffect(() => {
    if (!selected && cycles.length > 0) setSelected(cycles[0]._id);
    if (selected && cycles.length > 0 && !cycles.some((cycle) => cycle._id === selected)) setSelected(cycles[0]._id);
  }, [cycles, selected]);

  const activeCycle = cycles.find((cycle) => cycle._id === selected) ?? cycles[0] ?? null;
  const avgLen = cycles.length ? Math.round(cycles.reduce((sum, cycle) => sum + (cycle.cycleLength || 28), 0) / cycles.length) : 0;
  const avgPeriod = cycles.length ? Math.round(cycles.reduce((sum, cycle) => sum + (cycle.periodLength || 5), 0) / cycles.length) : 0;
  const minLen = cycles.length ? Math.min(...cycles.map((cycle) => cycle.cycleLength || 28)) : 0;
  const maxLen = cycles.length ? Math.max(...cycles.map((cycle) => cycle.cycleLength || 28)) : 0;
  const regularity = avgLen ? Math.max(0, Math.round(100 - ((maxLen - minLen) / avgLen) * 100)) : 0;
  const activeDay = activeCycle ? getCycleDay(activeCycle) : 0;

  const symptomFrequency = (() => {
    const frequency: Record<string, number> = {};
    symptoms.forEach((symptom) => {
      frequency[symptom.name] = (frequency[symptom.name] || 0) + 1;
    });
    return Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  })();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8f6f7] font-sans overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[480px] h-[480px] rounded-full bg-pink-200/30 blur-3xl -top-24 -left-24" />
        <div className="absolute w-[380px] h-[380px] rounded-full bg-violet-200/25 blur-3xl bottom-0 right-0" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to="/female-dashboard" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-pink-50 transition-colors border border-white">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_back</span>
                </Link>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Lịch sử chu kỳ</h1>
              </div>
              <p className="text-sm text-slate-400 ml-10">Theo dõi {cycles.length} chu kỳ đã ghi nhận</p>
            </div>
            <Link
              to="/female-dashboard"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ghi chu kỳ mới
            </Link>
          </div>

          {cyclesLoading ? (
            <div className="bg-white/90 rounded-3xl py-16 shadow-sm">
              <Spinner />
            </div>
          ) : cycles.length === 0 ? (
            <div className="bg-white/90 rounded-3xl p-8 md:p-12 shadow-sm border border-white/80 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
                <span className="material-symbols-outlined text-pink-400 text-[32px]">calendar_month</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Chưa có dữ liệu chu kỳ</h2>
              <p className="text-sm text-slate-500 mb-6">Hãy ghi chu kỳ đầu tiên để xem lịch sử và phân tích cá nhân hóa.</p>
              <Link to="/female-dashboard" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                <span className="material-symbols-outlined text-[18px]">add</span>
                Ghi chu kỳ
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
                {[
                  { icon: 'calendar_month', label: 'Độ dài TB', value: `${avgLen} ngày`, from: '#f9a8d4', to: '#f472b6', iconColor: '#f472b6' },
                  { icon: 'water_drop', label: 'Kinh nguyệt TB', value: `${avgPeriod} ngày`, from: '#fca5a5', to: '#f87171', iconColor: '#ef4444' },
                  { icon: 'bar_chart', label: 'Tính đều đặn', value: `${regularity}%`, from: '#6ee7b7', to: '#34d399', iconColor: '#059669' },
                  { icon: 'history', label: 'Chu kỳ đã ghi', value: `${cycles.length} chu kỳ`, from: '#c4b5fd', to: '#a78bfa', iconColor: '#7c3aed' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/80 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg,${stat.from}55,${stat.to}33)` }}>
                      <span className="material-symbols-outlined text-[22px]" style={{ color: stat.iconColor }}>{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-5 bg-white/60 rounded-2xl p-1 backdrop-blur-sm border border-white w-fit shadow-sm">
                {(['history', 'stats'] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setTab(item)}
                    className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                    style={tab === item ? {
                      background: 'linear-gradient(135deg,#f472b6,#a78bfa)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.35)',
                    } : { color: '#94a3b8' }}
                  >
                    {item === 'history' ? 'Lịch sử' : 'Phân tích'}
                  </button>
                ))}
              </div>

              {tab === 'history' ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    {cycles.map((cycle, index) => {
                      const isActive = cycle._id === activeCycle?._id;
                      const isLatest = index === 0;
                      return (
                        <button
                          key={cycle._id}
                          onClick={() => setSelected(cycle._id)}
                          className="w-full text-left rounded-2xl p-4 border transition-all duration-200"
                          style={{
                            background: isActive ? 'linear-gradient(135deg,#fff0f8,#f5f0ff)' : 'rgba(255,255,255,0.85)',
                            borderColor: isActive ? '#f9a8d4' : 'rgba(255,255,255,0.9)',
                            boxShadow: isActive ? '0 6px 20px rgba(244,114,182,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0" style={{ background: isActive ? 'linear-gradient(135deg,#f472b6,#a78bfa)' : '#f1f5f9', color: isActive ? 'white' : '#94a3b8' }}>
                                {cycles.length - index}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{fmtShort(cycle.startDate)}</p>
                                <p className="text-[10px] text-slate-400">{cycle.cycleLength || 28} ngày</p>
                              </div>
                            </div>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wide" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
                                Hiện tại
                              </span>
                            )}
                          </div>

                          <div className="flex gap-0.5 rounded-lg overflow-hidden h-2">
                            <div className="rounded-sm" style={{ width: `${((cycle.periodLength || 5) / (cycle.cycleLength || 28)) * 100}%`, background: '#fb7185' }} />
                            <div className="rounded-sm" style={{ width: `${Math.max(((12 - (cycle.periodLength || 5)) / (cycle.cycleLength || 28)) * 100, 0)}%`, background: '#fbbf24' }} />
                            <div className="rounded-sm" style={{ width: `${(4 / (cycle.cycleLength || 28)) * 100}%`, background: '#34d399' }} />
                            <div className="flex-1 rounded-sm" style={{ background: '#a78bfa' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeCycle && (
                    <div className="md:col-span-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden sticky top-4">
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
                          <div>
                            <p className="text-[10px] font-extrabold text-pink-400 uppercase tracking-widest mb-0.5">
                              Chu kỳ #{cycles.length - cycles.findIndex((cycle) => cycle._id === activeCycle._id)}
                              {activeCycle._id === cycles[0]?._id ? ' · Đang diễn ra' : ''}
                            </p>
                            <h2 className="text-xl font-extrabold text-slate-900">{fmt(activeCycle.startDate)}</h2>
                          </div>
                          <span className="material-symbols-outlined text-pink-400 text-[36px]">water_drop</span>
                        </div>

                        {activeCycle._id === cycles[0]?._id && (
                          <div className="px-6 py-4 border-b border-pink-50">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold text-slate-500">Ngày {activeDay} / {activeCycle.cycleLength || 28}</p>
                              <p className="text-xs font-bold" style={{ color: getPhaseColor(activeDay, activeCycle.periodLength || 5).text }}>
                                {getPhaseColor(activeDay, activeCycle.periodLength || 5).label}
                              </p>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(activeDay / (activeCycle.cycleLength || 28)) * 100}%`, background: 'linear-gradient(90deg,#fb7185,#f472b6,#a78bfa)' }} />
                            </div>
                          </div>
                        )}

                        <div className="px-6 py-5 border-b border-gray-50">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Các giai đoạn</p>
                          <div className="space-y-2.5">
                            {PHASES.map((phase, index) => {
                              const cycleLen = activeCycle.cycleLength || 28;
                              const periodLen = activeCycle.periodLength || 5;
                              const ranges = [
                                { days: `Ngày 1 - ${periodLen}`, pct: (periodLen / cycleLen) * 100 },
                                { days: `Ngày ${periodLen + 1} - 12`, pct: Math.max(((12 - periodLen) / cycleLen) * 100, 0) },
                                { days: 'Ngày 13 - 16', pct: (4 / cycleLen) * 100 },
                                { days: `Ngày 17 - ${cycleLen}`, pct: Math.max(((cycleLen - 16) / cycleLen) * 100, 0) },
                              ];
                              return (
                                <div key={phase.label} className="flex items-center gap-3">
                                  <div className="w-24 flex-shrink-0">
                                    <p className="text-xs font-bold text-slate-700">{phase.label}</p>
                                    <p className="text-[10px] text-slate-400">{ranges[index].days}</p>
                                  </div>
                                  <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: phase.light }}>
                                    <div className="h-full rounded-full" style={{ width: `${ranges[index].pct}%`, background: phase.bg }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{Math.round(ranges[index].pct)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="px-6 py-5 grid grid-cols-2 gap-3 border-b border-gray-50">
                          <div className="p-3.5 rounded-2xl" style={{ background: '#fff5f9' }}>
                            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wide mb-0.5">Độ dài chu kỳ</p>
                            <p className="text-2xl font-extrabold text-slate-900">{activeCycle.cycleLength || 28} <span className="text-sm font-bold text-slate-400">ngày</span></p>
                          </div>
                          <div className="p-3.5 rounded-2xl" style={{ background: '#fff5f5' }}>
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide mb-0.5">Kinh nguyệt</p>
                            <p className="text-2xl font-extrabold text-slate-900">{activeCycle.periodLength || 5} <span className="text-sm font-bold text-slate-400">ngày</span></p>
                          </div>
                          <div className="p-3.5 rounded-2xl" style={{ background: '#f0fdf4' }}>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-0.5">Kỳ kinh tiếp</p>
                            <p className="text-sm font-extrabold text-slate-800">{nextPeriod(activeCycle.startDate, activeCycle.cycleLength || 28)}</p>
                          </div>
                          <div className="p-3.5 rounded-2xl" style={{ background: '#fdf4ff' }}>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-0.5">Ghi chú</p>
                            <p className="text-sm font-extrabold text-slate-800 truncate">{activeCycle.notes || 'Không có'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                    <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-pink-400 text-[22px]">bar_chart</span>
                      Độ dài chu kỳ theo tháng
                    </h3>
                    <div className="flex items-end gap-3 h-40 px-2">
                      {[...cycles].reverse().map((cycle) => {
                        const cycleLen = cycle.cycleLength || 28;
                        const pct = Math.max(((cycleLen - 20) / 20) * 100, 10);
                        const label = new Date(cycle.startDate).toLocaleDateString('vi-VN', { month: 'short' });
                        return (
                          <div key={cycle._id} className="flex flex-col items-center gap-2 flex-1">
                            <span className="text-[9px] font-bold text-slate-500">{cycleLen}</span>
                            <div className="w-full rounded-t-xl relative overflow-hidden" style={{ height: `${pct}%`, minHeight: 20, maxHeight: '100%', background: 'linear-gradient(180deg,#f472b6,#a78bfa)' }} />
                            <span className="text-[10px] font-bold text-slate-400">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Ngắn nhất: <b className="text-slate-800">{minLen} ngày</b></span>
                      <span>Dài nhất: <b className="text-slate-800">{maxLen} ngày</b></span>
                    </div>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                    <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-400 text-[22px]">monitor_heart</span>
                      Triệu chứng đã ghi nhận
                    </h3>
                    {symptomFrequency.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">Chưa có dữ liệu triệu chứng.</p>
                    ) : (
                      <div className="space-y-3">
                        {symptomFrequency.map(([symptom, count]) => {
                          const pct = Math.round((count / symptoms.length) * 100);
                          return (
                            <div key={symptom} className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-700 w-32 flex-shrink-0">{symptom}</span>
                              <div className="flex-1 h-2.5 rounded-full bg-rose-50 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#fb7185,#f472b6)' }} />
                              </div>
                              <span className="text-xs font-extrabold text-slate-400 w-14 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="bg-white/60 border-t border-white/40 py-5 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1200px] mx-auto flex justify-between items-center text-xs text-slate-400">
            <p>Hi App</p>
            <Link to="/female-dashboard" className="hover:text-pink-500 transition-colors font-medium">Về Dashboard</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
