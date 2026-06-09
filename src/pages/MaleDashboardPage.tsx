import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/layout/Navbar';
import PageBackdrop from '../components/layout/PageBackdrop';
import SiteFooter from '../components/layout/SiteFooter';
import HealthVideoSection from '../components/health/HealthVideoSection';
import QuickMoodCard from '../components/health/QuickMoodCard';
import CyclePreviewCalendar from '../components/cycles/CyclePreviewCalendar';
import PricingCard from '../components/PricingCard';
import AffiliateRecommendations from '../components/affiliate/AffiliateRecommendations';
import HiTrustExplainer from '../components/health/HiTrustExplainer';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { CycleInsights, CycleRecord } from '../types/shared';

function formatShortDate(value?: string | null) {
  if (!value) return '--';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatDateRange(start?: string | null, end?: string | null) {
  return `${formatShortDate(start)}${end ? ` - ${formatShortDate(end)}` : ''}`;
}

function moodLabel(score?: number | null) {
  if (!score) return 'Chưa có cảm xúc được chia sẻ hôm nay';
  if (score >= 5) return 'Vui vẻ';
  if (score === 4) return 'Bình tĩnh';
  if (score === 3) return 'Bình thường';
  if (score === 2) return 'Lo lắng hoặc mệt mỏi';
  return 'Bực bội';
}

function openHiChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent('hi-chat:open', { detail: { prompt } }));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (hour < 18) return { text: 'Chào buổi chiều', icon: 'light_mode' };
  return { text: 'Chào buổi tối', icon: 'dark_mode' };
}

function ringCopy(insights?: CycleInsights | null) {
  const status = insights?.periodStatus ?? 'UPCOMING';
  if (status === 'CONFIRMED') {
    return {
      value: insights?.confirmedPeriodDay ?? '--',
      eyebrow: 'Ngày kinh nguyệt',
      caption: 'đã ghi nhận',
      color: '#f9a8d4',
    };
  }
  if (status === 'DELAYED') {
    return {
      value: insights?.periodDelayDays ?? '--',
      eyebrow: 'Đã trễ',
      caption: 'ngày chưa ghi nhận',
      color: '#94a3b8',
    };
  }
  if (status === 'PREDICTED') {
    return {
      value: insights?.estimatedPeriodDay ?? '--',
      eyebrow: 'Ngày dự kiến',
      caption: 'kỳ kinh ước tính',
      color: '#f9a8d4',
    };
  }
  return {
    value: insights?.daysUntilEstimatedPeriod ?? '--',
    eyebrow: 'Còn',
    caption: 'ngày nữa tới kỳ',
    color: '#93c5fd',
  };
}

