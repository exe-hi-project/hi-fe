import { useState, useRef, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../hooks/useSubscription';
import Navbar from '../components/layout/Navbar';
import CycleHistoryDrawer from '../components/cycles/CycleHistoryDrawer';
import DailyLogModal, { type DailyLogMode } from '../components/health/DailyLogModal';
import api from '../lib/api';
import { ChatMessage } from '../types';
import PricingCard from '../components/PricingCard';
import type { CycleInsights, CycleRecord } from '../types/shared';

/* ─── types & helpers ───────────────────────────────── */
interface PartnerCyclesResponse {
  success: boolean;
  insights?: CycleInsights | null;
  cycles?: CycleRecord[];
  partner?: {
    id?: string;
    name?: string;
    avatar?: string;
    gender?: string;
  };
}

/* ─── greeting helpers ──────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (h < 18) return { text: 'Chào buổi chiều', icon: 'partly_cloudy_day' };
  return { text: 'Chào buổi tối', icon: 'nightlight' };
}

/* ─── static data ───────────────────────────────────── */
function getWeekBars() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  return days.map((day, i) => ({
    day,
    h: i === todayIndex ? '70%' : i < todayIndex ? '20%' : '0%',
    cls: i === todayIndex ? 'bg-pink-400' : i < todayIndex ? 'bg-purple-200' : 'bg-gray-100',
    active: i === todayIndex,
  }));
}

const AI_CHIPS = ['Hôm nay nên ăn gì?', 'Tại sao tôi hay cáu?', '😣 Giảm đau bụng ngay?', 'Khi nào kỳ kinh tới?'];

function toLocalDate(value?: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
}

function formatShortDate(value?: string | null) {
  const date = toLocalDate(value);
  return date ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--';
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return '--';
  return `${formatShortDate(start)}${end ? ` - ${formatShortDate(end)}` : ''}`;
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCurrentWeekDates() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
}

function dateIsWithin(date: string, start?: string | null, end?: string | null) {
  return !!start && date >= start.slice(0, 10) && date <= (end?.slice(0, 10) ?? start.slice(0, 10));
}

function getLocalCalendarDayDifference(target?: string | null, origin = new Date()) {
  if (!target) return null;
  const targetDate = toLocalDate(target);
  if (!targetDate) return null;
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const originUtc = Date.UTC(origin.getFullYear(), origin.getMonth(), origin.getDate());
  return Math.round((targetUtc - originUtc) / 86_400_000);
}

