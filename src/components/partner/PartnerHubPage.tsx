import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  Check,
  Clock,
  Heart,
  LockKey,
  PaperPlaneTilt,
  SlidersHorizontal,
  UserPlus,
  Gift,
  PencilSimple,
} from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import Navbar from '../layout/Navbar';
import Button from '../ui/Button';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumLockCard from '../subscription/PremiumLockCard';
import CoupleAnniversaryManager from './CoupleAnniversaryManager';
import type {
  CoupleQuestionHistory,
  CoupleQuestionSession,
} from '../../types/shared';

type Variant = 'female' | 'male';
type ViewKey = 'today' | 'history' | 'anniversaries';

interface PartnerResponse {
  partner?: { id?: string; name?: string; avatar?: string; gender?: string } | null;
}

const answerSchema = z.object({
  content: z.string().trim().min(1, 'Hãy viết câu trả lời trước nhé').max(2000, 'Câu trả lời tối đa 2.000 ký tự'),
});

const messageSchema = z.object({
  content: z.string().trim().min(1, 'Tin nhắn không được để trống').max(1000, 'Tin nhắn tối đa 1.000 ký tự'),
});

type AnswerForm = z.infer<typeof answerSchema>;
type MessageForm = z.infer<typeof messageSchema>;

function dateLabel(value?: string) {
  if (!value) return '';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthRange(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

function buildCalendarDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      iso: toIsoDate(day),
      label: day.getDate(),
      inCurrentMonth: day.getMonth() === date.getMonth(),
      isToday: toIsoDate(day) === toIsoDate(new Date()),
    };
  });
}

function statusMeta(question: CoupleQuestionSession) {
  if (question.status === 'UNLOCKED') return { label: 'Đã mở', icon: Check, tone: 'text-emerald-600 bg-emerald-50/80 border-emerald-100/80' };
  if (question.status === 'WAITING_PARTNER') return { label: 'Đang chờ', icon: Clock, tone: 'text-amber-600 bg-amber-50/80 border-amber-100/80' };
  return { label: 'Chưa trả lời', icon: LockKey, tone: 'text-slate-500 bg-slate-50/80 border-slate-100/80' };
}

