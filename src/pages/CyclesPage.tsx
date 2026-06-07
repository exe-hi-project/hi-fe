import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import PageBackdrop from '../components/layout/PageBackdrop';
import SiteFooter from '../components/layout/SiteFooter';
import DailyLogModal from '../components/health/DailyLogModal';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';
import type { CycleInsights, CycleRecord, DailyLog } from '../types/shared';

const PHASES = [
  { label: 'Kinh nguyệt', bg: '#fecdd3', light: '#fff1f2' },
  { label: 'Nang trứng', bg: '#e0f2fe', light: '#f0f9ff' },
  { label: 'Rụng trứng', bg: '#bae6fd', light: '#f0f9ff' },
  { label: 'Hoàng thể', bg: '#e2e8f0', light: '#f8fafc' },
];

function getPhaseColor(day: number, periodLen: number, cycleLen: number) {
  const ovulationDay = Math.max(periodLen + 1, cycleLen - 14);
  if (day <= periodLen) return { bg: 'rgba(254,205,211,0.8)', text: '#be123c', label: 'Kinh nguyệt' };
  if (day < ovulationDay - 1) return { bg: 'rgba(224,242,254,0.9)', text: '#0369a1', label: 'Nang trứng' };
  if (day <= ovulationDay + 1) return { bg: 'rgba(186,230,253,0.9)', text: '#0369a1', label: 'Rụng trứng' };
  return { bg: 'rgba(226,232,240,0.9)', text: '#475569', label: 'Hoàng thể' };
}

function fmt(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShort(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function nextPeriod(startDate: string, cycleLen: number) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + cycleLen);
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addIsoDays(value: string, amount: number) {
  const base = new Date(`${value.slice(0, 10)}T00:00:00`);
  return toIsoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + amount));
}

function buildPeriodDates(cycle: CycleRecord | null) {
  if (!cycle) return [];
  const periodLength = Math.max(1, Math.min(cycle.periodLength || 5, 30));
  return Array.from({ length: periodLength }, (_, index) => addIsoDays(cycle.startDate, index));
}

