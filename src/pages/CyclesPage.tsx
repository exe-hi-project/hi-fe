import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';

/* ── Fake cycle history data ─────────────────────────── */
interface CycleRecord {
  id: number;
  startDate: string;
  cycleLength: number;
  periodLength: number;
  symptoms: string[];
  mood: 'great' | 'good' | 'okay' | 'bad';
  notes: string;
}

const FAKE_CYCLES: CycleRecord[] = [
  { id: 1, startDate: '2026-03-01', cycleLength: 28, periodLength: 5, symptoms: ['Đau bụng', 'Mệt mỏi'], mood: 'okay', notes: 'Đau bụng nhẹ ngày đầu, uống trà gừng thấy dễ chịu hơn.' },
  { id: 2, startDate: '2026-02-01', cycleLength: 29, periodLength: 5, symptoms: ['Đau đầu', 'Đầy hơi'], mood: 'good', notes: '' },
  { id: 3, startDate: '2026-01-03', cycleLength: 29, periodLength: 6, symptoms: ['Mệt mỏi'], mood: 'okay', notes: 'Mệt nhiều hơn bình thường, ngủ nhiều.' },
  { id: 4, startDate: '2025-12-05', cycleLength: 28, periodLength: 5, symptoms: ['Đau bụng', 'Tâm trạng thất thường'], mood: 'bad', notes: '' },
  { id: 5, startDate: '2025-11-07', cycleLength: 27, periodLength: 4, symptoms: ['Đầy hơi'], mood: 'good', notes: 'Chu kỳ ngắn hơn bình thường.' },
  { id: 6, startDate: '2025-10-11', cycleLength: 27, periodLength: 5, symptoms: ['Mệt mỏi', 'Đau đầu'], mood: 'okay', notes: '' },
];

const MOOD_CONFIG = {
  great: { emoji: '🤩', label: 'Tuyệt vời', color: '#34d399' },
  good:  { emoji: '😊', label: 'Tốt',       color: '#60a5fa' },
  okay:  { emoji: '😐', label: 'Bình thường',color: '#fbbf24' },
  bad:   { emoji: '😞', label: 'Không tốt', color: '#f87171' },
};

