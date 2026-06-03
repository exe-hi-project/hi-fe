 import { useState, useRef, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import PageBackdrop from '../components/layout/PageBackdrop';
import SiteFooter from '../components/layout/SiteFooter';
import HealthVideoSection from '../components/health/HealthVideoSection';
import QuickMoodCard from '../components/health/QuickMoodCard';
import CyclePreviewCalendar from '../components/cycles/CyclePreviewCalendar';
import api from '../lib/api';
import { ChatMessage } from '../types';
import PricingCard from '../components/PricingCard';
import type { CycleInsights, CycleRecord } from '../types/shared';
import { CYCLE_DAY_CLASSES, getCycleDayKind } from '../utils/cycleCalendar';

function toLocalDate(value?: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
}

function formatShortDate(value?: string | null) {
  const date = toLocalDate(value);
  return date ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--';
}

function formatDateRange(start?: string | null, end?: string | null) {
  return `${formatShortDate(start)}${end ? ` - ${formatShortDate(end)}` : ''}`;
}

function moodLabel(score?: number | null) {
  if (!score) return 'Chưa gửi cảm xúc hôm nay';
  if (score >= 5) return 'Vui vẻ';
  if (score === 4) return 'Bình tĩnh';
  if (score === 3) return 'Bình thường';
  if (score === 2) return 'Lo lắng hoặc mệt mỏi';
  return 'Bực bội';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (hour < 18) return { text: 'Chào buổi chiều', icon: 'light_mode' };
  return { text: 'Chào buổi tối', icon: 'dark_mode' };
}

function getCareTips(phase: string) {
  const normalized = phase.toLowerCase();
  if (normalized.includes('kinh')) {
    return ['Pha cho em ly trà ấm nhé', 'Nhắc em nghỉ ngơi nhiều hơn', 'Hỏi em có cần túi chườm không'];
  }
  if (normalized.includes('rụng')) {
    return ['Cùng em vận động nhẹ nhàng', 'Lên kế hoạch hẹn hò thư giãn', 'Giữ nhịp trò chuyện dịu dàng'];
  }
  return ['Lắng nghe cảm xúc của Người ấy', 'Cùng lên lịch sinh hoạt lành mạnh', 'Gửi một lời nhắn quan tâm'];
}

function getActivityBars() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const today = (new Date().getDay() + 6) % 7;
  return days.map((day, index) => ({
    day,
    h: index === today ? '76%' : index < today ? `${30 + index * 8}%` : '18%',
    cls: index === today ? 'bg-blue-400' : index < today ? 'bg-indigo-200' : 'bg-slate-100',
    active: index === today,
  }));
}

function buildMonthCalendar(
  partnerCycles: CycleRecord[],
  partnerInsights: CycleInsights | null,
): { cells: Array<{ day: number | null; isToday: boolean; kind: keyof typeof CYCLE_DAY_CLASSES | null }>; monthName: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthName = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const cells: Array<{ day: number | null; isToday: boolean; kind: keyof typeof CYCLE_DAY_CLASSES | null }> = [];

  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, isToday: false, kind: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({
      day,
      isToday: day === now.getDate(),
      kind: getCycleDayKind(date, partnerCycles, partnerInsights),
    });
  }

  return { cells, monthName };
}


