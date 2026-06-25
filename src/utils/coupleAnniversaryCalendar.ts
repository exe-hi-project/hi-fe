import type {
  CoupleAnniversaryColor,
  CoupleAnniversaryEffect,
  CoupleAnniversaryEvent,
  CoupleAnniversarySummary,
} from '../types/shared';

export interface AnniversaryOccurrence {
  key: string;
  displayDate: string;
  isStartDate: boolean;
  event: CoupleAnniversaryEvent;
}

function decodeLatin1Mojibake(value: string) {
  if (!/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00ba|\u00e1\u00bb/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
}

export function repairVietnameseText(value?: string | null, fallback = '') {
  if (!value) return fallback;

  const decoded = decodeLatin1Mojibake(value);
  const compact = decoded.replace(/\s+/g, ' ').trim();
  const fuzzy = compact.toLowerCase().replace(/\uFFFD/g, '?');

  if (/^ng.y b.n nhau$/.test(fuzzy)) return '\u004e\u0067\u00e0\u0079\u0020\u0062\u00ea\u006e\u0020\u006e\u0068\u0061\u0075';
  if (/^.?.ng h.nh$/.test(fuzzy)) return '\u0110\u1ed3\u006e\u0067\u0020\u0068\u00e0\u006e\u0068';

  return compact;
}

export function normalizeAnniversaryEvent(event: CoupleAnniversaryEvent): CoupleAnniversaryEvent {
  return {
    ...event,
    title: repairVietnameseText(event.title, '\u004e\u0067\u00e0\u0079\u0020\u0062\u00ea\u006e\u0020\u006e\u0068\u0061\u0075'),
    note: event.note ? repairVietnameseText(event.note) : event.note,
  };
}

export function normalizeAnniversarySummary(
  anniversaries?: CoupleAnniversarySummary | null,
): CoupleAnniversarySummary {
  if (!anniversaries) {
    return {
      startDate: null,
      daysTogether: null,
      events: [],
      options: { colors: [], effects: [], icons: [], stickers: [] },
    };
  }

  return {
    ...anniversaries,
    startDate: anniversaries.startDate ? normalizeAnniversaryEvent(anniversaries.startDate) : anniversaries.startDate,
    events: (anniversaries.events ?? []).map(normalizeAnniversaryEvent),
  };
}
export const anniversaryCellClass: Record<CoupleAnniversaryColor, string> = {
  pink: 'border-pink-200 bg-pink-50 text-pink-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
  sky: 'border-sky-200 bg-sky-50 text-sky-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
};

export const anniversaryDotClass: Record<CoupleAnniversaryColor, string> = {
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

export function anniversaryEffectClass(effect?: CoupleAnniversaryEffect | string) {
  if (effect === 'sparkle') return 'animate-anniversary-sparkle ring-1 ring-white/80';
  if (effect === 'float') return '[&_.anniversary-icon]:animate-float';
  if (effect === 'glow') return 'animate-anniversary-glow';
  if (effect === 'confetti') {
    return 'animate-anniversary-confetti bg-[length:220%_220%]';
  }
  return '';
}

export function anniversaryBackground(color?: CoupleAnniversaryColor, effect?: CoupleAnniversaryEffect | string) {
  const colorClass = anniversaryCellClass[color ?? 'pink'] ?? anniversaryCellClass.pink;
  if (effect === 'confetti') {
    return `${colorClass} bg-gradient-to-br from-white/80 via-transparent to-white/50`;
  }
  return colorClass;
}

export function toLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function monthlyOccurrenceIso(source?: string, year?: number, month?: number) {
  if (!source || year === undefined || month === undefined) return null;
  const sourceDate = new Date(`${source.slice(0, 10)}T00:00:00`);
  const day = Math.min(sourceDate.getDate(), daysInMonth(year, month));
  return toLocalIsoDate(new Date(year, month, day));
}

export function yearlyOccurrenceIso(source?: string, year?: number) {
  if (!source || year === undefined) return null;
  const sourceDate = new Date(`${source.slice(0, 10)}T00:00:00`);
  const month = sourceDate.getMonth();
  const day = Math.min(sourceDate.getDate(), daysInMonth(year, month));
  return toLocalIsoDate(new Date(year, month, day));
}

export function getDayAnniversaryOccurrences(
  anniversaries: CoupleAnniversarySummary | undefined | null,
  isoDate: string,
  year: number,
  month: number,
) {
  const occurrences: AnniversaryOccurrence[] = [];
  if (anniversaries?.startDate && monthlyOccurrenceIso(anniversaries.startDate.eventDate, year, month) === isoDate) {
    occurrences.push({
      key: `start-${isoDate}`,
      displayDate: isoDate,
      isStartDate: true,
      event: normalizeAnniversaryEvent({ ...anniversaries.startDate, title: anniversaries.startDate.title || '\u004e\u0067\u00e0\u0079\u0020\u0062\u00ea\u006e\u0020\u006e\u0068\u0061\u0075' }),
    });
  }
  for (const event of anniversaries?.events ?? []) {
    const displayDate = yearlyOccurrenceIso(event.eventDate, year);
    if (displayDate === isoDate) {
      occurrences.push({ key: `${event._id}-${displayDate}`, displayDate, isStartDate: false, event: normalizeAnniversaryEvent(event) });
    }
  }
  return occurrences;
}

export function getUpcomingAnniversaryOccurrences(
  anniversaries: CoupleAnniversarySummary | undefined | null,
  origin = new Date(),
  limit = 3,
) {
  const todayIso = toLocalIsoDate(origin);
  const items: AnniversaryOccurrence[] = [];
  if (anniversaries?.startDate) {
    const current = monthlyOccurrenceIso(anniversaries.startDate.eventDate, origin.getFullYear(), origin.getMonth());
    const nextMonth = new Date(origin.getFullYear(), origin.getMonth() + 1, 1);
    const displayDate = current && current >= todayIso
      ? current
      : monthlyOccurrenceIso(anniversaries.startDate.eventDate, nextMonth.getFullYear(), nextMonth.getMonth());
    if (displayDate) {
      items.push({
        key: `start-${displayDate}`,
        displayDate,
        isStartDate: true,
        event: normalizeAnniversaryEvent({ ...anniversaries.startDate, title: anniversaries.startDate.title || '\u004e\u0067\u00e0\u0079\u0020\u0062\u00ea\u006e\u0020\u006e\u0068\u0061\u0075' }),
      });
    }
  }
  for (const event of anniversaries?.events ?? []) {
    const current = yearlyOccurrenceIso(event.eventDate, origin.getFullYear());
    const displayDate = current && current >= todayIso ? current : yearlyOccurrenceIso(event.eventDate, origin.getFullYear() + 1);
    if (displayDate) {
      items.push({ key: `${event._id}-${displayDate}`, displayDate, isStartDate: false, event: normalizeAnniversaryEvent(event) });
    }
  }
  return items
    .sort((first, second) => first.displayDate.localeCompare(second.displayDate))
    .slice(0, limit);
}

export const STICKER_MAP: Record<string, string> = {
  heart: '❤️',
  ring: '💍',
  flower: '🌸',
  moon: '🌙',
  sparkles: '✨',
  ribbon: '🎀',
  beer: '🍻',
  airplane: '✈️',
  movie: '🎬',
  gift: '🎁',
  camera: '📷',
  teddy: '🧸',
  house: '🏡',
  key: '🔑',
};

export const STICKER_EMOJIS: Record<string, string> = {
  heart: '❤️ Trái tim',
  ring: '💍 Nhẫn',
  flower: '🌸 Hoa',
  moon: '🌙 Trăng',
  sparkles: '✨ Lấp lánh',
  ribbon: '🎀 Ruy băng',
  beer: '🍻 Cụng ly',
  airplane: '✈️ Du lịch',
  movie: '🎬 Xem phim',
  gift: '🎁 Quà tặng',
  camera: '📷 Chụp ảnh',
  teddy: '🧸 Gấu bông',
  house: '🏡 Ngôi nhà',
  key: '🔑 Chìa khóa',
};

export const ICONS = [
  'favorite',
  'celebration',
  'cake',
  'local_florist',
  'photo_camera',
  'star',
  'flight',
  'restaurant',
  'movie',
  'home',
  'pets',
  'wine_bar'
];

export const ICON_LABELS: Record<string, string> = {
  favorite: '❤️ Trái tim',
  celebration: '🎉 Lễ hội',
  cake: '🎂 Bánh kem',
  local_florist: '🌸 Hoa lá',
  photo_camera: '📷 Máy ảnh',
  star: '⭐ Ngôi sao',
  flight: '✈️ Máy bay',
  restaurant: '🍴 Nhà hàng',
  movie: '🎬 Điện ảnh',
  home: '🏡 Nhà cửa',
  pets: '🐾 Thú cưng',
  wine_bar: '🍷 Ly rượu'
};



