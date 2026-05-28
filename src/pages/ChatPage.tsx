import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { ChatMessage } from '../types';

const femaleSuggestedQuestions = [
  'Chu kỳ của tôi có bình thường không?',
  'Hôm nay tôi nên ăn gì?',
  'Làm sao giảm đau bụng kinh?',
  'Khi nào khả năng thụ thai cao nhất?',
];

const maleSuggestedQuestions = [
  'Hôm nay tôi nên chăm sóc người ấy thế nào?',
  'Người ấy đang ở giai đoạn nào?',
  'Có cách nào giúp giảm stress tốt hơn không?',
  'Tôi nên chuẩn bị gì trước kỳ kinh của người ấy?',
];

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMale = user?.gender === 'male';
  const accent = isMale
    ? {
        from: 'from-blue-500',
        to: 'to-indigo-500',
        soft: 'from-blue-50 to-indigo-50',
        text: 'text-blue-500',
        ring: 'focus:border-blue-400 focus:ring-blue-100',
        hoverBorder: 'hover:border-blue-100',
        hoverText: 'hover:text-blue-500',
        chipBg: 'bg-blue-50',
        chipText: 'text-blue-600',
        chipHover: 'hover:bg-blue-100',
      }
    : {
        from: 'from-rose-500',
        to: 'to-pink-500',
        soft: 'from-pink-50 to-violet-50',
        text: 'text-pink-500',
        ring: 'focus:border-rose-400 focus:ring-rose-100',
        hoverBorder: 'hover:border-pink-100',
        hoverText: 'hover:text-pink-500',
        chipBg: 'bg-pink-50',
        chipText: 'text-pink-600',
        chipHover: 'hover:bg-pink-100',
      };
  const suggestedQuestions = isMale ? maleSuggestedQuestions : femaleSuggestedQuestions;

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat'],
    queryFn: () => api.get('/chat').then((r) => r.data.messages),
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) => api.post('/chat', { content }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  const handleSend = (message = input.trim()) => {
    const nextMessage = message.trim();
    if (!nextMessage || isPending) return;
    setInput('');
    sendMessage(nextMessage);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5 md:h-[calc(100vh-4rem)] animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 px-5 py-5 shadow-sm backdrop-blur md:px-6">
        <div className={clsx('pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br blur-3xl', accent.soft)} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className={clsx('material-symbols-outlined text-[20px]', accent.text)}>auto_awesome</span>
              <span>Hi AI</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Trợ lý sức khỏe cá nhân</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Hỏi về chu kỳ, triệu chứng, sức khỏe sinh sản hoặc cách đồng hành với người bạn yêu.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
            <div className={clsx('flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.to)}>
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">Đang hoạt động</p>
              <p className="text-sm font-extrabold text-slate-800">{messages.length} tin nhắn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="hidden w-72 flex-shrink-0 border-r border-slate-100 bg-gradient-to-b from-white to-slate-50/70 p-4 lg:block">
          <div className={clsx('mb-4 rounded-3xl bg-gradient-to-br p-4', accent.soft)}>
            <div className={clsx('mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.to)}>
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900">Gợi ý bắt đầu</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Chọn một câu hỏi để Hi AI hiểu ngữ cảnh nhanh hơn.</p>
          </div>
          <div className="space-y-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => handleSend(question)}
                className={clsx(
                  'w-full rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left text-xs font-bold leading-relaxed text-slate-600 shadow-sm transition-all hover:-translate-y-0.5',
                  accent.hoverBorder,
                  accent.hoverText
                )}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-5">
            <div className="flex items-center gap-3">
              <div className={clsx('relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.to)}>
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Hi AI</p>
                <p className="text-xs font-medium text-slate-400">Tư vấn dựa trên dữ liệu đã ghi nhận</p>
              </div>
            </div>
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 sm:inline-flex">
              Sẵn sàng trò chuyện
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 px-4 py-5 md:px-5">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div className={clsx('mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg', accent.from, accent.to)}>
                  <span className="material-symbols-outlined text-[30px]">auto_awesome</span>
                </div>
                <p className="text-lg font-extrabold text-slate-900">Bắt đầu trò chuyện với Hi AI</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Bạn có thể hỏi về triệu chứng, lịch chu kỳ, dinh dưỡng hoặc cách chăm sóc trong từng giai đoạn.
                </p>
                <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleSend(question)}
                      className={clsx(
                        'rounded-2xl px-4 py-3 text-left text-xs font-bold leading-relaxed transition-colors',
                        accent.chipBg,
                        accent.chipText,
                        accent.chipHover
                      )}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className={clsx('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <div className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.to)}>
                        <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                      </div>
                    )}
                    <div
                      className={clsx(
                        'max-w-[78%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm',
                        message.role === 'user'
                          ? clsx('rounded-br-md bg-gradient-to-br text-white', accent.from, accent.to)
                          : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isPending && (
              <div className="mt-4 flex items-end gap-2">
                <div className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent.from, accent.to)}>
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                </div>
                <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <span key={index} className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${index * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-5">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition-colors focus-within:bg-white">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn... Enter để gửi"
                rows={1}
                className={clsx(
                  'max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm font-medium leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2',
                  accent.ring
                )}
              />
              <Button onClick={() => handleSend()} loading={isPending} disabled={!input.trim()} className="h-10 w-10 rounded-xl px-0">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
