import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { ChatMessage } from '../types';
import {
  ChatMessageContent,
} from '../components/chat/ChatMessageContent';
import { ChatSession, formatChatTime, formatSessionLabel, todaySessionDate } from '../components/chat/chatMessageUtils';

const femaleSuggestedQuestions = [
  'Chu kỳ trước đó của tôi là khi nào?',
  'Kỳ tiếp theo dự kiến khi nào?',
  'Hôm nay tôi nên ăn gì?',
  'Các tính năng của Hi là gì?',
];

const maleSuggestedQuestions = [
  'Hôm nay tôi nên chăm sóc Người ấy thế nào?',
  'Người ấy đang ở giai đoạn nào?',
  'Kỳ tiếp theo của Người ấy dự kiến khi nào?',
  'Các gói của Hi khác nhau thế nào?',
];

interface SendChatResponse {
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  message?: ChatMessage;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?._id ?? 'anonymous';
  const [input, setInput] = useState('');
  const [sessionDate, setSessionDate] = useState(todaySessionDate());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMale = user?.gender === 'male';
  const accent = isMale
    ? {
        from: 'from-blue-400',
        via: 'via-sky-400',
        to: 'to-violet-400',
        soft: 'from-blue-50 to-indigo-50',
        text: 'text-blue-500',
        hoverBorder: 'hover:border-blue-100',
        hoverText: 'hover:text-blue-500',
      }
    : {
        from: 'from-sky-400',
        via: 'via-violet-400',
        to: 'to-pink-400',
        soft: 'from-pink-50 to-violet-50',
        text: 'text-pink-500',
        hoverBorder: 'hover:border-pink-100',
        hoverText: 'hover:text-pink-500',
      };
  const suggestedQuestions = isMale ? maleSuggestedQuestions : femaleSuggestedQuestions;

  const sessionsQuery = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions', userId],
    queryFn: () => api.get('/chat/sessions?limit=40').then((r) => r.data.sessions ?? []),
    enabled: !!user?._id,
  });

  const { data: serverMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat', userId, sessionDate],
    queryFn: () => api.get('/chat', { params: { sessionDate } }).then((r) => r.data.messages ?? []),
    enabled: !!user?._id && !!sessionDate,
  });

  const messages = useMemo(
    () => [...serverMessages, ...optimisticMessages],
    [serverMessages, optimisticMessages],
  );

  const sessions = useMemo(() => {
    const existing = sessionsQuery.data ?? [];
    if (existing.some((session) => session.sessionDate === sessionDate)) return existing;
    return [{ sessionDate, title: 'Hôm nay', messageCount: messages.length, lastMessageAt: messages[messages.length - 1]?.createdAt }, ...existing];
  }, [messages, sessionDate, sessionsQuery.data]);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) => api.post('/chat', { content, sessionDate }).then((r) => r.data as SendChatResponse),
    onSuccess: (data) => {
      const nextMessages = [data.userMessage, data.assistantMessage ?? data.message].filter(Boolean) as ChatMessage[];
      queryClient.setQueryData<ChatMessage[]>(['chat', userId, sessionDate], (current = []) => {
        const ids = new Set(current.map((item) => item._id));
        return [...current, ...nextMessages.filter((item) => !ids.has(item._id))];
      });
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chat', userId, sessionDate] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', userId] });
    },
    onError: () => setOptimisticMessages([]),
  });

  useEffect(() => {
    setSessionDate(todaySessionDate());
    setOptimisticMessages([]);
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  const handleSend = (message = input.trim()) => {
    const nextMessage = message.trim();
    if (!nextMessage || isPending) return;
    const tempMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      userId,
      role: 'user',
      content: nextMessage,
      createdAt: new Date().toISOString(),
      sessionDate,
    } as ChatMessage;
    setInput('');
    setOptimisticMessages([tempMessage]);
    sendMessage(nextMessage);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="animate-fade-in grid min-h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
        <div className={clsx('rounded-3xl bg-gradient-to-br p-4', accent.soft)}>
          <div className={clsx('mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.via, accent.to)}>
            <span className="material-symbols-outlined">forum</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Hi AI Chat</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Lịch sử được chia theo ngày và chỉ hiển thị dữ liệu của tài khoản hiện tại.
          </p>
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Phiên trò chuyện</p>
        <div className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
          {sessions.map((session) => (
            <button
              key={session.sessionDate}
              onClick={() => {
                setSessionDate(session.sessionDate);
                setOptimisticMessages([]);
              }}
              className={clsx(
                'w-full rounded-2xl border p-3 text-left text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5',
                session.sessionDate === sessionDate
                  ? 'border-sky-100 bg-gradient-to-r from-sky-50 via-violet-50 to-pink-50 text-violet-600'
                  : 'border-slate-100 bg-white text-slate-600',
              )}
            >
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-300">
                {formatSessionLabel(session.sessionDate)} · {session.messageCount} tin
              </span>
              <span className="line-clamp-2">{session.title || 'Cuộc trò chuyện với Hi AI'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between" style={{ background: 'linear-gradient(135deg,#eff6ff,#fff1f7)' }}>
            <div className="flex items-center gap-3">
              <div className={clsx('relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.via, accent.to)}>
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">Hi AI</p>
                <p className="text-xs font-bold text-emerald-500">Sẵn sàng trò chuyện · {formatSessionLabel(sessionDate)}</p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSend(question)}
                  className={clsx('shrink-0 rounded-full border border-white bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5', accent.hoverBorder, accent.hoverText)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6" style={{ background: 'linear-gradient(160deg,#f8fbff 0%,#fff7fb 100%)' }}>
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div className={clsx('mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg', accent.from, accent.via, accent.to)}>
                  <span className="material-symbols-outlined text-[30px]">auto_awesome</span>
                </div>
                <p className="text-lg font-black text-slate-900">Bắt đầu trò chuyện với Hi AI</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Bạn có thể hỏi về Hi, gói dịch vụ, lịch chu kỳ, dữ liệu đã ghi nhận hoặc cách chăm sóc theo từng giai đoạn.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className={clsx('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <div className={clsx('flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.via, accent.to)}>
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      </div>
                    )}
                    <div className={clsx(
                      'max-w-[78%] rounded-3xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm',
                      message.role === 'user'
                        ? clsx('rounded-br-md bg-gradient-to-br text-white', accent.from, accent.via, accent.to)
                        : 'rounded-bl-md border border-white bg-white text-slate-700',
                    )}>
                      <ChatMessageContent content={message.content} />
                      <p className={clsx('mt-1 text-[10px] font-bold opacity-60', message.role === 'user' ? 'text-right' : 'text-left')}>
                        {formatChatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isPending && (
              <div className="mt-4 flex items-end gap-2">
                <div className={clsx('flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.via, accent.to)}>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                </div>
                <div className="rounded-3xl rounded-bl-md border border-white bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <span key={index} className="size-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${index * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-5">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm focus-within:border-sky-200 focus-within:ring-4 focus-within:ring-sky-50">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... Enter để gửi"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
              />
              <Button onClick={() => handleSend()} loading={isPending} disabled={!input.trim()} className="h-11 w-11 rounded-2xl px-0">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