function QuestionSkeleton() {
  return (
    <div className="animate-pulse px-6 py-12 md:px-12">
      <div className="mx-auto h-4 w-24 rounded-full bg-slate-100" />
      <div className="mx-auto mt-8 h-8 w-5/6 rounded-2xl bg-slate-100" />
      <div className="mx-auto mt-3 h-8 w-2/3 rounded-2xl bg-slate-100" />
      <div className="mt-10 h-44 rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function PartnerHubPage({ variant }: { variant: Variant }) {
  const user = useAuthStore((state) => state.user);
  const { data: subscription } = useSubscription();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView: ViewKey =
    searchParams.get('view') === 'history'
      ? 'history'
      : searchParams.get('view') === 'anniversaries'
      ? 'anniversaries'
      : 'today';
  const isMale = variant === 'male';
  const hasPartner = Boolean(user?.partnerId);
  const hasCouplePremium = subscription?.couplePremium === true;
  const settingsPath = isMale ? '/male-settings/notifications' : '/settings/notifications';
  const [selectedQuestion, setSelectedQuestion] = useState<CoupleQuestionSession | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyAnswerVal, setHistoryAnswerVal] = useState('');
  const currentMonthRange = useMemo(() => monthRange(visibleMonth), [visibleMonth]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles', 'questions-page'],
    queryFn: () => api.get('/users/partner-cycles').then(({ data }) => data as PartnerResponse),
    enabled: hasPartner,
  });
  const partnerName = partnerQuery.data?.partner?.name || 'Người ấy';

  const todayQuery = useQuery({
    queryKey: ['partner-question-today'],
    queryFn: () => api.get('/partner/questions/today').then(({ data }) => data.question as CoupleQuestionSession),
    enabled: hasPartner && hasCouplePremium,
    refetchInterval: (query) => query.state.data?.unlocked ? 60_000 : 120_000,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ['partner-question-history', currentMonthRange.from, currentMonthRange.to],
    queryFn: () => api.get('/partner/questions/history', {
      params: { page: 0, limit: 62, from: currentMonthRange.from, to: currentMonthRange.to },
    })
      .then(({ data }) => data.history as CoupleQuestionHistory),
    enabled: hasPartner && hasCouplePremium && activeView === 'history',
  });
  const historyItems = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data?.items]);
  const questionsByDate = useMemo(() => {
    return new Map(historyItems.map((question) => [question.questionDate.slice(0, 10), question]));
  }, [historyItems]);

  const answerForm = useForm<AnswerForm>({
    resolver: zodResolver(answerSchema),
    defaultValues: { content: '' },
  });
  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    if (todayQuery.data?.myAnswer?.content) {
      answerForm.reset({ content: todayQuery.data.myAnswer.content });
    }
  }, [answerForm, todayQuery.data?.myAnswer?.content]);

  useEffect(() => {
    setIsEditingToday(false);
  }, [todayQuery.data?._id]);

  useEffect(() => {
    if (activeView !== 'history') return;
    if (selectedHistoryDate) {
      setSelectedQuestion(questionsByDate.get(selectedHistoryDate) ?? null);
      return;
    }
    if (historyItems.length) {
      const firstQuestion = historyItems[0];
      setSelectedHistoryDate(firstQuestion.questionDate.slice(0, 10));
      setSelectedQuestion(firstQuestion);
    } else {
      setSelectedQuestion(null);
    }
  }, [activeView, historyItems, questionsByDate, selectedHistoryDate]);

  useEffect(() => {
    setIsEditingHistory(false);
    setHistoryAnswerVal(selectedQuestion?.myAnswer?.content ?? '');
  }, [selectedQuestion]);

  const refreshQuestions = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-question-today'] });
    queryClient.invalidateQueries({ queryKey: ['partner-question-history'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const answerMutation = useMutation({
    mutationFn: (payload: AnswerForm) => api.post('/partner/questions/today/answer', payload),
    onSuccess: () => {
      refreshQuestions();
      setIsEditingToday(false);
      toast.success('Đã lưu câu trả lời');
    },
    onError: () => toast.error('Không thể lưu câu trả lời lúc này'),
  });

  const historyAnswerMutation = useMutation({
    mutationFn: (content: string) => api.put(`/partner/questions/${selectedQuestion?._id}/answer`, { content }),
    onSuccess: (res) => {
      const updatedQuestion = res.data.question as CoupleQuestionSession;
      setSelectedQuestion(updatedQuestion);
      refreshQuestions();
      setIsEditingHistory(false);
      toast.success('Đã lưu câu trả lời');
    },
    onError: () => toast.error('Không thể lưu câu trả lời lúc này'),
  });

  const messageMutation = useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      api.post(`/partner/questions/${sessionId}/messages`, { content }),
    onSuccess: () => {
      messageForm.reset();
      refreshQuestions();
    },
    onError: () => toast.error('Không thể gửi tin nhắn'),
  });

  const accentText = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentSoft = isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700';
  const accentBorder = isMale ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-pink-400 focus:ring-pink-100';
  const pageSurface = isMale
    ? 'bg-gradient-to-b from-sky-50 via-white to-white'
    : 'bg-gradient-to-b from-pink-50 via-white to-white';

  const switchView = (view: ViewKey) => {
    setSearchParams(view === 'today' ? {} : { view });
  };

  const changeHistoryMonth = (amount: number) => {
    setVisibleMonth((current) => addMonths(current, amount));
    setSelectedHistoryDate(null);
    setSelectedQuestion(null);
    setIsEditingHistory(false);
  };

  // Reading this as: Couple features dashboard for couples interested in health and relationships, with a calm, intimate, and modern vibe language, leaning toward custom Tailwind theme + delicate cards split + smooth spring physics motion.
  return (
    <div className={`min-h-[100dvh] ${pageSurface} font-sans text-slate-900`}>
      <Navbar />
      <main className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={`flex items-center gap-2 text-sm font-black ${accentText}`}>
              <Heart size={18} weight="fill" />
              Câu hỏi của chúng mình
            </div>
            <h1 className="hi-page-title mt-3 text-3xl md:text-5xl">
              Một câu hỏi, mỗi ngày
            </h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
              Trả lời riêng. Khi cả hai hoàn thành, câu trả lời sẽ cùng được mở.
            </p>
          </div>
          <Link
            to={settingsPath}
            className={`hi-btn-secondary gap-2 px-5 py-2.5 text-sm self-start md:self-auto ${
              isMale ? 'focus:ring-blue-200' : 'focus:ring-pink-200'
            }`}
          >
            <SlidersHorizontal size={18} />
            Cài đặt thông báo
          </Link>
        </header>

        <div className={`mt-8 inline-flex rounded-xl border p-1 shadow-sm backdrop-blur bg-white/80 ${
          isMale ? 'border-blue-100/50 shadow-blue-500/5' : 'border-pink-100/50 shadow-pink-500/5'
        }`}>
          {([
            { key: 'today' as const, label: 'Hôm nay', icon: Heart },
            { key: 'history' as const, label: 'Lịch sử', icon: CalendarBlank },
            { key: 'anniversaries' as const, label: 'Kỷ niệm', icon: Gift },
          ]).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchView(item.key)}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-300 active:scale-[0.97] border ${
                  active
                    ? isMale
                      ? 'bg-blue-50/90 text-blue-600 border-blue-200/60 shadow-sm shadow-blue-500/5'
                      : 'bg-pink-50/90 text-pink-600 border-pink-200/60 shadow-sm shadow-pink-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
                }`}
              >
                <Icon size={17} weight={active ? 'fill' : 'regular'} />
                {item.label}
              </button>
            );
          })}
        </div>

        {!hasPartner ? (
          <section className={`mt-8 rounded-[2rem] border bg-white px-6 py-14 text-center shadow-[0_24px_70px_rgba(148,163,184,0.06)] md:px-12 ${
            isMale ? 'border-blue-100/60' : 'border-pink-100/60'
          }`}>
            <div className={`mx-auto grid size-14 place-items-center rounded-2xl ${accentSoft} shadow-inner`}>
              <UserPlus size={27} weight="duotone" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Kết nối với Người ấy trước nhé</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
              Hai tài khoản cần kết nối hai chiều để cùng nhận một câu hỏi và mở câu trả lời.
            </p>
            <Link
              to={settingsPath}
              className="hi-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold"
            >
              Mở cài đặt kết nối
            </Link>
          </section>
        ) : !hasCouplePremium ? (
          <section className="mt-8">
            <PremiumLockCard
              accent={isMale ? 'blue' : 'pink'}
              title="Mở trải nghiệm cặp đôi nâng cao"
              description="Chỉ cần một trong hai tài khoản có Premium để cả hai dùng câu hỏi hằng ngày, lịch sử trả lời, hội thoại theo chủ đề và gợi ý chăm sóc theo ngữ cảnh."
            />
          </section>
        ) : activeView === 'today' ? (
          <section className={`mt-8 overflow-hidden rounded-[2rem] border bg-white/95 backdrop-blur-[12px] shadow-[0_24px_70px_rgba(148,163,184,0.12)] transition-all duration-300 ${
            isMale ? 'border-blue-100/60' : 'border-pink-100/60'
          }`}>
            {todayQuery.isLoading ? (
              <QuestionSkeleton />
            ) : todayQuery.isError || !todayQuery.data ? (
              <div className="px-6 py-16 text-center">
                <p className="font-bold text-rose-600">Không tải được câu hỏi hôm nay.</p>
                <button
                  type="button"
                  onClick={() => todayQuery.refetch()}
                  className={`mt-3 text-sm font-bold ${accentText}`}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100/80 bg-slate-50/20 px-6 py-5 md:px-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{dateLabel(todayQuery.data.questionDate)}</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3.5 py-1 text-xs font-bold border ${
                        isMale ? 'bg-blue-50/80 text-blue-600 border-blue-100/60' : 'bg-pink-50/80 text-pink-600 border-pink-100/60'
                      }`}>
                        {todayQuery.data.category}
                      </span>
                      {(() => {
                        const meta = statusMeta(todayQuery.data);
                        const Icon = meta.icon;
                        return (
                          <span className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border ${meta.tone}`}>
                            <Icon size={13} weight="bold" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-9 md:px-12 md:py-12">
                  <div className="mx-auto max-w-3xl text-center">
                    <p className={`text-xs uppercase tracking-widest font-black ${accentText}`}>Dành cho bạn và {partnerName}</p>
                    <h2 className="mt-4 text-2xl font-black leading-snug text-slate-900 md:text-4xl md:leading-normal" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                      {todayQuery.data.questionText}
                    </h2>
                  </div>

                  {!todayQuery.data.unlocked ? (
                    <form
                      onSubmit={answerForm.handleSubmit((values) => answerMutation.mutate(values))}
                      className="mx-auto mt-10 max-w-2xl"
                    >
                      <label htmlFor="couple-answer" className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Câu trả lời của bạn
                      </label>
                      <textarea
                        id="couple-answer"
                        rows={5}
                        {...answerForm.register('content')}
                        placeholder="Viết điều bạn thật sự muốn chia sẻ..."
                        className={`mt-2.5 w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-5 py-4 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:ring-4 ${accentBorder}`}
                      />
                      {answerForm.formState.errors.content && (
                        <p className="mt-2 text-sm font-semibold text-rose-600">
                          {answerForm.formState.errors.content.message}
                        </p>
                      )}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Button type="submit" loading={answerMutation.isPending} className="sm:min-w-40">
                          {todayQuery.data.myAnswer ? 'Cập nhật câu trả lời' : 'Gửi câu trả lời'}
                        </Button>
                      </div>
                      {todayQuery.data.myAnswer && (
                        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50/50 border border-amber-100/60 px-4 py-3.5 text-sm font-semibold leading-relaxed text-amber-700">
                          <LockKey size={18} className="mt-0.5 shrink-0" />
                          <span>
                            {todayQuery.data.partnerAnswered
                              ? 'Người ấy đã trả lời. Câu trả lời đang được mở.'
                              : 'Đã lưu. Bạn vẫn có thể sửa trước khi Người ấy trả lời.'}
                          </span>
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="mx-auto mt-10 max-w-3xl">
                      <div className="grid gap-6 md:grid-cols-2">
                        <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 p-5 md:p-6 transition-all hover:bg-slate-50/80">
                          <div className="absolute right-3 top-3 opacity-[0.03] text-slate-900 pointer-events-none">
                            <Heart size={80} weight="fill" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Bạn đã viết</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">
                            {todayQuery.data.myAnswer?.content}
                          </p>
                        </article>
                        <article className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 transition-all ${
                          isMale
                            ? 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                            : 'border-pink-100 bg-pink-50/30 hover:bg-pink-50/50'
                        }`}>
                          <div className={`absolute right-3 top-3 opacity-[0.05] ${accentText} pointer-events-none`}>
                            <Heart size={80} weight="fill" />
                          </div>
                          <p className={`text-xs font-black uppercase tracking-wider ${accentText} opacity-80`}>
                            {partnerName} đã viết
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">
                            {todayQuery.data.partnerAnswer?.content}
                          </p>
                        </article>
                      </div>

                      {isEditingToday ? (
                        <form
                          onSubmit={answerForm.handleSubmit((values) => answerMutation.mutate(values))}
                          className="mt-6 rounded-2xl border border-slate-100/80 bg-slate-50/50 p-5"
                        >
                          <label htmlFor="couple-answer-edit" className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Chỉnh sửa câu trả lời của bạn
                          </label>
                          <textarea
                            id="couple-answer-edit"
                            rows={4}
                            {...answerForm.register('content')}
                            className={`mt-3 w-full resize-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none focus:ring-4 ${accentBorder}`}
                          />
                          {answerForm.formState.errors.content && (
                            <p className="mt-2 text-sm font-semibold text-rose-600">
                              {answerForm.formState.errors.content.message}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="submit" loading={answerMutation.isPending} className="text-xs py-1.5 px-3">
                              Lưu thay đổi
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                answerForm.reset({ content: todayQuery.data?.myAnswer?.content ?? '' });
                                setIsEditingToday(false);
                              }}
                              className="text-xs py-1.5 px-3"
                            >
                              Hủy
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            answerForm.reset({ content: todayQuery.data?.myAnswer?.content ?? '' });
                            setIsEditingToday(true);
                          }}
                          className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold ${accentText} hover:underline`}
                        >
                          <PencilSimple size={14} />
                          Chỉnh sửa câu trả lời của bạn
                        </button>
                      )}

                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2">
                          <ChatCircleText size={20} className={accentText} />
                          <h3 className="font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Nói thêm một chút</h3>
                        </div>
                        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                          {todayQuery.data.messages.length === 0 && (
                            <p className="py-8 text-center text-sm font-semibold text-slate-400">
                              Cuộc trò chuyện của câu hỏi này đang trống.
                            </p>
                          )}
                          {todayQuery.data.messages.map((message) => {
                            const mine = message.userId === user?._id;
                            return (
                              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm ${
                                  mine
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-tr-sm shadow-slate-950/10'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-100/50'
                                }`}>
                                  {message.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <form
                          onSubmit={messageForm.handleSubmit((values) =>
                            messageMutation.mutate({ sessionId: todayQuery.data!._id, content: values.content }))}
                          className="mt-4 flex gap-3 items-stretch"
                        >
                          <input
                            {...messageForm.register('content')}
                            aria-label="Tin nhắn"
                            placeholder="Nhắn một điều nhỏ..."
                            className={`min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-5 py-3 text-sm font-semibold outline-none focus:ring-4 ${accentBorder} transition-all duration-255`}
                          />
                          <Button type="submit" variant="icon" size="lg" loading={messageMutation.isPending} aria-label="Gửi tin nhắn">
                            <PaperPlaneTilt size={18} weight="fill" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : activeView === 'history' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" style={{ contentVisibility: 'auto', containIntrinsicSize: '760px' }}>
            <section className={`rounded-[2rem] border bg-white/95 p-5 md:p-6 shadow-[0_16px_48px_rgba(148,163,184,0.08)] transition-all duration-300 ${
              isMale ? 'border-blue-100/60' : 'border-pink-100/60'
            }`}>
              <div className="px-2 pb-4">
                <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Những câu hỏi đã qua</h2>
                <p className="mt-1.5 text-sm font-semibold text-slate-400">Chọn ngày trên lịch để xem hoặc chỉnh sửa câu trả lời.</p>
              </div>
              {historyQuery.isLoading ? (
                <QuestionSkeleton />
              ) : historyQuery.isError ? (
                <p className="px-2 py-10 text-center text-sm font-bold text-rose-600">Không tải được lịch sử câu hỏi.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
                    <button
                      type="button"
                      aria-label="Tháng trước"
                      onClick={() => changeHistoryMonth(-1)}
                      className={`grid size-8 place-items-center rounded-xl transition active:scale-90 ${
                        isMale ? 'text-blue-500 hover:bg-blue-50/80' : 'text-pink-500 hover:bg-pink-50/80'
                      }`}
                    >
                      <CaretLeft size={16} weight="bold" />
                    </button>
                    <p className="text-sm font-black capitalize text-slate-900">{monthLabel(visibleMonth)}</p>
                    <button
                      type="button"
                      aria-label="Tháng sau"
                      onClick={() => changeHistoryMonth(1)}
                      className={`grid size-8 place-items-center rounded-xl transition active:scale-90 ${
                        isMale ? 'text-blue-500 hover:bg-blue-50/80' : 'text-pink-500 hover:bg-pink-50/80'
                      }`}
                    >
                      <CaretRight size={16} weight="bold" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day) => {
                      const question = questionsByDate.get(day.iso);
                      const selected = selectedHistoryDate === day.iso;
                      const dotClass = question?.status === 'UNLOCKED'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/30'
                        : question?.status === 'WAITING_PARTNER'
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/30'
                        : question
                        ? (isMale ? 'bg-blue-400 shadow-sm shadow-blue-400/30' : 'bg-pink-400 shadow-sm shadow-pink-400/30')
                        : 'bg-transparent';
                      return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => {
                          setSelectedHistoryDate(day.iso);
                          setSelectedQuestion(question ?? null);
                          setIsEditingHistory(false);
                        }}
                        className={`flex aspect-square min-h-[36px] sm:min-h-11 flex-col items-center justify-center rounded-lg sm:rounded-xl border text-xs sm:text-sm font-black transition active:scale-[0.98] ${
                          selected
                            ? isMale
                              ? 'border-blue-400 bg-blue-50/80 text-blue-600 shadow-sm shadow-blue-500/5'
                              : 'border-pink-400 bg-pink-50/80 text-pink-600 shadow-sm shadow-pink-500/5'
                            : day.inCurrentMonth
                            ? 'border-slate-100 bg-white text-slate-700 hover:border-slate-200/80 hover:bg-slate-50/50'
                            : 'border-transparent bg-slate-50/10 text-slate-300'
                        }`}
                      >
                        <span className={day.isToday ? 'rounded-lg bg-slate-900 px-1.5 py-0.5 text-white text-[11px]' : ''}>{day.label}</span>
                        <span className={`mt-1 block size-1.5 rounded-full ${dotClass}`} />
                      </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[10px] font-bold text-slate-400">
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />Đã mở</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />Đang chờ</span>
                    <span className="inline-flex items-center gap-1"><span className={`size-2 rounded-full ${isMale ? 'bg-blue-400' : 'bg-pink-400'}`} />Chưa trả lời</span>
                  </div>

                  {historyItems.length === 0 && (
                    <div className="rounded-2xl bg-slate-50/50 border border-slate-100/50 px-4 py-8 text-center">
                      <CalendarBlank size={30} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-400">Tháng này chưa có câu hỏi nào.</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={`rounded-[2rem] border bg-white/95 p-6 shadow-[0_16px_48px_rgba(148,163,184,0.08)] transition-all duration-300 ${
              isMale ? 'border-blue-100/60' : 'border-pink-100/60'
            }`}>
              {!selectedQuestion ? (
                <div className="grid min-h-[360px] place-items-center text-center">
                  <div className="max-w-xs">
                    <div className={`mx-auto grid size-12 place-items-center rounded-2xl ${
                      isMale ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'
                    }`}>
                      <Heart size={24} weight="duotone" />
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-400">
                      {selectedHistoryDate ? 'Ngày này không có câu hỏi nào được lưu lại.' : 'Hãy chọn một ngày trên lịch để xem chi tiết câu hỏi và câu trả lời nhé.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{dateLabel(selectedQuestion.questionDate)}</p>
                  <h2 className="mt-3 text-xl md:text-2xl font-black leading-snug text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {selectedQuestion.questionText}
                  </h2>
                  <div className="mt-7 space-y-4">
                    {selectedQuestion.myAnswer && !isEditingHistory ? (
                      <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-slate-50/80">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Bạn đã viết</p>
                        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-700">
                          {selectedQuestion.myAnswer.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingHistory(true)}
                          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${accentText} hover:underline`}
                        >
                          <PencilSimple size={14} /> Chỉnh sửa câu trả lời
                        </button>
                      </article>
                    ) : (!selectedQuestion.myAnswer || isEditingHistory) ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!historyAnswerVal.trim()) {
                            toast.error('Hãy viết câu trả lời trước nhé');
                            return;
                          }
                          historyAnswerMutation.mutate(historyAnswerVal);
                        }}
                        className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3"
                      >
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                          {selectedQuestion.myAnswer ? 'Chỉnh sửa câu trả lời của bạn' : 'Bạn chưa trả lời câu hỏi này'}
                        </label>
                        <textarea
                          rows={4}
                          value={historyAnswerVal}
                          onChange={(e) => setHistoryAnswerVal(e.target.value)}
                          placeholder="Viết câu trả lời của bạn..."
                          className={`w-full resize-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 ${accentBorder}`}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" loading={historyAnswerMutation.isPending} className="text-xs py-1.5 px-3">
                            Lưu câu trả lời
                          </Button>
                          {selectedQuestion.myAnswer && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setIsEditingHistory(false)}
                              className="text-xs py-1.5 px-3"
                            >
                              Hủy
                            </Button>
                          )}
                        </div>
                      </form>
                    ) : null}

                    {selectedQuestion.partnerAnswer && (
                      <article className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                        isMale
                          ? 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                          : 'border-pink-100 bg-pink-50/30 hover:bg-pink-50/50'
                      }`}>
                        <p className={`text-xs font-black uppercase tracking-wider ${accentText} opacity-80`}>{partnerName} đã viết</p>
                        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-700">
                          {selectedQuestion.partnerAnswer.content}
                        </p>
                      </article>
                    )}
                    {!selectedQuestion.activePair && (
                      <p className="rounded-2xl bg-amber-50/50 border border-amber-100/60 p-4 text-sm font-semibold leading-relaxed text-amber-700">
                        Lịch sử chung đã khóa. Bạn chỉ có thể xem nội dung do mình tạo.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : (
          <CoupleAnniversaryManager variant={variant} />
        )}
      </main>
    </div>
  );
}
