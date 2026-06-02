import { useState, useRef, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../hooks/useSubscription';
import Navbar from '../components/layout/Navbar';
import api from '../lib/api';
import { ChatMessage } from '../types';
import PricingCard from '../components/PricingCard';

/* ── Helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (h < 18) return { text: 'Chào buổi chiều', icon: 'partly_cloudy_day' };
  return { text: 'Chào buổi tối', icon: 'nightlight' };
}

interface PartnerCycle { _id: string; startDate: string; cycleLength: number; periodLength: number; }

function getPartnerCycleInfo(cycle: PartnerCycle) {
  const today = new Date();
  const start = new Date(cycle.startDate);
  const cycleDay = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
  const cycleLen = cycle.cycleLength || 28;
  const daysUntilPeriod = cycleLen - cycleDay;
  let phase = 'Hoàng thể';
  if (cycleDay <= cycle.periodLength) phase = 'Kinh nguyệt';
  else if (cycleDay <= 13)            phase = 'Nang trứng';
  else if (cycleDay <= 16)            phase = 'Rụng trứng';
  return { cycleDay, phase, daysUntilPeriod, cycleLen };
}

function formatDateRange(start?: string | Date | null, end?: string | Date | null) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const format = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return `${format(s)}${e ? ` - ${format(e)}` : ''}`;
}

function getPeriodDateRanges(cycle: PartnerCycle | null) {
  if (!cycle) return { lastStart: null, lastEnd: null, nextStart: null, nextEnd: null };
  const lastStart = new Date(cycle.startDate);
  const lastEnd = new Date(lastStart.getTime() + (cycle.periodLength - 1) * 86_400_000);
  const nextStart = new Date(lastStart.getTime() + cycle.cycleLength * 86_400_000);
  const nextEnd = new Date(nextStart.getTime() + (cycle.periodLength - 1) * 86_400_000);
  return { lastStart, lastEnd, nextStart, nextEnd };
}

function getCareTips(phase: string): string[] {
  if (phase === 'Kinh nguyệt') return ['🌡️ Chuẩn bị túi chườm ấm', '🍫 Mua chocolate / đồ ăn em thích', '🤗 Nhẹ nhàng và thông cảm hơn'];
  if (phase === 'Rụng trứng')  return ['⚡ Năng lượng em đang ở đỉnh cao', '💑 Lên kế hoạch hẹn hò lãng mạn đi!', '🏃 Cùng em vận động thể thao'];
  if (phase === 'Nang trứng')  return ['✨ Em đang tự tin & hứng khởi', '🎯 Ủng hộ kế hoạch của em', '💬 Trò chuyện sâu hơn'];
  return ['🌙 Em cần nghỉ ngơi nhiều hơn', '☕ Pha cho em ly trà ấm nhé', '🎵 Cùng thư giãn với nhạc nhẹ'];
}

function getActivityBars() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  return days.map((day, i) => ({
    day,
    h: i === todayIndex ? '70%' : i < todayIndex ? '40%' : '0%',
    cls: i === todayIndex ? 'bg-gradient-to-t from-blue-500 to-indigo-400' : i < todayIndex ? 'bg-blue-200' : 'bg-blue-100',
    active: i === todayIndex,
  }));
}

function buildMonthCalendar(partnerCycle: PartnerCycle | null) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const monthName = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const cells: Array<{ day: number | null; isToday: boolean; isPeriod: boolean; isOvulation: boolean; isFertile: boolean }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, isToday: false, isPeriod: false, isOvulation: false, isFertile: false });

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate();
    let isPeriod = false, isOvulation = false, isFertile = false;
    if (partnerCycle) {
      const start = new Date(partnerCycle.startDate);
      start.setHours(0, 0, 0, 0);
      const cellDate = new Date(year, month, d);
      const cycleDay = Math.floor((cellDate.getTime() - start.getTime()) / 86_400_000) + 1;
      const cLen = partnerCycle.cycleLength || 28;
      const pLen = partnerCycle.periodLength || 5;
      const normalised = ((cycleDay - 1) % cLen + cLen) % cLen + 1;
      if (normalised >= 1 && normalised <= pLen) isPeriod = true;
      else if (normalised >= 13 && normalised <= 16) isOvulation = true;
      else if (normalised >= 11 && normalised <= 17) isFertile = true;
    }
    cells.push({ day: d, isToday, isPeriod, isOvulation, isFertile });
  }
  return { cells, monthName };
}

/* ── Mood options ── */
const MOOD_OPTIONS = [
  { id: 'energized', emoji: '💪', label: 'Mạnh mẽ',    bg: '#eff6ff', selBg: '#dbeafe', ring: '#93c5fd' },
  { id: 'tired',     emoji: '😴', label: 'Mệt mỏi',    bg: '#f5f3ff', selBg: '#ddd6fe', ring: '#a78bfa' },
  { id: 'focused',   emoji: '🎯', label: 'Tập trung',   bg: '#ecfdf5', selBg: '#a7f3d0', ring: '#34d399' },
  { id: 'stressed',  emoji: '😤', label: 'Căng thẳng',  bg: '#fff7ed', selBg: '#fed7aa', ring: '#fb923c' },
] as const;

const MALE_AI_CHIPS = ['Hôm nay nên làm gì?', 'Tips chăm bạn gái?', 'Bạn gái đang ở phase nào?', 'Cách giảm stress?'];

/* ── Panel component ── */
function Panel({ open, onClose, title, icon, iconBg, children }: {
  open: boolean; onClose: () => void; title: string; icon: string; iconBg: string; children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════ */
export default function MaleDashboardPage() {
  const { user } = useAuthStore();
  const { data: subscription } = useSubscription();
  const isPremium = (subscription?.plan && ['premium', 'monthly', 'yearly', 'premium_monthly', 'premium_yearly'].includes(subscription.plan)) && subscription?.status === 'active';
  const planLabel = subscription?.plan && subscription.plan.includes('yearly') ? 'Premium Năm' : subscription?.plan && subscription.plan.includes('monthly') ? 'Premium Tháng' : 'Free';
  const queryClient = useQueryClient();

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const greeting = getGreeting();

  /* ── Partner cycle query ── */
  const partnerQuery = useQuery({
    queryKey: ['partner-cycles'],
    queryFn: async () => {
      const { data } = await api.get('/users/partner-cycles');
      return data as { success: boolean; cycles: PartnerCycle[]; partner?: { name: string } };
    },
    enabled: !!user?.partnerId,
  });
  const partnerCycle = partnerQuery.data?.cycles?.[0] ?? null;
  const partnerInfo  = partnerCycle ? getPartnerCycleInfo(partnerCycle) : null;
  const partnerName  = partnerQuery.data?.partner?.name ?? 'Bạn đời';
  const partnerPhase = partnerInfo?.phase ?? '—';
  const partnerDay   = partnerInfo?.cycleDay ?? 0;
  const partnerCycleLen = partnerInfo?.cycleLen ?? 28;
  const partnerDaysUntilPeriod = partnerInfo?.daysUntilPeriod ?? 0;
  const hasPartner   = !!user?.partnerId;

  const careTips = getCareTips(partnerPhase);

  /* ── Panels ── */
  type PanelId = 'health' | 'mood' | 'chat' | null;
  const [panel, setPanel] = useState<PanelId>(null);
  const close = () => setPanel(null);

  /* ── Health log ── */
  const [health, setHealth] = useState({ workoutDone: false, sleepHours: 7, stressLevel: 3, energyLevel: 75 });
  const [healthSaved, setHealthSaved] = useState(false);
  const saveHealth = () => { setHealthSaved(true); setTimeout(() => { setHealthSaved(false); close(); }, 1500); };

  /* ── Mood ── */
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [moodNote, setMoodNote] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);
  const toggleMood = (id: string) => setSelectedMoods(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const saveMood = () => { setMoodSaved(true); setTimeout(() => { setMoodSaved(false); close(); }, 1500); };

  /* ── Chat ── */
  const chatQuery = useQuery<ChatMessage[]>({
    queryKey: ['chat'],
    queryFn: () => api.get('/chat').then((r) => r.data.messages),
  });
  const messages = chatQuery.data ?? [];
  const [chatInput, setChatInput] = useState('');
  const chatBottom = useRef<HTMLDivElement>(null);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendChatMutation = useMutation({
    mutationFn: (content: string) => api.post('/chat', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  const sendMessage = (text = chatInput.trim()) => {
    if (!text) return;
    setChatInput('');
    sendChatMutation.mutate(text);
  };

  const circumference = 2 * Math.PI * 40;
  const energyOffset = circumference * (1 - health.energyLevel / 100);
  const partnerStatusLabel = partnerPhase === 'Kinh nguyệt' ? 'Đang trong kỳ kinh' : `Ước tính ${partnerPhase.toLowerCase()}`;
  const { lastStart, lastEnd, nextStart, nextEnd } = getPeriodDateRanges(partnerCycle);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f0f7ff] overflow-x-hidden relative font-sans">
      {/* Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-blue-200/40   w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-indigo-100/50  w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-cyan-100/30    w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto w-full">

          {/* Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                <span>{firstName}</span>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                    💎 {planLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    🍀 Free
                  </span>
                )}
                <span className="font-normal text-slate-400">,</span>
                <span className="font-medium" style={{ background: 'linear-gradient(90deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  hôm nay bạn mạnh mẽ! 💙
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-white/80">
              <span className="text-sm font-semibold text-slate-500">Hôm nay:</span>
              <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ── 1. Partner cycle hero card (3 cols) ── */}
            <div className="md:col-span-3 bg-white/90 backdrop-blur-sm rounded-3xl p-7 relative overflow-hidden shadow-sm border border-white/80">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-100/40 to-purple-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-100/20 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />

              {/* Header */}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-pink-500 text-[22px]">favorite</span>
                    <h3 className="text-lg font-bold text-slate-800">Sức khỏe của {hasPartner ? partnerName : 'Bạn đời'}</h3>
                    {hasPartner && (
                      <span className="flex h-2.5 w-2.5 relative ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm ml-7">Theo dõi chu kỳ — Cập nhật tự động</p>
                </div>
                {hasPartner && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-pink-600 bg-pink-50 border border-pink-100">
                    {partnerStatusLabel}
                  </span>
                )}
              </div>

              {hasPartner ? (
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  {/* Cycle ring */}
                  <div className="relative size-44 flex-shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#fce7f3" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#partnerCycleGrad)" strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={partnerDay > 0 ? circumference * (1 - partnerDay / partnerCycleLen) : circumference}
                        strokeLinecap="round" />
                      <defs>
                        <linearGradient id="partnerCycleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#f472b6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Ngày chu kỳ</span>
                      <span className="text-4xl font-extrabold text-slate-900">{partnerDay > 0 ? partnerDay : '—'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">/ {partnerCycleLen} ngày</span>
                      <span className="text-pink-500 text-[11px] font-extrabold mt-1">{partnerPhase}</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    {/* Phase status */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-pink-100/70" style={{ background: 'linear-gradient(135deg,#fdf2f8,#fae8ff)' }}>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-pink-500 text-[22px]">water_drop</span>
                        <div>
                          <p className="text-[10px] text-pink-500 font-extrabold uppercase tracking-wider">Giai đoạn hiện tại</p>
                          <p className="text-lg font-extrabold text-slate-900">{partnerPhase}</p>
                        </div>
                      </div>
                      <span className="text-3xl">
                        {partnerPhase === 'Rụng trứng' ? '🌸' : partnerPhase === 'Kinh nguyệt' ? '🌡️' : '✨'}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div className="rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 text-rose-500">
                          <span className="material-symbols-outlined text-[18px]">event_available</span>
                          <p className="text-[10px] font-black uppercase tracking-wide">Kỳ gần nhất</p>
                        </div>
                        <p className="mt-2 text-sm font-extrabold text-slate-800">
                          {formatDateRange(lastStart, lastEnd)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-rose-500">Đã đồng bộ</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 sm:flex-col">
                        <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                        <span className="whitespace-nowrap rounded-full border border-rose-100 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">{partnerCycleLen} ngày</span>
                        <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                      </div>
                      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-3.5">
                        <div className="flex items-center gap-2 text-rose-500">
                          <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                          <p className="text-[10px] font-black uppercase tracking-wide">Kỳ tiếp theo</p>
                        </div>
                        <p className="mt-2 text-sm font-extrabold text-slate-800">
                          {formatDateRange(nextStart, nextEnd)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-rose-400">Dự kiến</p>
                      </div>
                    </div>

                    {/* Care tips */}
                    <div className="rounded-2xl p-4 border border-pink-100" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>
                      <p className="text-[10px] font-extrabold text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
                        Gợi ý chăm sóc hôm nay
                      </p>
                      <ul className="space-y-1.5">
                        {careTips.map((tip, i) => (
                          <li key={i} className="text-xs text-slate-600 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button onClick={() => setPanel('chat')} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg,#fb7185,#e879f9)', boxShadow: '0 6px 20px rgba(251,113,133,0.35)' }}>
                        <span className="material-symbols-outlined text-lg">auto_awesome</span>
                        Hỏi Hi AI cách chăm sóc
                      </button>
                      <button onClick={() => setPanel('chat')} className="w-full py-3 rounded-xl border border-pink-200 bg-white text-pink-500 font-bold text-sm hover:bg-pink-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        Gửi lời nhắn
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 py-4">
                  {/* Empty state visual */}
                  <div className="relative size-44 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full border-4 border-white shadow-md">
                    <svg className="size-36 -rotate-90 animate-pulse" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeDasharray="10 5" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="material-symbols-outlined text-pink-400 text-5xl animate-[floatY_4s_ease-in-out_infinite]">favorite</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="bg-gradient-to-r from-blue-50/50 to-pink-50/30 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-extrabold text-slate-800 text-base mb-2">Đồng hành cùng sức khỏe của người ấy</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Kết nối tài khoản giúp bạn cập nhật tự động chu kỳ kinh nguyệt của bạn gái, nhận cảnh báo tâm lý và những lời khuyên y học hữu ích từ AI.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                        <span className="text-lg">🔄</span>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug">Đồng bộ chu kỳ tự động</p>
                      </div>
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                        <span className="text-lg">💡</span>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug">Cảnh báo tâm trạng & tips</p>
                      </div>
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                        <span className="text-lg">💬</span>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug">AI y học hỗ trợ 24/7</p>
                      </div>
                    </div>

                    <Link to="/male-settings/notifications" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all w-fit">
                      <span className="material-symbols-outlined text-lg">person_add</span>
                      Kết nối với bạn đời ngay
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. My health & mood card (1 col) ── */}
            <div className="md:col-span-1 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-5">
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">person</span>
                    Sức khỏe của bạn
                  </h3>
                  <button onClick={() => setPanel('health')} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>

                {/* Mini energy ring */}
                <div className="flex justify-center">
                  <div className="relative size-28">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e0f2fe" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#maleEnergyGrad)" strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={energyOffset} strokeLinecap="round" />
                      <defs>
                        <linearGradient id="maleEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-slate-900">{health.energyLevel}%</span>
                      <span className="text-blue-500 text-[10px] font-bold">Năng lượng</span>
                    </div>
                  </div>
                </div>

                {/* Logged Mood strip */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Tâm trạng hôm nay</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMoods.size > 0 ? (
                      Array.from(selectedMoods).map(moodId => {
                        const m = MOOD_OPTIONS.find(o => o.id === moodId);
                        return m ? (
                          <span key={moodId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 shadow-sm">
                            <span>{m.emoji}</span>
                            <span>{m.label}</span>
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Chưa ghi nhận tâm trạng</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Sleep */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-indigo-400 text-[16px]">bedtime</span>
                        Giấc ngủ
                      </span>
                      <span className="font-bold text-indigo-500">{health.sleepHours}h</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(health.sleepHours / 9) * 100}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)' }} />
                    </div>
                  </div>

                  {/* Stress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-cyan-400 text-[16px]">psychology</span>
                        Căng thẳng
                      </span>
                      <span className="font-bold text-cyan-500">{['','Rất thấp','Thấp','TB','Cao','Cao!'][health.stressLevel]}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(health.stressLevel / 5) * 100}%`, background: 'linear-gradient(90deg,#67e8f9,#22d3ee)' }} />
                    </div>
                  </div>

                  {/* Workout */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100/60">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-[18px]">sports_gymnastics</span>
                      <span className="text-xs font-bold text-slate-700">Tập luyện hôm nay:</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${health.workoutDone ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      {health.workoutDone ? 'Đã tập' : 'Chưa tập'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => setPanel('health')} className="py-2.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-base">fitness_center</span>
                  Nhật ký
                </button>
                <button onClick={() => setPanel('mood')} className="py-2.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-base">edit_note</span>
                  Tâm trạng
                </button>
              </div>
            </div>

            {/* Row 2: Secondary panels in grid columns */}
            <div className="md:col-span-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* ── 3. Hi AI advice (dark slate) ── */}
              <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden text-white min-h-[220px]">
                <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] opacity-30 pointer-events-none" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }} />
                
                <div>
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <span className="material-symbols-outlined text-blue-400 text-[22px]">auto_awesome</span>
                    <h3 className="font-bold text-xs text-slate-200">Lời khuyên từ Hi AI</h3>
                  </div>
                  <p className="text-sm font-medium leading-relaxed relative z-10 mb-4 text-slate-300">
                    {hasPartner ? (
                      partnerPhase === 'Rụng trứng'
                        ? `"Hôm nay ${partnerName} đang rất năng động và tự tin. Hãy lên kế hoạch hẹn hò lãng mạn cùng em nhé!"`
                        : partnerPhase === 'Kinh nguyệt'
                        ? `"Người ấy đang trong kỳ kinh nguyệt, cơ thể nhạy cảm và mỏi mệt. Hãy pha trà ấm, chuẩn bị túi chườm để bên em."`
                        : `"Hãy duy trì giao tiếp nhẹ nhàng và dành thời gian chất lượng chất lượng bên bạn đời hôm nay."`
                    ) : (
                      `"Bắt đầu kết nối với bạn đời để nhận các chỉ dẫn tâm lý y học cá nhân hóa cho mối quan hệ của bạn."`
                    )}
                  </p>
                </div>
                
                <button onClick={() => setPanel('chat')} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors mt-auto relative z-10 w-fit">
                  Hỏi Hi AI thêm <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {/* ── 4. Weekly activity chart ── */}
              <div className="lg:col-span-5 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">bar_chart</span>
                    Hoạt động tuần này
                  </h3>
                  <select className="bg-gray-50 border-none text-xs font-bold rounded-lg py-1 px-3 text-slate-600 cursor-pointer hover:bg-gray-100 outline-none">
                    <option>7 ngày qua</option>
                    <option>30 ngày qua</option>
                  </select>
                </div>
                
                <div className="h-36 w-full flex items-end justify-between gap-2 px-2">
                  {getActivityBars().map(({ day, h, cls, active }) => (
                    <div key={day} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                      <div className={`relative w-full bg-slate-50 border border-slate-100 rounded-t-xl rounded-b-sm h-28 flex items-end overflow-hidden ${active ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                        <div className={`w-full ${cls} transition-all duration-500 rounded-t-xl`} style={{ height: h }} />
                      </div>
                      <span className={`text-[10px] font-bold text-center ${active ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 5. Partner cycle mini calendar ── */}
              <div className="lg:col-span-4 bg-blue-50/40 rounded-3xl p-6 shadow-sm border border-blue-100/70 flex flex-col justify-between">
                {(() => {
                  const { cells, monthName } = buildMonthCalendar(partnerCycle);
                  return (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                          <span className="material-symbols-outlined text-blue-500 text-[20px]">calendar_month</span>
                          Lịch chu kỳ {hasPartner ? partnerName : ''}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">{monthName}</span>
                      </div>
                      
                      {!hasPartner ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center py-6 gap-2">
                          <span className="material-symbols-outlined text-slate-300 text-3xl">calendar_today</span>
                          <p className="text-xs text-slate-400 leading-relaxed px-4">Kết nối đối tác để xem dự báo lịch chu kỳ tháng này</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-7 gap-1 text-center mb-3">
                            {['T2','T3','T4','T5','T6','T7','CN'].map((d, i) => (
                              <div key={i} className="text-[9px] uppercase font-black text-slate-400 mb-1">{d}</div>
                            ))}
                            {cells.map((cell, i) => (
                              <div key={i}
                                className={`h-7 flex items-center justify-center rounded-lg text-xs font-semibold relative
                                  ${!cell.day ? '' :
                                    cell.isToday ? 'font-black text-white shadow-sm' :
                                    cell.isPeriod ? 'text-rose-700 bg-rose-50 border border-rose-100' :
                                    cell.isOvulation ? 'text-pink-800 bg-pink-50 border border-pink-100' :
                                    cell.isFertile ? 'text-purple-700 bg-purple-50/80 border border-purple-100' :
                                    'text-slate-500'}`}
                                style={cell.isToday ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)' } : undefined}
                              >
                                {cell.day ?? ''}
                                {cell.isOvulation && <span className="absolute bottom-0.5 size-1 rounded-full bg-pink-500" />}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 justify-center flex-wrap pt-2 border-t border-blue-100/50">
                            <div className="flex items-center gap-1"><span className="size-2 rounded bg-rose-100 border border-rose-200" /> Kinh nguyệt</div>
                            <div className="flex items-center gap-1"><span className="size-2 rounded bg-pink-100 border border-pink-200" /> Rụng trứng</div>
                            <div className="flex items-center gap-1"><span className="size-2 rounded bg-purple-50 border border-purple-100" /> Thụ thai</div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* ── 6. Ask Hi AI gợi ý câu hỏi ── */}
            <div className="md:col-span-4 bg-white/90 backdrop-blur-sm rounded-3xl p-7 shadow-sm border border-white/80">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-[22px]">contact_support</span>
                  Gợi ý hỏi Hi AI
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 ml-7">AI đề xuất các chủ đề giúp bạn thấu hiểu bạn đời</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MALE_AI_CHIPS.map((q) => (
                  <button key={q} onClick={() => { setChatInput(q); setPanel('chat'); }}
                    className="group p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/40 border border-slate-100 hover:border-blue-100 transition-all cursor-pointer text-left w-full shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors text-xs leading-relaxed">{q}</h4>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-400 transition-colors text-[16px] flex-shrink-0 mt-0.5">arrow_outward</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setPanel('chat')} className="w-full mt-5 py-3 border-2 border-dashed border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 rounded-xl font-bold text-sm bg-white hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-base">chat</span>
                Mở Hi AI Chat đầy đủ
              </button>
            </div>

            {/* ── 7. Upgrade Premium Plans (4 cols) ── */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative bg-white/80 backdrop-blur-sm border border-blue-100/50 p-6 shadow-sm">
              <PricingCard />
            </div>

          </div>
        </main>

        <footer className="bg-white/60 border-t border-white/40 py-6 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <p>© 2025 Hi Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-blue-500 transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-blue-500 transition-colors cursor-pointer">Help Center</span>
              <Link to="/male-settings/notifications" className="hover:text-blue-500 transition-colors">Settings</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ Panels ═══ */}

      {/* Panel 1: Health Log */}
      <Panel open={panel === 'health'} onClose={close} title="Nhật ký sức khỏe" icon="fitness_center" iconBg="bg-blue-100 text-blue-500">
        <div style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0e7ff 100%)' }}>

          {/* Energy */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">⚡ Mức năng lượng</label>
              <span className="text-sm font-extrabold text-blue-500">{health.energyLevel}%</span>
            </div>
            <input type="range" min={0} max={100} value={health.energyLevel}
              onChange={e => setHealth(p => ({ ...p, energyLevel: +e.target.value }))}
              className="w-full h-2 rounded-full cursor-pointer appearance-none" style={{ accentColor: '#3b82f6' }} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Kiệt sức</span><span>Tràn năng lượng</span></div>
          </div>

          {/* Sleep */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">🌙 Giờ ngủ</label>
              <span className="text-sm font-extrabold text-indigo-500">{health.sleepHours}h</span>
            </div>
            <input type="range" min={4} max={10} step={0.5} value={health.sleepHours}
              onChange={e => setHealth(p => ({ ...p, sleepHours: +e.target.value }))}
              className="w-full h-2 rounded-full cursor-pointer appearance-none" style={{ accentColor: '#6366f1' }} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>4h</span><span>10h</span></div>
          </div>

          {/* Stress */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">🧠 Mức căng thẳng</label>
              <span className="text-sm font-extrabold text-cyan-500">{['','Rất thấp','Thấp','Trung bình','Cao','Rất cao'][health.stressLevel]}</span>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => setHealth(p => ({ ...p, stressLevel: v }))}
                  className="flex-1 h-3 rounded-full transition-all duration-300"
                  style={{ background: v <= health.stressLevel ? 'linear-gradient(90deg,#67e8f9,#22d3ee)' : '#e2e8f0', transform: v === health.stressLevel ? 'scaleY(1.4)' : 'scaleY(1)' }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Rất thấp</span><span>Rất cao</span></div>
          </div>

          {/* Workout */}
          <div className="px-6 py-4 border-b border-blue-50">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-3">🏋️ Hôm nay có tập luyện không?</p>
            <div className="flex gap-3">
              {(['Có rồi! 💪', 'Chưa, bận quá'] as const).map((label, i) => (
                <button key={label} onClick={() => setHealth(p => ({ ...p, workoutDone: i === 0 }))}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2"
                  style={health.workoutDone === (i === 0)
                    ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }
                    : { background: 'white', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="px-6 py-6">
            <button onClick={saveHealth}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 text-white"
              style={{ background: healthSaved ? '#22c55e' : 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: healthSaved ? 'none' : '0 8px 24px rgba(59,130,246,0.35)' }}>
              <span className="material-symbols-outlined">{healthSaved ? 'check_circle' : 'save'}</span>
              {healthSaved ? 'Đã lưu!' : 'Lưu nhật ký'}
            </button>
          </div>
        </div>
      </Panel>

      {/* Panel 2: Mood detail */}
      <Panel open={panel === 'mood'} onClose={close} title="Nhật ký tâm trạng" icon="edit_note" iconBg="bg-indigo-100 text-indigo-500">
        <div style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0e7ff 100%)' }}>
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Hôm nay</p>
              <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            {selectedMoods.size > 0 && (
              <div className="px-3 py-1.5 rounded-full text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                {selectedMoods.size} trạng thái
              </div>
            )}
          </div>

          <div className="px-5 py-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Cảm xúc hôm nay</p>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map(({ id, emoji, label, bg, selBg, ring }) => {
                const active = selectedMoods.has(id);
                return (
                  <button key={id} onClick={() => toggleMood(id)}
                    className="flex flex-col items-center py-5 rounded-2xl transition-all duration-200 border-2"
                    style={{ background: active ? selBg : bg, borderColor: active ? ring : 'transparent', boxShadow: active ? `0 8px 20px ${ring}55` : '0 2px 8px rgba(0,0,0,0.06)', transform: active ? 'scale(1.05)' : 'scale(1)' }}>
                    <span className="text-3xl mb-1">{emoji}</span>
                    <span className={`text-xs font-bold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📝</span>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Ghi chú</span>
              </div>
              <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                placeholder="Hôm nay bạn nghĩ gì? Sự kiện nổi bật..."
                rows={3} className="w-full text-sm text-slate-700 resize-none outline-none bg-transparent placeholder-blue-200 leading-relaxed" />
            </div>
          </div>

          <div className="px-5 pb-8">
            <button onClick={saveMood}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: moodSaved ? '#22c55e' : 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: moodSaved ? 'none' : '0 10px 28px rgba(59,130,246,0.40)' }}>
              <span className="material-symbols-outlined">{moodSaved ? 'check_circle' : 'save'}</span>
              {moodSaved ? 'Đã lưu! 💙' : 'Lưu tâm trạng'}
            </button>
          </div>
        </div>
      </Panel>

      {/* Panel 3: AI Chat */}
      <Panel open={panel === 'chat'} onClose={close} title="Hi AI Chat" icon="auto_awesome" iconBg="bg-blue-100 text-blue-500">
        <div className="flex flex-col h-full">
          {/* AI strip */}
          <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">Hi AI 💙</p>
                <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />Sẵn sàng trò chuyện
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Người ấy</p>
              <p className="text-[10px] font-bold text-pink-400">{partnerPhase} · Ngày {partnerDay}</p>
            </div>
          </div>

          {/* Chips */}
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', borderBottom: '1px solid #dbeafe' }}>
            {MALE_AI_CHIPS.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#dbeafe,#e0e7ff)', color: '#3730a3', border: '1px solid #c7d2fe' }}>
                ✨ {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0" style={{ background: 'linear-gradient(160deg,#f8fbff 0%,#eef2ff 100%)' }}>
            {messages.length === 0 && !sendChatMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <span className="material-symbols-outlined text-white text-[22px]">auto_awesome</span>
                </div>
                <p className="font-extrabold text-slate-800">Bắt đầu trò chuyện với Hi AI</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Tin nhắn sẽ được lấy từ hệ thống AI và lưu vào lịch sử thật của bạn.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg._id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                    <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                  </div>
                )}
                <div className="max-w-[75%] px-4 py-3 text-sm font-medium leading-relaxed rounded-2xl"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#1e3a5f,#312e81)', color: '#dbeafe',
                    borderBottomRightRadius: 4, boxShadow: '0 4px 14px rgba(30,58,95,0.30)',
                  } : {
                    background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', color: '#1e3a8a',
                    borderBottomLeftRadius: 4, boxShadow: '0 4px 14px rgba(59,130,246,0.12)',
                  }}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex-shrink-0 flex items-center justify-center border border-blue-200">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">person</span>
                  </div>
                )}
              </div>
            ))}
            {sendChatMutation.isPending && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                </div>
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', borderBottomLeftRadius: 4 }}>
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#60a5fa', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottom} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 flex-shrink-0 border-t border-blue-50" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
            <div className="flex gap-3 items-end p-1 rounded-2xl border-2 border-blue-200/60 bg-white/80 backdrop-blur-sm">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Nhập câu hỏi..." rows={1}
                className="flex-1 px-3 py-2 text-sm text-slate-700 resize-none outline-none bg-transparent placeholder-blue-300 leading-relaxed max-h-24" />
              <button onClick={() => sendMessage()} disabled={!chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0 mb-0.5 mr-0.5"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: chatInput.trim() ? '0 4px 12px rgba(59,130,246,0.35)' : 'none' }}>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