export default function CyclesPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'history' | 'stats'>('history');
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalDate, setLogModalDate] = useState<string | null>(null);

  const historyQuery = useInfiniteQuery({
    queryKey: ['cycle-history'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.get('/cycle-records/history', { params: { page: pageParam, limit: 20 } }).then(({ data }) => data as {
      cycleRecords: CycleRecord[];
      total: number;
      page: number;
      hasMore: boolean;
    }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
  const cycles = historyQuery.data?.pages.flatMap((page) => page.cycleRecords) ?? [];
  const cyclesTotal = historyQuery.data?.pages[0]?.total ?? cycles.length;
  const cyclesLoading = historyQuery.isLoading;

  const { data: insights } = useQuery<CycleInsights | null>({
    queryKey: ['cycle-insights'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/cycle-records/insights');
        return (data.insights ?? null) as CycleInsights | null;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (!selected && cycles.length > 0) setSelected(cycles[0]._id);
    if (selected && cycles.length > 0 && !cycles.some((cycle) => cycle._id === selected)) setSelected(cycles[0]._id);
  }, [cycles, selected]);

  const activeCycle = cycles.find((cycle) => cycle._id === selected) ?? cycles[0] ?? null;
  const avgLen = Math.round(insights?.averageCycleLength ?? 0);
  const avgPeriod = Math.round(insights?.averagePeriodLength ?? 0);
  const minLen = cycles.length ? Math.min(...cycles.map((cycle) => cycle.cycleLength || 28)) : 0;
  const maxLen = cycles.length ? Math.max(...cycles.map((cycle) => cycle.cycleLength || 28)) : 0;
  const regularity = insights?.regularityScore ?? (avgLen ? Math.max(0, Math.round(100 - ((maxLen - minLen) / avgLen) * 100)) : 0);
  const activeDay = activeCycle?._id === cycles[0]?._id && ['CONFIRMED', 'UPCOMING'].includes(insights?.periodStatus ?? '')
    ? insights?.estimatedCycleDay ?? 0
    : 0;
  const phaseImpacts = insights?.phaseSymptomImpacts ?? [];
  const topSymptomsByImpact = insights?.topSymptoms ?? [];
  const overallSymptomImpact = insights?.symptomImpactScore ?? 0;

  const symptomHistoryQuery = useQuery<{ dailyLogs: DailyLog[] }>({
    queryKey: ['cycle-symptom-history', activeCycle?._id],
    queryFn: () => api.get(`/cycle-records/${activeCycle?._id}/symptom-history`).then(({ data }) => ({
      dailyLogs: data.dailyLogs ?? [],
    })),
    enabled: !!activeCycle?._id,
  });
  const symptomLogsByDate = new Map((symptomHistoryQuery.data?.dailyLogs ?? []).map((log) => [log.logDate.slice(0, 10), log]));
  const activePeriodDates = buildPeriodDates(activeCycle);
  const openDailyLogForDate = (date: string) => {
    setLogModalDate(date);
    setLogModalOpen(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen font-sans overflow-x-hidden bg-[#fff8fb]">
      <PageBackdrop variant="female" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to="/female-dashboard" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-pink-50 transition-colors border border-white">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_back</span>
                </Link>
                <h1 className="hi-page-title text-2xl md:text-3xl">Lịch sử chu kỳ</h1>
              </div>
              <p className="text-sm text-slate-400 ml-10">Theo dõi {cyclesTotal} chu kỳ đã ghi nhận</p>
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
              <Link to="/female-dashboard" className="hi-btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold">
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
                  { icon: 'bar_chart', label: 'Tính đều đặn', value: `${regularity}%`, from: '#93c5fd', to: '#38bdf8', iconColor: '#0284c7' },
                  { icon: 'history', label: 'Chu kỳ đã ghi', value: `${cyclesTotal} chu kỳ`, from: '#c4b5fd', to: '#a78bfa', iconColor: '#7c3aed' },
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

              <div className="mb-6 rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <span className="material-symbols-outlined text-sky-500">info</span>
                      Hi tính chu kỳ thế nào?
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                      Hi chỉ dùng các kỳ kinh đã được bạn xác nhận trong lịch sử. Độ dài chu kỳ được tính từ khoảng cách giữa các ngày bắt đầu kỳ liên tiếp; nếu chưa đủ dữ liệu, hệ thống dùng mặc định cá nhân rồi fallback 28 ngày.
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-black text-sky-700">Dự đoán tham khảo</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-rose-50/70 p-3">
                    <p className="text-xs font-extrabold text-rose-600">Kỳ tiếp theo</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Ước tính từ kỳ gần nhất cộng độ dài chu kỳ trung bình.</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50/80 p-3">
                    <p className="text-xs font-extrabold text-sky-700">Rụng trứng & thụ thai</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Ngày rụng trứng ước tính khoảng 14 ngày trước kỳ tiếp theo; cửa sổ thụ thai là 5 ngày trước đến 1 ngày sau.</p>
                  </div>
                  <div className="rounded-2xl bg-violet-50/70 p-3">
                    <p className="text-xs font-extrabold text-violet-700">Triệu chứng</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Triệu chứng, lượng kinh và cảm xúc chỉ tạo phân tích xu hướng theo phase, không tự xác nhận kỳ mới hay thay thế tư vấn y khoa.</p>
                  </div>
                </div>
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
                      const ovulationDay = Math.max((cycle.periodLength || 5) + 1, (cycle.cycleLength || 28) - 14);
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
                                {cyclesTotal - index}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{fmtShort(cycle.startDate)}</p>
                                <p className="text-[10px] text-slate-400">{cycle.cycleLength || 28} ngày</p>
                              </div>
                            </div>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wide" style={{ background: 'linear-gradient(135deg,#38bdf8,#0284c7)' }}>
                                Hiện tại
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-7 gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                              const isPeriodDay = dayIndex < Math.min(cycle.periodLength || 5, 7);
                              return (
                                <span
                                  key={dayIndex}
                                  className={`flex h-7 items-center justify-center rounded-lg text-[10px] font-extrabold ${isPeriodDay ? 'bg-rose-200 text-rose-800' : 'bg-slate-50 text-slate-400'}`}
                                >
                                  {dayIndex + 1}
                                </span>
                              );
                            })}
                          </div>

                          <div className="mt-3 flex gap-0.5 rounded-lg overflow-hidden h-2">
                            <div className="rounded-sm" style={{ width: `${((cycle.periodLength || 5) / (cycle.cycleLength || 28)) * 100}%`, background: '#fecdd3' }} />
                            <div className="rounded-sm" style={{ width: `${Math.max(((ovulationDay - 2 - (cycle.periodLength || 5)) / (cycle.cycleLength || 28)) * 100, 0)}%`, background: '#e0f2fe' }} />
                            <div className="rounded-sm" style={{ width: `${(3 / (cycle.cycleLength || 28)) * 100}%`, background: '#bae6fd' }} />
                            <div className="flex-1 rounded-sm" style={{ background: '#e2e8f0' }} />
                          </div>
                        </button>
                      );
                    })}
                    {historyQuery.hasNextPage && (
                      <button
                        type="button"
                        onClick={() => historyQuery.fetchNextPage()}
                        disabled={historyQuery.isFetchingNextPage}
                        className="w-full rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {historyQuery.isFetchingNextPage ? 'Đang tải...' : 'Tải thêm lịch sử'}
                      </button>
                    )}
                  </div>

                  {activeCycle && (
                    <div className="md:col-span-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden sticky top-4">
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
                          <div>
                            <p className="text-[10px] font-extrabold text-pink-400 uppercase tracking-widest mb-0.5">
                              Chu kỳ #{cyclesTotal - cycles.findIndex((cycle) => cycle._id === activeCycle._id)}
                              {activeCycle._id === cycles[0]?._id ? ' · Gần nhất đã ghi nhận' : ''}
                            </p>
                            <h2 className="text-xl font-extrabold text-slate-900">{fmt(activeCycle.startDate)}</h2>
                          </div>
                          <span className="material-symbols-outlined text-pink-400 text-[36px]">water_drop</span>
                        </div>

                        {activeCycle._id === cycles[0]?._id && insights?.estimatedPeriodStartDate && (
                          <div className="border-b border-violet-50 bg-violet-50/50 px-6 py-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-violet-500">Kỳ tiếp theo dự kiến</p>
                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {fmtShort(insights.estimatedPeriodStartDate)}
                              {insights.periodStatus === 'DELAYED'
                                ? ` · Trễ ${insights.periodDelayDays ?? 0} ngày`
                                : insights.periodStatus === 'PREDICTED'
                                  ? ' · Đang trong cửa sổ dự đoán'
                                  : ''}
                            </p>
                          </div>
                        )}

                        {activeCycle._id === cycles[0]?._id && activeDay > 0 && (
                          <div className="px-6 py-4 border-b border-pink-50">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold text-slate-500">Ngày {activeDay} / {activeCycle.cycleLength || 28}</p>
                              <p className="text-xs font-bold" style={{ color: getPhaseColor(activeDay, activeCycle.periodLength || 5, activeCycle.cycleLength || 28).text }}>
                                {insights?.estimatedPhase ?? getPhaseColor(activeDay, activeCycle.periodLength || 5, activeCycle.cycleLength || 28).label}
                              </p>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(activeDay / (activeCycle.cycleLength || 28)) * 100}%`, background: 'linear-gradient(90deg,#fecdd3,#bae6fd,#e2e8f0)' }} />
                            </div>
                          </div>
                        )}

                        <div className="px-6 py-5 border-b border-gray-50">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Các giai đoạn</p>
                          <div className="space-y-2.5">
                            {PHASES.map((phase, index) => {
                              const cycleLen = activeCycle.cycleLength || 28;
                              const periodLen = activeCycle.periodLength || 5;
                              const ovulationDay = Math.max(periodLen + 1, cycleLen - 14);
                              const ranges = [
                                { days: `Ngày 1 - ${periodLen}`, pct: (periodLen / cycleLen) * 100 },
                                { days: `Ngày ${periodLen + 1} - ${ovulationDay - 2}`, pct: Math.max(((ovulationDay - 2 - periodLen) / cycleLen) * 100, 0) },
                                { days: `Ngày ${ovulationDay - 1} - ${ovulationDay + 1}`, pct: (3 / cycleLen) * 100 },
                                { days: `Ngày ${ovulationDay + 2} - ${cycleLen}`, pct: Math.max(((cycleLen - ovulationDay - 1) / cycleLen) * 100, 0) },
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
                          <div className="p-3.5 rounded-2xl" style={{ background: '#f0f9ff' }}>
                            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wide mb-0.5">Kỳ kinh tiếp</p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {activeCycle._id === cycles[0]?._id && insights?.estimatedPeriodStartDate
                                ? fmtShort(insights.estimatedPeriodStartDate)
                                : nextPeriod(activeCycle.startDate, activeCycle.cycleLength || 28)}
                            </p>
                          </div>
                          <div className="p-3.5 rounded-2xl" style={{ background: '#fdf4ff' }}>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-0.5">Ghi chú</p>
                            <p className="text-sm font-extrabold text-slate-800 truncate">{activeCycle.notes || 'Không có'}</p>
                          </div>
                        </div>
                        <div className="px-6 py-5">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400">Triệu chứng trong kỳ</p>
                              <p className="text-xs font-semibold text-slate-400">Hiển thị nhật ký đã ghi trong khoảng ngày của kỳ này.</p>
                            </div>
                          </div>
                          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {activePeriodDates.map((dateIso, index) => {
                              const existingLog = symptomLogsByDate.get(dateIso);
                              return (
                                <button
                                  key={dateIso}
                                  type="button"
                                  onClick={() => openDailyLogForDate(dateIso)}
                                  className={`rounded-2xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                                    existingLog
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-slate-100 bg-white text-slate-600'
                                  }`}
                                >
                                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ngày {index + 1}</p>
                                  <p className="mt-1 text-sm font-black">{fmtShort(dateIso)}</p>
                                  <p className="mt-1 text-[11px] font-bold">
                                    {existingLog ? 'Cập nhật triệu chứng' : 'Ghi triệu chứng'}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                          {symptomHistoryQuery.isLoading ? (
                            <div className="py-6"><Spinner /></div>
                          ) : (symptomHistoryQuery.data?.dailyLogs ?? []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-pink-100 bg-pink-50/40 p-4 text-sm font-semibold text-slate-500">
                              Chưa có triệu chứng nào được ghi trong kỳ này.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(symptomHistoryQuery.data?.dailyLogs ?? []).map((log) => (
                                <div key={log._id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-black text-slate-800">{fmt(log.logDate)}</p>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-pink-500">
                                      Lượng kinh: {log.flowIntensity === 'NONE' ? 'Không có' : log.flowIntensity === 'LIGHT' ? 'Ít' : log.flowIntensity === 'MEDIUM' ? 'Vừa' : 'Nhiều'}
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {log.hasClots && <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-500">Có cục máu đông</span>}
                                    {typeof log.moodScore === 'number' && <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-600">Mood: {log.moodScore}/5</span>}
                                    {(log.symptoms ?? []).map((symptom) => (
                                      <span key={`${log._id}-${symptom.symptomId}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                        {symptom.symptomName ?? `Triệu chứng #${symptom.symptomId}`} · {symptom.severity}
                                      </span>
                                    ))}
                                  </div>
                                  {log.notes && <p className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold leading-relaxed text-slate-500">{log.notes}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-pink-400">Đánh giá chu kỳ</p>
                        <h3 className="mt-2 text-2xl font-black text-slate-900">{insights?.regularityLabel ?? 'Chưa đủ dữ liệu'}</h3>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                          Đây là đánh giá tham khảo dựa trên các kỳ đã xác nhận, độ biến thiên chu kỳ và số ngày kinh. Không dùng như chẩn đoán y khoa.
                        </p>
                      </div>
                      <div className="rounded-[2rem] bg-gradient-to-br from-sky-50 to-pink-50 px-6 py-5 text-center">
                        <p className="text-4xl font-black text-slate-900">{regularity}%</p>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Điểm ổn định</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                      <div className="space-y-2">
                        {(insights?.regularityReasons ?? ['Cần thêm ít nhất 3 kỳ gần nhất để Hi đánh giá ổn hơn.']).map((reason) => (
                          <div key={reason} className="flex gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                            <span className="material-symbols-outlined text-base text-pink-400">check_circle</span>
                            {reason}
                          </div>
                        ))}
                      </div>
                      <div className="flex h-44 items-end gap-2 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
                        {(insights?.cycleTrendPoints ?? []).slice(-8).map((point) => {
                          const len = point.cycleLength ?? avgLen ?? 28;
                          const height = Math.max(18, Math.min(100, ((len - 15) / 35) * 100));
                          return (
                            <div key={`${point.cycleId}-${point.startDate}`} className="flex flex-1 flex-col items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">{len}</span>
                              <div
                                className={`w-full rounded-t-2xl ${point.outlier ? 'bg-slate-300' : 'bg-gradient-to-t from-pink-400 to-sky-300'}`}
                                style={{ height: `${height}%` }}
                              />
                              <span className="text-[10px] font-bold text-slate-400">{new Date(`${point.startDate}T00:00:00`).toLocaleDateString('vi-VN', { month: 'short' })}</span>
                            </div>
                          );
                        })}
                        {(insights?.cycleTrendPoints ?? []).length === 0 && (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">Chưa có dữ liệu biểu đồ.</div>
                        )}
                      </div>
                    </div>
                  </div>
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
                      Anh huong trieu chung theo chu ky
                    </h3>
                    {phaseImpacts.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">Chua co du lieu trieu chung.</p>
                    ) : (
                      <div className="space-y-5">
                        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide mb-1">Diem tac dong tong</p>
                          <p className="text-2xl font-extrabold text-slate-900">{Math.round(overallSymptomImpact)}<span className="text-sm text-slate-400">/100</span></p>
                        </div>

                        {phaseImpacts.length > 0 && (
                          <div className="space-y-2.5">
                            {phaseImpacts.map((item) => (
                              <div key={item.phase} className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-700 w-28 flex-shrink-0">{item.phase}</span>
                                <div className="flex-1 h-2.5 rounded-full bg-rose-50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, Math.max(0, item.impactScore))}%`, background: 'linear-gradient(90deg,#fb7185,#f472b6)' }}
                                  />
                                </div>
                                <span className="text-xs font-extrabold text-slate-500 w-20 text-right">{Math.round(item.impactScore)}%</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {topSymptomsByImpact.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Top trieu chung gay bien dong</p>
                            {topSymptomsByImpact.map((symptom) => (
                              <div key={symptom.symptomId} className="flex items-center justify-between rounded-xl border border-rose-100 bg-white px-3 py-2">
                                <span className="text-sm font-bold text-slate-700">{symptom.symptomName}</span>
                                <span className="text-xs font-extrabold text-rose-500">{Math.round(symptom.impactScore)}%</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {insights?.warnings?.length ? (
                <p className="mt-5 text-xs leading-relaxed text-slate-400">
                  {insights.warnings.join(' ')}
                </p>
              ) : null}
            </>
          )}
        </main>

        <SiteFooter tone="rose" />
      </div>
      <DailyLogModal
        open={logModalOpen}
        mode="default"
        initialDate={logModalDate}
        onClose={() => setLogModalOpen(false)}
        onSaved={() => {
          symptomHistoryQuery.refetch();
          historyQuery.refetch();
        }}
      />
    </div>
  );
}