interface PartnerCyclesResponse {
  success: boolean;
  cycles: CycleRecord[];
  history?: {
    items: CycleRecord[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  insights?: CycleInsights | null;
  latestMood?: {
    moodScore?: number;
    label?: string;
    logDate?: string;
  } | number | null;
  latestDailyLogDate?: string | null;
  partner?: { id?: string; name?: string; avatar?: string };
}

export default function MaleDashboardPage() {
  const { user } = useAuthStore();
  const [historyLimit, setHistoryLimit] = useState(8);
  const [trustOpen, setTrustOpen] = useState(false);
  const greeting = getGreeting();
  const firstName = user?.name?.split(' ').pop() ?? 'bạn';

  const partnerQuery = useQuery<PartnerCyclesResponse>({
    queryKey: ['partner-cycles', historyLimit],
    queryFn: async () => {
      const { data } = await api.get('/users/partner-cycles', { params: { historyPage: 0, historyLimit } });
      return data;
    },
    enabled: !!user,
  });

  if (!user) return <Navigate to="/login" replace />;

  const partner = partnerQuery.data?.partner;
  const hasPartner = Boolean(partner || user.partnerId);
  const cycles = partnerQuery.data?.cycles ?? [];
  const history = partnerQuery.data?.history?.items ?? cycles.slice(0, historyLimit);
  const historyHasMore = Boolean(partnerQuery.data?.history?.hasMore);
  const historyTotal = partnerQuery.data?.history?.total ?? history.length;
  const insights = partnerQuery.data?.insights ?? null;
  const ring = ringCopy(insights);
  const circumference = 2 * Math.PI * 44;
  const partnerName = partner?.name ?? 'Người ấy';
  const fertilityLabel = insights?.fertilityStatus === 'HIGH' ? 'Cao' : insights?.fertilityStatus === 'LOW' ? 'Thấp' : 'Chưa đủ dữ liệu';
  const confidenceLabel = insights?.predictionConfidence === 'HIGH' ? 'Cao' : insights?.predictionConfidence === 'MEDIUM' ? 'Trung bình' : 'Đang học dữ liệu';
  const latestMoodValue = partnerQuery.data?.latestMood;
  const latestMood = typeof latestMoodValue === 'object' && latestMoodValue
    ? latestMoodValue.label ?? moodLabel(latestMoodValue.moodScore ?? null)
    : moodLabel(latestMoodValue ?? null);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f5fbff] font-sans">
      <PageBackdrop variant="male" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto w-full max-w-[1400px] flex-grow px-4 pb-16 pt-6 md:px-8">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="material-symbols-outlined text-[20px] text-yellow-500">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="hi-page-title text-4xl md:text-5xl">
                Chào {firstName}, cùng chăm sóc dịu dàng hôm nay.
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium text-slate-500">
                Dashboard nam chỉ xem dữ liệu chu kỳ đã được Người ấy chia sẻ, kèm gợi ý chăm sóc và Hi AI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openHiChat('Hôm nay tôi nên chăm sóc Người ấy thế nào?')}
              className="hi-btn-primary inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black"
            >
              Hỏi Hi AI
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-sm backdrop-blur-xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-blue-500">
                    <span className="material-symbols-outlined text-[22px]">favorite</span>
                    Sức khỏe của {partnerName}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Trạng thái chu kỳ</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Dữ liệu đồng bộ từ Người ấy, chỉ xem.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-600">
                  {hasPartner ? 'Đã kết nối' : 'Chưa kết nối'}
                </span>
              </div>

