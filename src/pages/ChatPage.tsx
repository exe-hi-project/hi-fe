import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { ChatMessage } from '../types';
import { clsx } from 'clsx';

export default function ChatPage() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat'],
    queryFn: () => api.get('/chat').then((r) => r.data.messages),
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) => api.post('/chat', { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const suggestedQuestions = [
    'Chu kỳ của tôi có bình thường không?',
    'Tôi đang ở giai đoạn nào?',
    'Làm sao giảm đau bụng kinh?',
    'Khi nào tôi có khả năng thụ thai cao nhất?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">AI Chat 💬</h1>
        <p className="text-gray-500 text-sm mt-0.5">Trò chuyện với trợ lý sức khỏe AI của bạn</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        {/* AI Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-xl shadow-sm">🌸</div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Hi AI</p>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">🌸</div>
              <p className="font-semibold text-gray-700 mb-1">Xin chào! Tôi là Hi AI</p>
              <p className="text-sm text-gray-400 mb-6">Hỏi tôi bất cứ điều gì về sức khỏe của bạn</p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-left px-4 py-2 text-sm bg-pink-50 text-rose-600 rounded-xl hover:bg-pink-100 transition-colors font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={clsx('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">🌸</div>
                )}
                <div className={clsx(
                  'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                )}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isPending && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-sm">🌸</div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (Enter để gửi)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
            />
            <Button onClick={handleSend} loading={isPending} disabled={!input.trim()} className="rounded-xl px-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
