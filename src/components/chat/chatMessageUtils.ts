import type { ChatMessage } from '../../types';

export interface ChatSession {
  sessionDate: string;
  title: string;
  messageCount: number;
  lastMessageAt?: string;
}

function messageTime(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function isTempMessage(message: ChatMessage) {
  return message._id.startsWith('temp-');
}

function isSameOptimisticUserMessage(first: ChatMessage, second: ChatMessage) {
  if (first.role !== 'user' || second.role !== 'user') return false;
  if (first.content.trim() !== second.content.trim()) return false;
  if ((first.sessionDate ?? '') !== (second.sessionDate ?? '')) return false;

  const delta = Math.abs(messageTime(first.createdAt) - messageTime(second.createdAt));
  return delta <= 120_000 && (isTempMessage(first) || isTempMessage(second));
}

export function mergeChatMessages(...messageGroups: Array<ChatMessage[] | undefined>) {
  const merged: ChatMessage[] = [];

  messageGroups.flatMap((group) => group ?? []).forEach((message) => {
    const sameIdIndex = merged.findIndex((item) => item._id === message._id);
    if (sameIdIndex >= 0) {
      merged[sameIdIndex] = message;
      return;
    }

    const sameOptimisticIndex = merged.findIndex((item) => isSameOptimisticUserMessage(item, message));
    if (sameOptimisticIndex >= 0) {
      merged[sameOptimisticIndex] = isTempMessage(message) ? merged[sameOptimisticIndex] : message;
      return;
    }

    merged.push(message);
  });

  return merged.sort((first, second) => messageTime(first.createdAt) - messageTime(second.createdAt));
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