              {!hasPartner ? (
                <div className="rounded-[2rem] border border-dashed border-blue-100 bg-blue-50/50 p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-blue-300">person_add</span>
                  <p className="mt-3 text-lg font-black text-slate-900">Chưa kết nối với Người ấy</p>
                  <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
                    Khi hai bạn kết nối, dashboard này sẽ hiển thị chu kỳ, dự đoán và lịch sử đã được chia sẻ.
                  </p>
                  <Link to="/male-settings/notifications" className="hi-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black">
                    Kết nối ngay
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative flex size-56 items-center justify-center">
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5edf6" strokeWidth="8" />
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke={ring.color}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${circumference * 0.78} ${circumference}`}
                          />
                        </svg>
                        <div className="relative text-center">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{ring.eyebrow}</p>
                          <p className="mt-1 text-6xl font-black text-slate-900">{ring.value}</p>
                          <p className="mt-1 text-sm font-black text-slate-500">{ring.caption}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-center text-sm font-black text-blue-500">Dữ liệu đồng bộ từ Người ấy</p>
                    </div>

                    <div>
                      <CyclePreviewCalendar cycles={cycles} insights={insights} />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                          {Math.round(insights?.averagePeriodLength ?? cycles[0]?.periodLength ?? 5)} ngày kinh trung bình
                        </span>
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm">
                          Tin cậy: {confidenceLabel}
                        </span>
                        <span className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 shadow-sm">
                          Rụng trứng ước tính: {formatShortDate(insights?.estimatedOvulationDate)}
                        </span>
                        <span className="rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 shadow-sm">
                          Khả năng thụ thai ước tính: {fertilityLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-blue-100/70 bg-gradient-to-br from-blue-50/80 to-pink-50/70 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-blue-500">Gợi ý chăm sóc hôm nay</p>
                    <ul className="space-y-2 text-sm font-semibold text-slate-600">
                      <li>• Lắng nghe cảm xúc của Người ấy, nhất là khi kỳ đang tới gần.</li>
                      <li>• Cùng lên lịch sinh hoạt lành mạnh: ngủ đủ, ăn nhẹ, vận động vừa phải.</li>
                      <li>• Gửi một lời nhắn quan tâm hoặc hỏi xem Người ấy cần gì hôm nay.</li>
                    </ul>
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-blue-100/80 bg-blue-50/80 p-6 text-center shadow-sm backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <span className="material-symbols-outlined text-blue-500">favorite</span>
                    Người ấy
                  </h3>
                  <span className={`size-3 rounded-full ${hasPartner ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>
                {hasPartner ? (
                  <>
                    <div className="mx-auto flex size-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-violet-100 shadow-sm">
                      <span className="material-symbols-outlined text-4xl text-blue-400">person</span>
                    </div>
                    <p className="mt-3 text-xl font-black text-slate-900">{partnerName}</p>
                    <p className="text-sm font-semibold text-slate-400">Đã kết nối</p>
                    <div className="mt-5 rounded-3xl border border-white bg-white/85 p-4 text-left shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cảm xúc mới nhất</p>
                      <p className="mt-2 text-sm font-black text-slate-800">{latestMood}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {partnerQuery.data?.latestDailyLogDate ? `Cập nhật ${formatShortDate(partnerQuery.data.latestDailyLogDate)}` : 'Chưa có cập nhật cảm xúc'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openHiChat(`Gợi ý một lời nhắn quan tâm cho ${partnerName}`)}
                      className="hi-btn-secondary mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Gửi lời nhắn
                    </button>
                  </>
                ) : (
                  <p className="py-6 text-sm font-semibold text-slate-500">Chưa kết nối với ai.</p>
                )}
              </div>

              <QuickMoodCard accent="blue" sendToPartner={hasPartner} className="border-blue-100/80 bg-white/90" />
            </aside>
          </div>

          {hasPartner && (
            <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-sm backdrop-blur-xl">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-500">Lịch sử chu kỳ của Người ấy</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Các kỳ đã ghi nhận</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Chỉ hiển thị kỳ thật đã xác nhận. Dự đoán và trễ không được ghi thành lịch sử.
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">{historyTotal} kỳ</span>
              </div>
              {history.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                  Người ấy chưa có lịch sử chu kỳ đã xác nhận.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {history.map((record) => (
                    <div key={record._id} className="rounded-3xl border border-rose-100/70 bg-gradient-to-br from-white to-rose-50/60 p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">Đã ghi nhận</p>
                      <p className="mt-2 text-lg font-black text-slate-900">{formatDateRange(record.startDate, record.endDate)}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">{record.periodLength ?? 5} ngày kinh</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">{record.cycleLength ?? 28} ngày chu kỳ</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {historyHasMore && (
                <button
                  type="button"
                  onClick={() => setHistoryLimit((value) => value + 8)}
                  className="mt-5 rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Tải thêm lịch sử
                </button>
              )}
            </section>
          )}

          {hasPartner && (
            <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-sm backdrop-blur-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-500">Báo cáo của Người ấy</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{insights?.regularityLabel ?? 'Chưa đủ dữ liệu'}</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                    Dữ liệu này chỉ để bạn chăm sóc tinh tế hơn. Dự đoán luôn là tham khảo và không thay thế tư vấn y khoa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrustOpen(true)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-100"
                >
                  Hi tính toán thế nào?
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Tính đều đặn</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{insights?.regularityScore ?? 0}%</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-sky-500">Độ tin cậy</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{confidenceLabel}</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-500">Cảm xúc chia sẻ</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{latestMood}</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-pink-500">Lịch sử đã ghi</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{historyTotal}</p>
                </div>
              </div>
            </section>
          )}

          {hasPartner && (
            <div className="mt-6">
              <AffiliateRecommendations
                compact
                phase={insights?.estimatedPhase ?? insights?.currentPhase ?? undefined}
                symptomCategory="đau bụng"
              />
            </div>
          )}

          <div className="mt-6">
            <HealthVideoSection />
          </div>

          <div className="mt-6 rounded-[2rem] border border-blue-100/50 bg-white/80 p-6 shadow-sm backdrop-blur">
            <PricingCard />
          </div>
        </main>

        <SiteFooter tone="blue" />
      </div>
      <HiTrustExplainer open={trustOpen} onClose={() => setTrustOpen(false)} accent="blue" />
    </div>
  );
}