function getPhaseColor(day: number, periodLen: number) {
  if (day <= periodLen) return { bg: 'rgba(251,113,133,0.25)', text: '#be123c',  label: 'Kinh nguyệt' };
  if (day <= 12)         return { bg: 'rgba(251,191,36,0.25)',  text: '#92400e',  label: 'Nang trứng'  };
  if (day <= 16)         return { bg: 'rgba(52,211,153,0.25)',  text: '#065f46',  label: 'Rụng trứng'  };
  return                        { bg: 'rgba(167,139,250,0.25)', text: '#5b21b6',  label: 'Hoàng thể'   };
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function nextPeriod(startDate: string, cycleLen: number) {
  const d = new Date(new Date(startDate + 'T00:00:00').getTime() + cycleLen * 86400000);
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

export default function CyclesPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<number | null>(1);
  const [tab, setTab] = useState<'history' | 'stats'>('history');

  if (!user) return null;

  const avgLen    = Math.round(FAKE_CYCLES.reduce((s, c) => s + c.cycleLength, 0)   / FAKE_CYCLES.length);
  const avgPeriod = Math.round(FAKE_CYCLES.reduce((s, c) => s + c.periodLength, 0) / FAKE_CYCLES.length);
  const minLen    = Math.min(...FAKE_CYCLES.map(c => c.cycleLength));
  const maxLen    = Math.max(...FAKE_CYCLES.map(c => c.cycleLength));
  const regularity = Math.round(100 - ((maxLen - minLen) / avgLen) * 100);

  const activeCycle = FAKE_CYCLES.find(c => c.id === selected) ?? FAKE_CYCLES[0];
  const today = new Date();
  const activeStart = new Date(activeCycle.startDate + 'T00:00:00');
  const activeDayRaw = Math.floor((today.getTime() - activeStart.getTime()) / 86400000) + 1;
  const activeDay = Math.min(Math.max(activeDayRaw, 1), activeCycle.cycleLength);

  return (
    <div className="min-h-screen bg-[#f8f6f7] font-sans overflow-x-hidden">
      {/* Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[480px] h-[480px] rounded-full bg-pink-200/30 blur-3xl -top-24 -left-24" />
        <div className="absolute w-[380px] h-[380px] rounded-full bg-violet-200/25 blur-3xl bottom-0 right-0" />
        <div className="absolute w-[320px] h-[320px] rounded-full bg-yellow-100/40 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto w-full">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to="/female-dashboard" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-pink-50 transition-colors border border-white">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_back</span>
                </Link>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Lịch sử chu kỳ 🌸</h1>
              </div>
              <p className="text-sm text-slate-400 ml-10">Theo dõi {FAKE_CYCLES.length} chu kỳ gần nhất</p>
            </div>
            <button
              className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ghi chu kỳ mới
            </button>
          </div>

          {/* ── Stats bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
            {[
              { icon: 'calendar_month', label: 'Độ dài TB',      value: `${avgLen} ngày`,    from: '#f9a8d4', to: '#f472b6', iconColor: '#f472b6' },
              { icon: 'water_drop',     label: 'Kinh nguyệt TB', value: `${avgPeriod} ngày`, from: '#fca5a5', to: '#f87171', iconColor: '#ef4444' },
              { icon: 'bar_chart',      label: 'Tính đều đặn',   value: `${regularity}%`,    from: '#6ee7b7', to: '#34d399', iconColor: '#059669' },
              { icon: 'history',        label: 'Chu kỳ đã ghi',  value: `${FAKE_CYCLES.length} chu kỳ`, from: '#c4b5fd', to: '#a78bfa', iconColor: '#7c3aed' },
            ].map(s => (
              <div key={s.label} className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/80 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg,${s.from}55,${s.to}33)` }}>
                  <span className="material-symbols-outlined text-[22px]" style={{ color: s.iconColor }}>{s.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab switcher ── */}
          <div className="flex gap-2 mb-5 bg-white/60 rounded-2xl p-1 backdrop-blur-sm border border-white w-fit shadow-sm">
            {(['history', 'stats'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={tab === t ? {
                  background: 'linear-gradient(135deg,#f472b6,#a78bfa)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(244,114,182,0.35)',
                } : { color: '#94a3b8' }}
              >
                {t === 'history' ? '📋 Lịch sử' : '📊 Phân tích'}
              </button>
            ))}
          </div>

          {tab === 'history' ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

              {/* ── Cycle list ─────────────────── */}
              <div className="md:col-span-2 space-y-3">
                {FAKE_CYCLES.map((cycle, i) => {
                  const isActive = cycle.id === selected;
                  const isCurrentOngoing = i === 0;
                  return (
                    <button
                      key={cycle.id}
                      onClick={() => setSelected(cycle.id)}
                      className="w-full text-left rounded-2xl p-4 border transition-all duration-200"
                      style={{
                        background: isActive ? 'linear-gradient(135deg,#fff0f8,#f5f0ff)' : 'rgba(255,255,255,0.85)',
                        borderColor: isActive ? '#f9a8d4' : 'rgba(255,255,255,0.9)',
                        boxShadow: isActive ? '0 6px 20px rgba(244,114,182,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
                            style={{ background: isActive ? 'linear-gradient(135deg,#f472b6,#a78bfa)' : '#f1f5f9', color: isActive ? 'white' : '#94a3b8' }}
                          >
                            {FAKE_CYCLES.length - i}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{fmtShort(cycle.startDate)}</p>
                            <p className="text-[10px] text-slate-400">{cycle.cycleLength} ngày</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isCurrentOngoing && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wide"
                              style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
                              Hiện tại
                            </span>
                          )}
                          <span className="text-base">{MOOD_CONFIG[cycle.mood].emoji}</span>
                        </div>
                      </div>

                      {/* Phase strip */}
                      <div className="flex gap-0.5 rounded-lg overflow-hidden h-2">
                        <div className="rounded-sm" style={{ width: `${(cycle.periodLength / cycle.cycleLength) * 100}%`, background: '#fb7185' }} />
                        <div className="rounded-sm" style={{ width: `${((12 - cycle.periodLength) / cycle.cycleLength) * 100}%`, background: '#fbbf24' }} />
                        <div className="rounded-sm" style={{ width: `${(4 / cycle.cycleLength) * 100}%`, background: '#34d399' }} />
                        <div className="flex-1 rounded-sm" style={{ background: '#a78bfa' }} />
                      </div>

                      {cycle.symptoms.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {cycle.symptoms.map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded-md bg-pink-50 text-[9px] font-bold text-pink-400 border border-pink-100">{s}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Detail panel ───────────────── */}
              <div className="md:col-span-3">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden sticky top-4">

                  {/* Header */}
                  <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
                    <div>
                      <p className="text-[10px] font-extrabold text-pink-400 uppercase tracking-widest mb-0.5">
                        Chu kỳ #{FAKE_CYCLES.length - FAKE_CYCLES.findIndex(c => c.id === selected)}
                        {selected === 1 ? ' · Đang diễn ra' : ''}
                      </p>
                      <h2 className="text-xl font-extrabold text-slate-900">{fmt(activeCycle.startDate)}</h2>
                    </div>
                    <span className="text-4xl">{MOOD_CONFIG[activeCycle.mood].emoji}</span>
                  </div>

                  {/* Current day progress (only for current cycle) */}
                  {selected === 1 && (
                    <div className="px-6 py-4 border-b border-pink-50">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-slate-500">Ngày {activeDay} / {activeCycle.cycleLength}</p>
                        <p className="text-xs font-bold" style={{ color: getPhaseColor(activeDay, activeCycle.periodLength).text }}>
                          {getPhaseColor(activeDay, activeCycle.periodLength).label}
                        </p>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(activeDay / activeCycle.cycleLength) * 100}%`,
                            background: 'linear-gradient(90deg,#fb7185,#f472b6,#a78bfa)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Phase breakdown */}
                  <div className="px-6 py-5 border-b border-gray-50">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Các giai đoạn</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Kinh nguyệt', days: `Ngày 1 – ${activeCycle.periodLength}`, pct: (activeCycle.periodLength / activeCycle.cycleLength) * 100, bg: '#fb7185', light: '#fff1f2' },
                        { label: 'Nang trứng',  days: `Ngày ${activeCycle.periodLength + 1} – 12`, pct: ((12 - activeCycle.periodLength) / activeCycle.cycleLength) * 100, bg: '#fbbf24', light: '#fffbeb' },
                        { label: 'Rụng trứng',  days: 'Ngày 13 – 16', pct: (4 / activeCycle.cycleLength) * 100, bg: '#34d399', light: '#ecfdf5' },
                        { label: 'Hoàng thể',   days: `Ngày 17 – ${activeCycle.cycleLength}`, pct: ((activeCycle.cycleLength - 16) / activeCycle.cycleLength) * 100, bg: '#a78bfa', light: '#f5f3ff' },
                      ].map(ph => (
                        <div key={ph.label} className="flex items-center gap-3">
                          <div className="w-24 flex-shrink-0">
                            <p className="text-xs font-bold text-slate-700">{ph.label}</p>
                            <p className="text-[10px] text-slate-400">{ph.days}</p>
                          </div>
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: ph.light }}>
                            <div className="h-full rounded-full" style={{ width: `${ph.pct}%`, background: ph.bg }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{Math.round(ph.pct)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="px-6 py-5 grid grid-cols-2 gap-3 border-b border-gray-50">
                    <div className="p-3.5 rounded-2xl" style={{ background: '#fff5f9' }}>
                      <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wide mb-0.5">Độ dài chu kỳ</p>
                      <p className="text-2xl font-extrabold text-slate-900">{activeCycle.cycleLength} <span className="text-sm font-bold text-slate-400">ngày</span></p>
                    </div>
                    <div className="p-3.5 rounded-2xl" style={{ background: '#fff5f5' }}>
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide mb-0.5">Kinh nguyệt</p>
                      <p className="text-2xl font-extrabold text-slate-900">{activeCycle.periodLength} <span className="text-sm font-bold text-slate-400">ngày</span></p>
                    </div>
                    <div className="p-3.5 rounded-2xl" style={{ background: '#f0fdf4' }}>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-0.5">Kỳ kinh tiếp</p>
                      <p className="text-sm font-extrabold text-slate-800">{nextPeriod(activeCycle.startDate, activeCycle.cycleLength)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl" style={{ background: '#fdf4ff' }}>
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-0.5">Tâm trạng</p>
                      <p className="text-sm font-extrabold text-slate-800">{MOOD_CONFIG[activeCycle.mood].emoji} {MOOD_CONFIG[activeCycle.mood].label}</p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  {activeCycle.symptoms.length > 0 && (
                    <div className="px-6 py-4 border-b border-gray-50">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Triệu chứng</p>
                      <div className="flex flex-wrap gap-2">
                        {activeCycle.symptoms.map(s => (
                          <span key={s} className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 border border-rose-100"
                            style={{ background: 'linear-gradient(135deg,#fff1f2,#fce7f3)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Ghi chú</p>
                    {activeCycle.notes ? (
                      <p className="text-sm text-slate-600 leading-relaxed bg-gray-50 rounded-xl p-3">{activeCycle.notes}</p>
                    ) : (
                      <p className="text-sm text-slate-300 italic">Không có ghi chú</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Stats tab ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Length trend */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-pink-400 text-[22px]">bar_chart</span>
                  Độ dài chu kỳ theo tháng
                </h3>
                <div className="flex items-end gap-3 h-40 px-2">
                  {[...FAKE_CYCLES].reverse().map((c, i) => {
                    const pct = ((c.cycleLength - 20) / 20) * 100;
                    const startD = new Date(c.startDate + 'T00:00:00');
                    const label = startD.toLocaleDateString('vi-VN', { month: 'short' });
                    const isLatest = i === FAKE_CYCLES.length - 1;
                    return (
                      <div key={c.id} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-[9px] font-bold text-slate-500">{c.cycleLength}</span>
                        <div className="w-full rounded-t-xl relative overflow-hidden" style={{ height: `${pct}%`, minHeight: 20, maxHeight: '100%', background: isLatest ? 'linear-gradient(180deg,#f472b6,#a78bfa)' : '#e9d5ff' }} />
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

              {/* Regularity */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-400 text-[22px]">donut_large</span>
                  Mức độ đều đặn
                </h3>
                <div className="flex flex-col items-center py-4">
                  <div className="relative size-36">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="url(#regGrad)" strokeWidth="9"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - regularity / 100)}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="regGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f472b6" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-slate-900">{regularity}%</span>
                      <span className="text-xs text-slate-400 font-medium">đều đặn</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 text-center leading-relaxed max-w-xs">
                    {regularity >= 90
                      ? 'Chu kỳ của bạn rất đều đặn! 🎉 Điều này cho thấy sức khoẻ sinh sản tốt.'
                      : regularity >= 75
                      ? 'Chu kỳ khá đều. Tiếp tục duy trì lối sống lành mạnh nhé! 💕'
                      : 'Chu kỳ có một chút biến động. Hãy theo dõi thêm và tham vấn bác sĩ nếu cần.'}
                  </p>
                </div>
              </div>

              {/* Mood distribution */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-400 text-[22px]">sentiment_satisfied</span>
                  Phân bố tâm trạng
                </h3>
                <div className="space-y-3">
                  {(['great','good','okay','bad'] as const).map(m => {
                    const count = FAKE_CYCLES.filter(c => c.mood === m).length;
                    const pct = Math.round((count / FAKE_CYCLES.length) * 100);
                    const cfg = MOOD_CONFIG[m];
                    return (
                      <div key={m} className="flex items-center gap-3">
                        <span className="text-xl w-7 flex-shrink-0">{cfg.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600">{cfg.label}</span>
                            <span className="font-bold text-slate-400">{count} chu kỳ</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.color }} />
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top symptoms */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-[22px]">monitor_heart</span>
                  Triệu chứng thường gặp
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const freq: Record<string, number> = {};
                    FAKE_CYCLES.forEach(c => c.symptoms.forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
                    return Object.entries(freq)
                      .sort((a, b) => b[1] - a[1])
                      .map(([sym, count]) => {
                        const pct = Math.round((count / FAKE_CYCLES.length) * 100);
                        return (
                          <div key={sym} className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-700 w-32 flex-shrink-0">{sym}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-rose-50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#fb7185,#f472b6)' }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-slate-400 w-14 text-right">{count}/{FAKE_CYCLES.length} chu kỳ</span>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

            </div>
          )}
        </main>

        <footer className="bg-white/60 border-t border-white/40 py-5 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1200px] mx-auto flex justify-between items-center text-xs text-slate-400">
            <p>© 2025 Hi Inc. All rights reserved.</p>
            <Link to="/female-dashboard" className="hover:text-pink-500 transition-colors font-medium">← Về Dashboard</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