const MALE_AI_CHIPS = ['Hôm nay nên làm gì?', 'Tips chăm người ấy?', 'Người ấy đang ở phase nào?', 'Cách giảm stress?'];

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
  const queryClient = useQueryClient();

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const greeting = getGreeting();

  /* ── Partner cycle query ── */
  const partnerQuery = useQuery({
    queryKey: ['partner-cycles'],
    queryFn: async () => {
      const { data } = await api.get('/users/partner-cycles', { params: { historyLimit: 20 } });
      return data as {
        success: boolean;
        cycles: CycleRecord[];
        history?: CycleRecord[];
        insights?: CycleInsights | null;
        latestMood?: number | null;
        latestDailyLogDate?: string | null;
        partner?: { id?: string; name?: string; avatar?: string };
      };
    },
    enabled: !!user,
  });
  const partnerCycles = partnerQuery.data?.cycles ?? [];
  const partnerHistory = partnerQuery.data?.history ?? partnerCycles.slice(0, 8);
  const partnerCycle = partnerCycles[0] ?? null;
  const partnerInsights = partnerQuery.data?.insights ?? null;
  const partnerName  = partnerQuery.data?.partner?.name ?? 'Người ấy';
  const partnerPhase = partnerInsights?.estimatedPhase ?? partnerInsights?.currentPhase ?? '—';
  const partnerDay   = partnerInsights?.confirmedPeriodDay ?? partnerInsights?.estimatedCycleDay ?? 0;
  const partnerCycleLen = Math.round(partnerInsights?.averageCycleLength ?? partnerCycle?.cycleLength ?? 28);
  const partnerPeriodLen = Math.round(partnerInsights?.averagePeriodLength ?? partnerCycle?.periodLength ?? 5);
  const partnerPeriodStatus = partnerInsights?.periodStatus ?? 'UPCOMING';
  const partnerRingValue = partnerPeriodStatus === 'CONFIRMED'
    ? partnerInsights?.confirmedPeriodDay ?? partnerDay ?? '--'
    : partnerPeriodStatus === 'UPCOMING'
      ? partnerInsights?.daysUntilEstimatedPeriod ?? '--'
      : partnerPeriodStatus === 'PREDICTED'
        ? partnerInsights?.estimatedPeriodDay ?? '--'
        : partnerInsights?.periodDelayDays ?? '--';
  const partnerRingEyebrow = partnerPeriodStatus === 'CONFIRMED'
    ? 'Ngày kinh nguyệt'
    : partnerPeriodStatus === 'UPCOMING'
      ? 'Còn'
      : partnerPeriodStatus === 'PREDICTED'
        ? 'Ngày dự kiến'
        : 'Đã trễ';
  const partnerRingCaption = partnerPeriodStatus === 'CONFIRMED'
    ? 'Đã ghi nhận'
    : partnerPeriodStatus === 'UPCOMING'
      ? 'ngày nữa tới kỳ'
      : partnerPeriodStatus === 'PREDICTED'
        ? 'Kỳ kinh ước tính'
        : 'ngày chưa ghi nhận';
  const partnerRingStroke = partnerPeriodStatus === 'DELAYED' ? '#94a3b8' : partnerPeriodStatus === 'UPCOMING' ? '#93c5fd' : '#f472b6';
  const partnerFertilityLabel = partnerInsights?.fertilityStatus === 'HIGH'
    ? 'Cao'
    : partnerInsights?.fertilityStatus === 'LOW'
      ? 'Thấp'
      : 'Chưa đủ dữ liệu';
  const partnerConfidenceLabel = partnerInsights?.predictionConfidence === 'HIGH'
    ? 'Cao'
    : partnerInsights?.predictionConfidence === 'MEDIUM'
      ? 'Trung bình'
      : 'Đang học dữ liệu';
  const hasPartner   = !!partnerQuery.data?.partner || !!user?.partnerId;
  const latestMoodLabel = moodLabel(partnerQuery.data?.latestMood ?? null);

  const careTips = getCareTips(partnerPhase);

  /* ── Panels ── */
  type PanelId = 'chat' | null;
  const [panel, setPanel] = useState<PanelId>(null);
  const close = () => setPanel(null);

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
  const partnerStatusLabel = partnerPeriodStatus === 'CONFIRMED' ? 'Đang trong kỳ kinh' : `Ước tính ${partnerPhase.toLowerCase()}`;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden relative font-sans bg-[#f5fbff]">
      <PageBackdrop variant="male" />

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
                <span>{firstName}</span>                <span className="font-normal text-slate-400">,</span>
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
                    <h3 className="text-lg font-bold text-slate-800">Sức khỏe của {hasPartner ? partnerName : 'Người ấy'}</h3>
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
                <div className="relative z-10 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative size-52 flex-shrink-0">
                      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#fce7f3" strokeWidth="8" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={partnerRingStroke}
                          strokeWidth="8"
                          strokeDasharray={circumference}
                          strokeDashoffset={partnerDay > 0 ? circumference * (1 - Math.min(partnerDay / partnerCycleLen, 1)) : circumference}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{partnerRingEyebrow}</span>
                        <span className="text-5xl font-extrabold text-slate-900">{partnerRingValue}</span>
                        <span className="mt-1 text-sm font-extrabold text-slate-500">{partnerRingCaption}</span>
                        <span className="mt-1 text-[11px] font-bold text-pink-500">{partnerPhase}</span>
                      </div>
                    </div>
                    <Link to="/male-settings/notifications" className="text-xs font-bold text-blue-500 hover:text-blue-600">
                      Dữ liệu đồng bộ từ Người ấy
                    </Link>
                  </div>

                  <div className="w-full space-y-4">
                    <CyclePreviewCalendar cycles={partnerCycles} insights={partnerInsights} />

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">{partnerPeriodLen} ngày kinh trung bình</span>
                      <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">Tin cậy: {partnerConfidenceLabel}</span>
                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">
                        Rụng trứng ước tính: {formatDateRange(partnerInsights?.estimatedOvulationDate ?? null, null)}
                      </span>
                      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700">
                        Khả năng thụ thai ước tính: {partnerFertilityLabel}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-pink-100 p-4" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-pink-500">
                        <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
                        Gợi ý chăm sóc hôm nay
                      </p>
                      <ul className="space-y-1.5">
                        {careTips.map((tip, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink-400" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-xs font-semibold text-slate-500">
                      Dự đoán chỉ mang tính tham khảo, không thay thế tư vấn y khoa hoặc biện pháp tránh thai.
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
                        Kết nối tài khoản giúp bạn cập nhật tự động chu kỳ kinh nguyệt của người ấy, nhận cảnh báo tâm lý và những lời khuyên y học hữu ích từ AI.
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
                      Kết nối với người ấy ngay
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. Người ấy + quick mood (1 col) ── */}
            <aside className="md:col-span-1 space-y-5">
              <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-6 shadow-sm backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-extrabold text-slate-800">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">favorite</span>
                    Người ấy
                  </h3>
                  <span className={`h-2.5 w-2.5 rounded-full ${hasPartner ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>

                {hasPartner ? (
                  <div className="text-center">
                    <div className="relative mx-auto mb-3 size-20 rounded-full border-4 border-white bg-gradient-to-br from-blue-200 to-violet-200 shadow-md">
                      <span className="material-symbols-outlined flex h-full items-center justify-center text-4xl text-white">person</span>
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900">{partnerName}</h4>
                    <p className="text-xs font-semibold text-slate-400">Đã kết nối</p>
                    <div className="mt-4 rounded-2xl border border-white bg-white/80 p-3.5 text-left shadow-sm">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Cảm xúc mới nhất</p>
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-500">emoji_emotions</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{latestMoodLabel}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {partnerQuery.data?.latestDailyLogDate ? `Cập nhật ${formatShortDate(partnerQuery.data.latestDailyLogDate)}` : 'Chưa có cập nhật cảm xúc'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                      <span className="material-symbols-outlined text-4xl text-blue-300">person_add</span>
                    </div>
                    <p className="text-sm text-slate-500">Chưa kết nối với ai</p>
                    <Link to="/male-settings/notifications" className="text-xs font-bold text-blue-500 hover:underline">
                      Kết nối ngay →
                    </Link>
                  </div>
                )}

                <button
                  onClick={() => setPanel('chat')}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white py-2.5 text-sm font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-50"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Gửi lời nhắn
                </button>
              </div>

              <QuickMoodCard
                accent="blue"
                sendToPartner={hasPartner}
                className="border-blue-100/80 bg-white/90"
              />
            </aside>

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
                        ? '"Người ấy đang trong kỳ kinh nguyệt, cơ thể nhạy cảm và mỏi mệt. Hãy pha trà ấm, chuẩn bị túi chườm để bên em."'
                        : '"Hãy duy trì giao tiếp nhẹ nhàng và dành thời gian chất lượng bên người ấy hôm nay."'
                    ) : (
                      '"Bắt đầu kết nối với người ấy để nhận các chỉ dẫn tâm lý y học cá nhân hóa cho mối quan hệ của bạn."'
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
              {/* Partner cycle mini calendar */}
              <div className="lg:col-span-4 bg-blue-50/40 rounded-3xl p-6 shadow-sm border border-blue-100/70 flex flex-col justify-between">
                {(() => {
                  const { cells, monthName } = buildMonthCalendar(partnerCycles, partnerInsights);
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
                          <p className="text-xs text-slate-400 leading-relaxed px-4">Kết nối Người ấy để xem dự báo lịch chu kỳ tháng này</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-7 gap-1 text-center mb-3">
                            {['T2','T3','T4','T5','T6','T7','CN'].map((d, i) => (
                              <div key={i} className="text-[9px] uppercase font-black text-slate-400 mb-1">{d}</div>
                            ))}
                            {cells.map((cell, i) => (
                              <div
                                key={i}
                                className={`h-7 flex items-center justify-center rounded-lg text-xs font-semibold relative ${
                                  !cell.day
                                    ? ''
                                    : cell.isToday
                                      ? 'font-black text-white shadow-sm'
                                      : cell.kind
                                        ? CYCLE_DAY_CLASSES[cell.kind]
                                        : 'text-slate-500'
                                }`}
                                style={cell.isToday ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)' } : undefined}
                              >
                                {cell.day ?? ''}
                                {cell.kind === 'ovulation' && <span className="absolute bottom-0.5 size-1 rounded-full bg-sky-500" />}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 justify-center flex-wrap pt-2 border-t border-blue-100/50">
                            <div className="flex items-center gap-1"><span className="size-2 rounded bg-rose-100 border border-rose-200" /> Kinh nguy?t</div>
                            <div className="flex items-center gap-1"><span className="size-2 rounded border border-dashed border-rose-300" /> Dự kiến</div>
                            <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-200 border border-sky-300" /> Rụng trứng</div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

              <div className="md:col-span-4 rounded-3xl border border-blue-100/70 bg-white/90 p-7 shadow-sm backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Sắp phát triển</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">Hoàn thiện sức khỏe của tôi</h3>
                  <p className="mt-1 text-sm text-slate-500">Các module này giúp dashboard nam bớt chỉ là “người xem chu kỳ” và trở thành nhật ký sức khỏe thật sự.</p>
                </div>
                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">MVP roadmap</span>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ['Giấc ngủ', 'Theo dõi giờ ngủ, chất lượng ngủ và tác động tới năng lượng.'],
                  ['Stress', 'Ghi mức căng thẳng, trigger và gợi ý thở/nghỉ ngắn.'],
                  ['Lối sống sinh sản', 'Checklist vận động, rượu bia, thuốc lá, nước và dinh dưỡng.'],
                  ['Triệu chứng nam', 'Ghi đau, mệt, ham muốn, ghi chú riêng tư theo ngày.'],
                  ['Báo cáo AI', 'Tổng hợp xu hướng tuần/tháng và lời khuyên cá nhân hóa.'],
                ].map(([title, desc]) => (
                  <article key={title} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
                    <p className="text-sm font-extrabold text-slate-800">{title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{desc}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 rounded-3xl border border-blue-100/70 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Theo dõi chu kỳ</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">Lịch sử chu kỳ của Người ấy</h3>
                  <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị các kỳ đã được Người ấy xác nhận. Ngày dự đoán vẫn là thông tin tham khảo.</p>
                </div>
                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                  {partnerHistory.length} kỳ đã ghi
                </span>
              </div>

              {!hasPartner ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center text-sm font-semibold text-slate-500">
                  Kết nối Người ấy để xem lịch sử chu kỳ được chia sẻ.
                </div>
              ) : partnerHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-semibold text-slate-500">
                  Người ấy chưa có dữ liệu chu kỳ đã xác nhận.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {partnerHistory.slice(0, 8).map((record) => (
                    <article key={record._id ?? record.startDate} className="rounded-2xl border border-blue-50 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">Đã ghi nhận</span>
                      </div>
                      <p className="text-base font-extrabold text-slate-900">{formatDateRange(record.startDate, record.endDate)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {record.periodLength ?? partnerPeriodLen} ngày kinh · {record.cycleLength ?? partnerCycleLen} ngày chu kỳ
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <HealthVideoSection />

            {/* ── 7. Upgrade Premium Plans (4 cols) ── */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative bg-white/80 backdrop-blur-sm border border-blue-100/50 p-6 shadow-sm">
              <PricingCard />
            </div>

          </div>
        </main>

        <SiteFooter tone="blue" />
      </div>

      {/* ═══ Panels ═══ */}

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
