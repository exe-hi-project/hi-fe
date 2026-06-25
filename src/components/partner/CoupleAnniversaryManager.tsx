import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  CalendarBlank,
  Heart,
  Plus,
  Trash,
  PencilSimple,
  Sparkle,
} from '@phosphor-icons/react';
import api from '../../lib/api';
import CoupleAnniversaryPreviewCalendar from './CoupleAnniversaryPreviewCalendar';
import AnniversaryEventModal from './AnniversaryEventModal';
import { normalizeAnniversarySummary, STICKER_MAP } from '../../utils/coupleAnniversaryCalendar';
import type {
  CoupleAnniversarySummary,
  CoupleAnniversaryEvent,
} from '../../types/shared';
import Button from '../ui/Button';

interface CoupleAnniversaryManagerProps {
  variant: 'female' | 'male';
}

const COLOR_LABELS: Record<string, string> = {
  pink: 'Hồng ngọt ngào',
  rose: 'Đỏ nồng nàn',
  violet: 'Tím lãng mạn',
  sky: 'Xanh thanh bình',
  emerald: 'Xanh ngọc bích',
  amber: 'Vàng ấm áp',
};

export default function CoupleAnniversaryManager({ variant }: CoupleAnniversaryManagerProps) {
  const isMale = variant === 'male';
  const queryClient = useQueryClient();
  const accentText = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentBg = isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700';
  const accentBorder = isMale ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-pink-400 focus:ring-pink-100';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalEvent, setModalEvent] = useState<CoupleAnniversaryEvent | null>(null);

  const { data: summary, isLoading, isError } = useQuery<CoupleAnniversarySummary>({
    queryKey: ['partner-anniversaries'],
    queryFn: () => api.get('/partner/anniversaries').then(({ data }) => normalizeAnniversarySummary(data.anniversaries)),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => api.delete(`/partner/anniversaries/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-anniversaries'] });
      toast.success('Đã xóa kỷ niệm');
    },
    onError: () => {
      toast.error('Không thể xóa kỷ niệm');
    },
  });

  const openEditStart = () => {
    if (summary?.startDate) {
      setModalEvent(summary.startDate);
      setModalDate(summary.startDate.eventDate.slice(0, 10));
    } else {
      setModalEvent({
        _id: '',
        type: 'START_DATE',
        eventDate: new Date().toISOString(),
        title: 'Ngày bên nhau',
        note: '',
        color: 'pink',
        effect: 'sparkle',
        icon: 'favorite',
        sticker: 'heart',
      } as CoupleAnniversaryEvent);
      setModalDate(new Date().toISOString().slice(0, 10));
    }
    setIsModalOpen(true);
  };

  const openAddEvent = () => {
    setModalEvent(null);
    setModalDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const openEditEvent = (event: CoupleAnniversaryEvent) => {
    setModalEvent(event);
    setModalDate(event.eventDate.slice(0, 10));
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 text-center text-rose-600">
        Đã có lỗi xảy ra khi tải thông tin kỷ niệm. Vui lòng thử lại sau.
      </div>
    );
  }

  const COLOR_LABELS: Record<string, string> = {
    pink: 'Hồng ngọt ngào',
    rose: 'Đỏ nồng nàn',
    violet: 'Tím lãng mạn',
    sky: 'Xanh thanh bình',
    emerald: 'Xanh ngọc bích',
    amber: 'Vàng ấm áp',
  };

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Cột chính bên trái: Lịch kỷ niệm */}
      <div className="md:col-span-2">
        <CoupleAnniversaryPreviewCalendar
          enabled={true}
          variant={variant}
          className="w-full h-full"
        />
      </div>

      {/* Cột phụ bên phải: Ngày bên nhau & Tip bento card */}
      <div className="space-y-6 flex flex-col justify-between">
        {/* Hành trình yêu thương Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-6 shadow-sm flex flex-col justify-between flex-1 min-h-[160px] bento-card-hover">
          <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-pink-100/40 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col justify-between h-full">
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${accentBg}`}>
                <Heart size={14} weight="fill" />
                Hành trình yêu thương
              </span>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {summary?.daysTogether !== null && summary?.daysTogether !== undefined ? (
                  <>
                    {summary.startDate?.title || 'Đồng hành'}{' '}
                    <span
                      className="text-3xl font-black tracking-tight inline-block align-middle"
                      style={{
                        background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {summary.daysTogether}
                    </span>{' '}
                    ngày
                  </>
                ) : (
                  'Chưa thiết lập ngày bên nhau'
                )}
              </h2>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {summary?.startDate
                  ? `Từ: ${new Date(summary.startDate.eventDate).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}`
                  : 'Hãy cài đặt ngày hai bạn bắt đầu bên nhau nhé.'}
              </p>
            </div>
            <Button onClick={openEditStart} className="mt-5 w-full">
              {summary?.startDate ? 'Cài đặt giao diện' : 'Chọn ngày'}
            </Button>
          </div>
        </div>

        {/* Tip / Mẹo nhỏ thêm kỷ niệm Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-pink-100 bg-gradient-to-br from-pink-50/50 to-violet-50/50 p-6 shadow-sm flex flex-col justify-between flex-1 min-h-[160px] bento-card-hover">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm border border-pink-100/30">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Yêu thương lan tỏa</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Mỗi ngày kỷ niệm được lưu trữ sẽ giúp hai bạn dễ dàng xem lại các cột mốc ý nghĩa trong mối quan hệ.
            </p>
          </div>
          <button
            onClick={openAddEvent}
            className={`mt-4 w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${accentBg} hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
          >
            <Plus size={14} weight="bold" />
            Thêm kỷ niệm mới
          </button>
        </div>
      </div>

      {/* 4. Special Memories/Dates list */}
      <div className="md:col-span-3">
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Những ngày kỷ niệm đặc biệt</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Mốc thời gian lưu giữ những khoảnh khắc hạnh phúc của hai bạn.</p>
            </div>
          </div>

          {summary?.events && summary.events.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.events.map((event) => (
                <div
                  key={event._id}
                  className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-pink-200 hover:bg-white sm:flex-row sm:items-start"
                >
                  <div className="flex items-start gap-4">
                    <div className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm border border-slate-100 text-2xl`}>
                      {STICKER_MAP[event.sticker] || STICKER_MAP.heart}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(event.eventDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          event.color === 'pink' ? 'bg-pink-100 text-pink-700' : event.color === 'rose' ? 'bg-rose-100 text-rose-700' : event.color === 'violet' ? 'bg-violet-100 text-violet-700' : event.color === 'sky' ? 'bg-sky-100 text-sky-700' : event.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {event.effect !== 'none' && <Sparkle size={10} weight="fill" />}
                          {COLOR_LABELS[event.color]}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-black text-slate-900">{event.title}</h4>
                      {event.note && (
                        <p className="mt-1 text-sm font-semibold text-slate-500 whitespace-pre-wrap">{event.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => openEditEvent(event)}
                      className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      title="Chỉnh sửa"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bạn chắc chắn muốn xóa kỷ niệm này chứ?')) {
                          deleteEventMutation.mutate(event._id);
                        }
                      }}
                      className="flex size-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                      title="Xóa"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CalendarBlank size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-400">Chưa có ngày kỷ niệm đặc biệt nào.</p>
            </div>
          )}
        </section>
      </div>

      {/* Reusable Memory Event Form Modal (Add / Edit / Start Date) */}
      <AnniversaryEventModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={modalDate}
        existingEvent={modalEvent}
        variant={variant}
      />
    </div>
  );
}

