import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarBlank,
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

function shortDate(value?: string) {
  if (!value) return '';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function statusMeta(question: CoupleQuestionSession) {
  if (question.status === 'UNLOCKED') return { label: 'Đã mở', icon: Check, tone: 'text-emerald-700 bg-emerald-50' };
  if (question.status === 'WAITING_PARTNER') return { label: 'Đang chờ', icon: Clock, tone: 'text-amber-700 bg-amber-50' };
  if (question.status === 'SKIPPED') return { label: 'Đã bỏ qua', icon: CalendarBlank, tone: 'text-slate-500 bg-slate-100' };
  return { label: 'Chưa trả lời', icon: LockKey, tone: 'text-slate-600 bg-slate-100' };
}

function QuestionSkeleton() {
  return (
    <div className="animate-pulse px-6 py-12 md:px-12">
      <div className="mx-auto h-4 w-28 rounded bg-slate-100" />
      <div className="mx-auto mt-8 h-8 w-4/5 rounded-xl bg-slate-100" />
      <div className="mx-auto mt-3 h-8 w-3/5 rounded-xl bg-slate-100" />
      <div className="mt-10 h-40 rounded-2xl bg-slate-100" />
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
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyAnswerVal, setHistoryAnswerVal] = useState('');

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
    queryKey: ['partner-question-history'],
    queryFn: () => api.get('/partner/questions/history', { params: { page: 0, limit: 60 } })
      .then(({ data }) => data.history as CoupleQuestionHistory),
    enabled: hasPartner && hasCouplePremium && activeView === 'history',
  });

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
    if (!selectedQuestion && historyQuery.data?.items.length) {
      setSelectedQuestion(historyQuery.data.items[0]);
    }
  }, [historyQuery.data?.items, selectedQuestion]);

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

  const skipMutation = useMutation({
    mutationFn: () => api.post('/partner/questions/today/skip'),
    onSuccess: refreshQuestions,
    onError: () => toast.error('Không thể bỏ qua câu hỏi lúc này'),
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

  const historyItems = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data?.items]);
  const accentText = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentSoft = isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700';
  const accentBorder = isMale ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-pink-400 focus:ring-pink-100';
  const pageSurface = isMale
    ? 'bg-gradient-to-b from-sky-50 via-white to-white'
    : 'bg-gradient-to-b from-pink-50 via-white to-white';

  const switchView = (view: ViewKey) => {
    setSearchParams(view === 'today' ? {} : { view });
  };

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
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Một câu hỏi, mỗi ngày
            </h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
              Trả lời riêng. Khi cả hai hoàn thành, câu trả lời sẽ cùng được mở.
            </p>
          </div>
          <Link
            to={settingsPath}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-pink-200 hover:text-pink-600 active:scale-[0.98] md:self-auto"
          >
            <SlidersHorizontal size={18} />
            Cài đặt thông báo
          </Link>
        </header>

        <div className="mt-8 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
                className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition active:scale-[0.98] ${
                  active ? `${accentSoft} shadow-sm` : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={17} weight={active ? 'fill' : 'regular'} />
                {item.label}
              </button>
            );
          })}
        </div>

        {!hasPartner ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm md:px-12">
            <div className={`mx-auto grid size-14 place-items-center rounded-2xl ${accentSoft}`}>
              <UserPlus size={27} weight="duotone" />
            </div>
            <h2 className="mt-5 text-2xl font-black">Kết nối với Người ấy trước nhé</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
              Hai tài khoản cần kết nối hai chiều để cùng nhận một câu hỏi và mở câu trả lời.
            </p>
            <Link
              to={settingsPath}
              className="hi-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-bold"
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
          <section className="mt-8 overflow-hidden rounded-3xl border border-white bg-white shadow-[0_24px_70px_rgba(148,163,184,0.16)]">
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
                <div className="border-b border-slate-100 px-6 py-5 md:px-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold capitalize text-slate-400">{dateLabel(todayQuery.data.questionDate)}</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${accentSoft}`}>
                        {todayQuery.data.category}
                      </span>
                      {(() => {
                        const meta = statusMeta(todayQuery.data);
                        const Icon = meta.icon;
                        return (
                          <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${meta.tone}`}>
                            <Icon size={14} weight="bold" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-9 md:px-12 md:py-12">
                  <div className="mx-auto max-w-3xl text-center">
                    <p className={`text-sm font-bold ${accentText}`}>Dành cho bạn và {partnerName}</p>
                    <h2 className="mt-4 text-2xl font-black leading-snug text-slate-950 md:text-4xl">
                      {todayQuery.data.questionText}
                    </h2>
                  </div>

                  {!todayQuery.data.unlocked ? (
                    <form
                      onSubmit={answerForm.handleSubmit((values) => answerMutation.mutate(values))}
                      className="mx-auto mt-10 max-w-2xl"
                    >
                      <label htmlFor="couple-answer" className="text-sm font-bold text-slate-700">
                        Câu trả lời của bạn
                      </label>
                      <textarea
                        id="couple-answer"
                        rows={5}
                        {...answerForm.register('content')}
                        placeholder="Viết điều bạn thật sự muốn chia sẻ..."
                        className={`mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:bg-white focus:ring-4 ${accentBorder}`}
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
                        {!todayQuery.data.myAnswer && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => skipMutation.mutate()}
                            loading={skipMutation.isPending}
                          >
                            Bỏ qua hôm nay
                          </Button>
                        )}
                      </div>
                      {todayQuery.data.myAnswer && (
                        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-sm font-semibold leading-relaxed text-amber-800">
                          <LockKey size={19} className="mt-0.5 shrink-0" />
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <article className="rounded-2xl bg-slate-50 p-5 md:p-6">
                          <p className="text-xs font-bold text-slate-400">Bạn đã viết</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">
                            {todayQuery.data.myAnswer?.content}
                          </p>
                        </article>
                        <article className={`rounded-2xl p-5 md:p-6 ${accentSoft}`}>
                          <p className="text-xs font-bold opacity-70">{partnerName} đã viết</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">
                            {todayQuery.data.partnerAnswer?.content}
                          </p>
                        </article>
                      </div>

                      <div className="mt-6 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2">
                          <ChatCircleText size={20} className={accentText} />
                          <h3 className="font-black">Nói thêm một chút</h3>
                        </div>
                        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                          {todayQuery.data.messages.length === 0 && (
                            <p className="py-5 text-center text-sm font-semibold text-slate-400">
                              Cuộc trò chuyện của câu hỏi này đang trống.
                            </p>
                          )}
                          {todayQuery.data.messages.map((message) => {
                            const mine = message.userId === user?._id;
                            return (
                              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                                  mine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
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
                          className="mt-4 flex gap-2"
                        >
                          <input
                            {...messageForm.register('content')}
                            aria-label="Tin nhắn"
                            placeholder="Nhắn một điều nhỏ..."
                            className={`min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-4 ${accentBorder}`}
                          />
                          <Button type="submit" variant="icon" loading={messageMutation.isPending} aria-label="Gửi tin nhắn">
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
          <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="px-2 pb-4">
                <h2 className="text-xl font-black">Những câu hỏi đã qua</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Chọn một câu để xem lại khoảnh khắc của hai bạn.</p>
              </div>
              {historyQuery.isLoading ? (
                <QuestionSkeleton />
              ) : historyQuery.isError ? (
                <p className="px-2 py-10 text-center text-sm font-bold text-rose-600">Không tải được lịch sử câu hỏi.</p>
              ) : historyItems.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <CalendarBlank size={34} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">Chưa có câu hỏi nào để xem lại.</p>
                </div>
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {historyItems.map((question) => {
                    const selected = selectedQuestion?._id === question._id;
                    const meta = statusMeta(question);
                    return (
                      <button
                        key={question._id}
                        type="button"
                        onClick={() => setSelectedQuestion(question)}
                        className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                          selected
                            ? `${isMale ? 'border-blue-200 bg-blue-50/70' : 'border-pink-200 bg-pink-50/70'}`
                            : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-400">{shortDate(question.questionDate)}</span>
                          <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${meta.tone}`}>{meta.label}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-800">
                          {question.questionText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              {!selectedQuestion ? (
                <div className="grid min-h-72 place-items-center text-center">
                  <div>
                    <Heart size={34} className="mx-auto text-slate-300" weight="duotone" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">Chọn một câu hỏi để xem lại.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold capitalize text-slate-400">{dateLabel(selectedQuestion.questionDate)}</p>
                  <h2 className="mt-3 text-2xl font-black leading-snug text-slate-950">
                    {selectedQuestion.questionText}
                  </h2>
                  <div className="mt-7 space-y-3">
                    {selectedQuestion.myAnswer && !isEditingHistory ? (
                      <article className="rounded-2xl bg-slate-50 p-5">
                        <p className="text-xs font-bold text-slate-400">Bạn</p>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                          {selectedQuestion.myAnswer.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingHistory(true)}
                          className={`mt-2 text-xs font-bold ${accentText} hover:underline flex items-center gap-1`}
                        >
                          <PencilSimple size={14} className="inline" /> Chỉnh sửa câu trả lời
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
                        className="rounded-2xl bg-slate-50 p-5 space-y-3"
                      >
                        <label className="text-xs font-bold text-slate-400 block">
                          {selectedQuestion.myAnswer ? 'Chỉnh sửa câu trả lời của bạn' : 'Bạn chưa trả lời câu hỏi này'}
                        </label>
                        <textarea
                          rows={4}
                          value={historyAnswerVal}
                          onChange={(e) => setHistoryAnswerVal(e.target.value)}
                          placeholder="Viết câu trả lời của bạn..."
                          className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-4 ${accentBorder}`}
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
                      <article className={`rounded-2xl p-5 ${accentSoft}`}>
                        <p className="text-xs font-bold opacity-70">{partnerName}</p>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                          {selectedQuestion.partnerAnswer.content}
                        </p>
                      </article>
                    )}
                    {!selectedQuestion.activePair && (
                      <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-800">
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
