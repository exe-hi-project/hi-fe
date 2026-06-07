export interface ChatSession {
  sessionDate: string;
  title: string;
  messageCount: number;
  lastMessageAt?: string;
}

export function todaySessionDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatSessionLabel(value?: string) {
  if (!value) return 'Hôm nay';
  const date = new Date(`${value}T00:00:00`);
  const today = new Date(`${todaySessionDate()}T00:00:00`);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatChatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