/* ─── Panel drawer ──────────────────────────────────── */
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
      <div onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <div className={`fixed top-0 right-0 h-full z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-slate-500 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

/* ─── Main component ─────────────────────────────────── */
export default function FemaleDashboardPage() {
  const { user } = useAuthStore();
  const { data: subscription } = useSubscription();
  const isPremium = (subscription?.plan && ['premium', 'monthly', 'yearly', 'premium_monthly', 'premium_yearly'].includes(subscription.plan)) && subscription?.status === 'active';
  const planLabel = subscription?.plan && subscription.plan.includes('yearly') ? 'Premium Năm' : subscription?.plan && subscription.plan.includes('monthly') ? 'Premium Tháng' : 'Free';
  const hasPartner = !!user?.partnerId;

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const greeting  = getGreeting();

  /* ── Cycle query ── */
  const queryClient = useQueryClient();
  const cycleQuery = useQuery({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycle-records').then(({ data }) => ({
      success: true,
      cycles: (data.cycleRecords ?? []) as CycleRecord[],
    })),
  });

  const insightsQuery = useQuery({
    queryKey: ['cycle-insights'],
    queryFn: async () => {
      const { data } = await api.get('/cycle-records/insights');
      return data as { success: boolean; insights: CycleInsights };
    },
  });
  const latestCycle = cycleQuery.data?.cycles?.[0] ?? null;
  const insights = insightsQuery.data?.insights;

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles'],
    queryFn: async () => {
      const { data } = await api.get('/users/partner-cycles');
      return data as PartnerCyclesResponse;
    },
    enabled: hasPartner,
  });
  const partnerName = partnerQuery.data?.partner?.name ?? 'Bạn đời';
  const periodStatus = insights?.periodStatus ?? 'UPCOMING';
  const confirmedPeriodDay = insights?.confirmedPeriodDay ?? null;
  const phase = insights?.estimatedPhase ?? '—';
  const estimatedPeriodStartDate = insights?.estimatedPeriodStartDate ?? insights?.estimatedNextStartDate;
  const estimatedPeriodEndDate = insights?.estimatedPeriodEndDate ?? insights?.estimatedNextEndDate;
  const fallbackDaysUntilEstimatedPeriod = getLocalCalendarDayDifference(estimatedPeriodStartDate);
  const daysUntilEstimatedPeriod = insights?.daysUntilEstimatedPeriod
    ?? (fallbackDaysUntilEstimatedPeriod !== null ? Math.max(fallbackDaysUntilEstimatedPeriod, 0) : null);
  const fallbackEstimatedPeriodDay = getLocalCalendarDayDifference(estimatedPeriodStartDate) ?? 0;
  const estimatedPeriodDay = insights?.estimatedPeriodDay
    ?? (periodStatus === 'PREDICTED' ? Math.max(-fallbackEstimatedPeriodDay + 1, 1) : null);
  const cycleLen       = Math.round(insights?.averageCycleLength ?? latestCycle?.cycleLength ?? 28);
  const periodLen      = Math.round(insights?.averagePeriodLength ?? latestCycle?.periodLength ?? 5);
  const confidenceLabel = insights?.predictionConfidence === 'HIGH'
    ? 'Cao'
    : insights?.predictionConfidence === 'MEDIUM'
      ? 'Trung bình'
      : 'Đang học dữ liệu';
  const circumference = 251.2;
  const ringProgress = !latestCycle
    ? 0
    : periodStatus === 'CONFIRMED'
      ? Math.min((confirmedPeriodDay ?? 0) / Math.max(periodLen, 1), 1)
      : periodStatus === 'UPCOMING'
        ? Math.min(Math.max((cycleLen - (daysUntilEstimatedPeriod ?? cycleLen)) / Math.max(cycleLen, 1), 0), 1)
        : 1;
  const dashoffset = circumference - ringProgress * circumference;
  const ringValue = !latestCycle
    ? '--'
    : periodStatus === 'CONFIRMED'
      ? confirmedPeriodDay ?? '--'
      : periodStatus === 'UPCOMING'
        ? daysUntilEstimatedPeriod ?? '--'
        : periodStatus === 'PREDICTED'
          ? estimatedPeriodDay ?? '--'
          : insights?.periodDelayDays ?? '--';
  const ringEyebrow = !latestCycle
    ? 'Chưa có dữ liệu'
    : periodStatus === 'CONFIRMED'
      ? 'Ngày kinh nguyệt'
      : periodStatus === 'UPCOMING'
        ? 'Còn'
        : periodStatus === 'PREDICTED'
          ? 'Ngày dự kiến'
          : 'Đã trễ';
  const ringCaption = !latestCycle
    ? 'Thêm kỳ gần nhất'
    : periodStatus === 'CONFIRMED'
      ? 'Đã ghi nhận'
      : periodStatus === 'UPCOMING'
        ? 'ngày nữa tới kỳ'
        : periodStatus === 'PREDICTED'
          ? 'Kỳ kinh ước tính'
          : 'ngày chưa ghi nhận';
  const ringStroke = periodStatus === 'DELAYED' ? '#94a3b8' : periodStatus === 'UPCOMING' ? '#c4b5fd' : '#f472b6';
  const cycleContextLabel = !latestCycle
    ? 'Chưa có dữ liệu'
    : periodStatus === 'CONFIRMED'
      ? `Ngày ${confirmedPeriodDay} kỳ kinh`
      : periodStatus === 'DELAYED'
        ? `Trễ ${insights?.periodDelayDays ?? 0} ngày`
        : `Ước tính ${phase.toLowerCase()}`;
  const today = new Date();
  const currentWeekDates = getCurrentWeekDates();
  const monthLabel = today.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  /* ── Panel state ── */
  type PanelId = 'chat' | null;
  const [panel, setPanel] = useState<PanelId>(null);
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [dailyLogMode, setDailyLogMode] = useState<DailyLogMode>('default');
  const close = () => setPanel(null);
  const closeDailyLog = () => {
    setDailyLogOpen(false);
    setDailyLogMode('default');
  };
  const openSymptoms = (mode: DailyLogMode = 'default') => {
    setDailyLogMode(mode);
    setDailyLogOpen(true);
  };

  /* ── Cycle history drawer ── */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState<CycleRecord | null>(null);
  const openCycleHistory = (record: CycleRecord | null = null) => {
    setEditingHistoryRecord(record);
    setHistoryOpen(true);
  };
  const refreshCycleData = () => {
    queryClient.invalidateQueries({ queryKey: ['cycles'] });
    queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
  };

  /* ── Chat state ── */
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

  if (user?.gender !== 'female') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#f8f6f7] overflow-x-hidden relative font-sans">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-pink-200/40  w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-yellow-100/50 w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-blue-100/30  w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Navbar ── */}
        <Navbar />

        {/* ── Main ── */}
        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto w-full">

          {/* Greeting row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                <span>{firstName}</span>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                    💎 {planLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    🍀 Free
                  </span>
                )}
                <span className="font-normal text-slate-400">,</span>
                <span
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(90deg, #e9638f, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  hôm nay bạn tỏa sáng! ✨
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-white/80">
              <span className="text-sm font-semibold text-slate-500">Dự báo hôm nay:</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">Năng lượng cao</span>
              <span className="px-3 py-1 rounded-lg bg-blue-100  text-blue-700  text-xs font-bold uppercase tracking-wide">Da đẹp</span>
            </div>
          </div>

          {/* ── Card grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ── 1. Cycle Status ── */}
            <div className="md:col-span-3 bg-white/90 backdrop-blur-sm rounded-3xl p-7 relative overflow-hidden shadow-sm border border-white/80">
              <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-pink-100 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-pink-400 text-[22px]">water_drop</span>
                    Trạng thái chu kỳ
                  </h3>
                  <p className="text-slate-400 text-sm">Cập nhật lúc 8:00 sáng nay</p>
                </div>
                <button
                  onClick={() => openCycleHistory(latestCycle)}
                  disabled={!latestCycle}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-pink-50 flex items-center justify-center text-slate-400 hover:text-pink-500 transition-colors"
                  aria-label="Sửa kỳ kinh gần nhất"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>

              <div className="relative z-10 space-y-5">
                  <div className="flex flex-col items-center gap-6 md:flex-row">
                    <div className="relative size-44 flex-shrink-0">
                      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={ringStroke} strokeWidth="8"
                          strokeDasharray={periodStatus === 'PREDICTED' ? '10 7' : circumference}
                          strokeDashoffset={dashoffset} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ringEyebrow}</span>
                        <span className="text-4xl font-extrabold text-slate-900">{ringValue}</span>
                        <span className={`mt-1 text-xs font-bold ${periodStatus === 'DELAYED' ? 'text-slate-500' : 'text-pink-500'}`}>{ringCaption}</span>
                      </div>
                    </div>

                    <div className="flex-1 rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm">
                          <div className="flex items-center gap-2 text-rose-500">
                            <span className="material-symbols-outlined text-[18px]">event_available</span>
                            <p className="text-[10px] font-black uppercase tracking-wide">Kỳ gần nhất</p>
                          </div>
                          <p className="mt-2 text-base font-extrabold text-slate-800">{formatDateRange(insights?.lastRecordedStartDate, insights?.lastRecordedEndDate)}</p>
                          <p className="mt-1 text-[11px] font-bold text-rose-500">{latestCycle ? 'Đã ghi nhận' : 'Chưa có dữ liệu'}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2 sm:flex-col">
                          <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                          <span className="whitespace-nowrap rounded-full border border-rose-100 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">{cycleLen} ngày</span>
                          <span className="h-px w-6 bg-rose-200 sm:h-6 sm:w-px" />
                        </div>
                        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-3.5">
                          <div className="flex items-center gap-2 text-rose-500">
                            <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                            <p className="text-[10px] font-black uppercase tracking-wide">Kỳ tiếp theo</p>
                          </div>
                          <p className="mt-2 text-base font-extrabold text-slate-800">{formatDateRange(estimatedPeriodStartDate, estimatedPeriodEndDate)}</p>
                          <p className="mt-1 text-[11px] font-bold text-rose-400">Ước tính</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm">{periodLen} ngày kinh trung bình</span>
                        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm">Tin cậy: {confidenceLabel}</span>
                        {(insights?.cycleCount ?? 0) < 3 && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">Cần thêm lịch sử</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-600">
                      {!latestCycle
                        ? 'Thêm kỳ gần nhất để bắt đầu nhận dự đoán chu kỳ.'
                        : periodStatus === 'UPCOMING'
                        ? `Kỳ tiếp theo dự kiến sau ${daysUntilEstimatedPeriod ?? '--'} ngày. Giai đoạn hiện tại: ước tính ${phase.toLowerCase()}.`
                        : periodStatus === 'CONFIRMED'
                          ? `Đã ghi nhận ngày ${confirmedPeriodDay} của kỳ kinh hiện tại.`
                          : periodStatus === 'PREDICTED'
                            ? 'Bạn đang ở trong cửa sổ kỳ kinh dự kiến. Chỉ xác nhận khi kỳ kinh thực sự bắt đầu.'
                            : 'Kỳ kinh chưa được ghi nhận sau ngày dự kiến. Hãy cập nhật khi kỳ kinh bắt đầu.'}
                    </p>
                    <span className="whitespace-nowrap font-bold text-rose-600">Dự đoán tham khảo</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button onClick={() => openSymptoms(periodStatus === 'CONFIRMED' ? 'default' : 'periodStart')} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
                      {periodStatus === 'CONFIRMED' ? 'Ghi triệu chứng hôm nay' : 'Bắt đầu kỳ hôm nay'}
                    </button>
                    <button onClick={() => openCycleHistory()} className="rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-500 hover:bg-pink-50">
                      Thêm lịch sử
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Ngày dự kiến chỉ là ước tính, không thay thế biện pháp tránh thai hoặc tư vấn y khoa.
                  </p>
              </div>
            </div>

            {/* ── 2. Partner card ── */}
            <div className="md:col-span-1 bg-gradient-to-b from-blue-50 to-white rounded-3xl p-6 shadow-sm border border-blue-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">favorite</span>
                    Đối tác
                  </h3>
                  {hasPartner && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                </div>

                {hasPartner ? (
                  <div className="flex flex-col items-center text-center mb-5">
                    <div className="relative mb-3">
                      <div className="size-20 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white">person</span>
                      </div>
                      <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
                        <span className="material-symbols-outlined text-pink-500 text-sm">notifications_active</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg text-slate-900">{partnerName}</h4>
                    <p className="text-xs text-slate-400">Đã kết nối</p>
                    <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-white mt-4 shadow-sm w-full">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Trạng thái đã gửi</p>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🥺</span>
                        <p className="text-sm text-slate-700 font-medium leading-snug text-left">
                          "Em đang trong ngày {phase.toLowerCase()}, cảm xúc hơi nhạy cảm xíu..."
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-blue-300">person_add</span>
                    </div>
                    <p className="text-sm text-slate-500">Chưa kết nối với ai</p>
                    <Link to="/settings/notifications" className="text-xs font-bold text-blue-500 hover:underline">
                      Kết nối ngay →
                    </Link>
                  </div>
                )}
              </div>
              <button
                onClick={() => setPanel('chat')}
                className="w-full py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Gửi lời nhắn
              </button>
            </div>

            <div className="md:col-span-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ── 3. Hi AI advice (dark) ── */}
            <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col relative overflow-hidden text-white">
              <div
                className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] opacity-30 pointer-events-none"
                style={{ background: 'linear-gradient(135deg,#f9a8c9,#d4a8e8)' }}
              />
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="material-symbols-outlined text-pink-400 text-[22px]">auto_awesome</span>
                <h3 className="font-bold text-sm text-slate-200">Lời khuyên từ Hi AI</h3>
              </div>
              <div className="flex-grow flex flex-col justify-center relative z-10">
                <p className="text-base font-medium leading-snug mb-4">
                  {phase === 'Rụng trứng'
                    ? '"Estrogen đang ở mức cao nhất. Đây là thời điểm tuyệt vời để bắt đầu dự án mới và kết nối sâu hơn với người ấy!"'
                    : phase === 'Kinh nguyệt'
                    ? '"Hãy nghỉ ngơi và tự chăm sóc bản thân. Nhiệt và trà gừng sẽ giúp bạn cảm thấy dễ chịu hơn."'
                    : '"Giai đoạn này rất tốt để học điều mới và giao tiếp xã hội. Năng lượng của bạn đang tăng dần!"'}
                </p>
                <button
                  onClick={() => setPanel('chat')}
                  className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                >
                  Hỏi Hi AI thêm <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* ── 5. Emotion chart (md col-span-2) ── */}
            <div className="lg:col-span-5 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500 text-[22px]">bar_chart</span>
                  Biểu đồ cảm xúc tuần này
                </h3>
                <select className="bg-gray-50 border-none text-xs font-bold rounded-lg py-1 px-3 text-slate-600 cursor-pointer hover:bg-gray-100 outline-none">
                  <option>7 ngày qua</option>
                  <option>30 ngày qua</option>
                </select>
              </div>
              <div className="h-36 w-full flex items-end justify-between gap-2 px-2">
                {getWeekBars().map(({ day, h, cls, active }) => (
                  <div key={day} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                    <div
                      className={`relative w-full bg-gray-100 rounded-t-xl rounded-b-sm h-32 flex items-end overflow-hidden ${
                        active ? 'ring-2 ring-pink-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className={`w-full ${cls} transition-colors rounded-t-xl`} style={{ height: h }} />
                    </div>
                    <span className={`text-[10px] font-bold text-center whitespace-pre ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. Mini Calendar ── */}
            <div className="lg:col-span-4 bg-yellow-50/50 rounded-3xl p-6 shadow-sm border border-yellow-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-[22px]">calendar_month</span>
                  Lịch chu kỳ — {monthLabel}
                </h3>
                <Link to="/calendar" className="text-xs font-bold text-slate-500 hover:text-pink-500 transition-colors">
                  Xem toàn bộ
                </Link>
              </div>
              <div className="flex justify-between items-center gap-2 mb-4">
                <div className="flex-1 grid grid-cols-7 gap-1 text-center">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                    <div key={i} className="text-[10px] uppercase font-bold text-slate-400 mb-2">{d}</div>
                  ))}
                  {currentWeekDates.map((date) => {
                    const dateIso = toIsoDate(date);
                    const isToday = dateIso === toIsoDate(today);
                    const isRecorded = (cycleQuery.data?.cycles ?? []).some((record) => dateIsWithin(dateIso, record.startDate, record.endDate));
                    const isPredicted = dateIsWithin(dateIso, estimatedPeriodStartDate, estimatedPeriodEndDate);
                    const isFertile = dateIsWithin(dateIso, insights?.fertileWindowStartDate, insights?.fertileWindowEndDate);
                    return (
                      <div
                        key={dateIso}
                        className={`h-8 flex items-center justify-center rounded-lg text-sm transition-all
                          ${!isRecorded && !isPredicted && !isFertile ? 'text-slate-500 bg-white/50' : ''}
                          ${isRecorded ? 'bg-rose-400 text-white shadow-sm' : ''}
                          ${!isRecorded && isPredicted ? 'border border-dashed border-rose-400 bg-rose-50 text-rose-600' : ''}
                          ${!isRecorded && !isPredicted && isFertile ? 'border border-violet-200 bg-violet-50 text-violet-600' : ''}
                          ${isToday ? 'font-black ring-2 ring-slate-800 ring-offset-1' : ''}
                        `}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Đã ghi nhận
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-50 border border-dashed border-rose-400 inline-block" /> Dự kiến
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-100 border border-violet-200 inline-block" /> Cửa sổ thụ thai
                </div>
              </div>
            </div>
            </div>

            {/* ── 7. Community FAQ (full width) ── */}
            <div className="md:col-span-4 bg-white/90 backdrop-blur-sm rounded-3xl p-7 shadow-sm border border-white/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Câu hỏi thường gặp</h3>
                  <p className="text-slate-500 text-sm">Cộng đồng đang thảo luận gì?</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-400">Chủ đề hot:</span>
                  {['#ChuKy', '#SucKhoe', '#TinhYeu'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-slate-600 cursor-pointer hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    cat: 'Sức khỏe',
                    q: 'Tại sao tôi cảm thấy đau lưng khi rụng trứng?',
                    desc: 'Đau lưng giữa chu kỳ thường do sự thay đổi nội tiết tố và nang trứng vỡ ra...',
                  },
                  {
                    cat: 'Dinh dưỡng',
                    q: 'Thực phẩm nên ăn để tăng khả năng thụ thai?',
                    desc: 'Các loại đậu, rau lá xanh đậm và chất béo lành mạnh là chìa khóa...',
                  },
                ].map(({ cat, q, desc }) => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); setPanel('chat'); }}
                    className="group p-4 rounded-2xl bg-gray-50 hover:bg-pink-50/50 border border-transparent hover:border-pink-100 transition-all cursor-pointer text-left w-full"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-pink-500 shadow-sm border border-pink-100">
                        {cat}
                      </span>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-pink-400 transition-colors text-[18px]">
                        arrow_outward
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors text-sm">{q}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPanel('chat')}
                className="block w-full mt-5 py-3 border border-gray-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all text-center"
              >
                Khám phá thêm cùng Hi AI
              </button>
            </div>

            {/* ── 8. Upgrade Plans (full width) ── */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative bg-white/80 backdrop-blur-sm border border-pink-100/50 p-6 shadow-sm">
              <PricingCard />
            </div>

          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="bg-white/60 border-t border-white/40 py-6 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <p>© 2025 Hi Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-pink-500 transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-pink-500 transition-colors cursor-pointer">Help Center</span>
              <Link to="/settings" className="hover:text-pink-500 transition-colors">Settings</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ Panels ═══ */}

      <CycleHistoryDrawer
        open={historyOpen}
        cycles={cycleQuery.data?.cycles ?? []}
        insights={insights}
        editingRecord={editingHistoryRecord}
        onClose={() => setHistoryOpen(false)}
        onSaved={refreshCycleData}
      />

      <DailyLogModal
        open={dailyLogOpen}
        mode={dailyLogMode}
        onClose={closeDailyLog}
        onSaved={refreshCycleData}
      />

      {/* ── Panel 3: Hi AI Chat ── */}
      <Panel open={panel === 'chat'} onClose={close} title="Hi AI Chat" icon="auto_awesome" iconBg="bg-purple-100 text-purple-500">
        <div className="flex flex-col h-full">

          {/* AI identity strip */}
          <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                  <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">Hi AI 🌸</p>
                <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Sẵn sàng trò chuyện
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Hôm nay</p>
              <p className="text-[10px] font-bold text-pink-400">{cycleContextLabel}</p>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)', borderBottom: '1px solid #fce7f3' }}>
            {AI_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)', color: '#9333ea', border: '1px solid #e9d5ff' }}
              >
                ✨ {chip}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0"
            style={{ background: 'linear-gradient(160deg,#fff9fb 0%,#f8f4ff 100%)' }}
          >
            {messages.length === 0 && !sendChatMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                  <span className="material-symbols-outlined text-white text-[22px]">auto_awesome</span>
                </div>
                <p className="font-extrabold text-slate-800">Bắt đầu trò chuyện với Hi AI</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Tin nhắn sẽ được lấy từ hệ thống AI và lưu vào lịch sử thật của bạn.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg._id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
                  >
                    <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                  </div>
                )}
                <div
                  className="max-w-[75%] px-4 py-3 text-sm font-medium leading-relaxed rounded-2xl"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#312e81,#4c1d95)',
                    color: '#f3e8ff',
                    borderBottomRightRadius: 4,
                    boxShadow: '0 4px 14px rgba(76,29,149,0.30)',
                  } : {
                    background: 'linear-gradient(135deg,#fff0f8,#f5f0ff)',
                    color: '#581c87',
                    borderBottomLeftRadius: 4,
                    boxShadow: '0 4px 14px rgba(244,114,182,0.15)',
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex-shrink-0 flex items-center justify-center border border-violet-200">
                    <span className="material-symbols-outlined text-violet-400 text-[16px]">person</span>
                  </div>
                )}
              </div>
            ))}

            {sendChatMutation.isPending && (
              <div className="flex items-end gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
                >
                  <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                </div>
                <div
                  className="px-4 py-3 rounded-2xl flex gap-1.5 items-center"
                  style={{ background: 'linear-gradient(135deg,#fff0f8,#f5f0ff)', borderBottomLeftRadius: 4 }}
                >
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f472b6', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#c084fc', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottom} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 flex-shrink-0" style={{ background: 'white', borderTop: '1px solid #fce7f3' }}>
            <div
              className="flex gap-2 items-end rounded-2xl px-1 py-1"
              style={{ background: 'linear-gradient(135deg,#fff5f8,#f8f0ff)', border: '1.5px solid #e9d5ff' }}
            >
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Hỏi Hi AI về chu kỳ của bạn..."
                rows={1}
                className="flex-1 px-3 py-2.5 bg-transparent text-slate-800 text-sm resize-none outline-none max-h-28 leading-relaxed"
                style={{ caretColor: '#f472b6' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                style={{
                  background: chatInput.trim()
                    ? 'linear-gradient(135deg,#f472b6,#a78bfa)'
                    : '#e5e7eb',
                  boxShadow: chatInput.trim() ? '0 4px 14px rgba(244,114,182,0.45)' : 'none',
                }}
              >
                <span className="material-symbols-outlined text-white text-[18px]">send</span>
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-1.5 font-medium">Enter để gửi · Shift+Enter xuống dòng</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
