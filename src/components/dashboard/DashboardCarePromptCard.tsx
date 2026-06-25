import { Link } from 'react-router-dom';

interface DashboardCarePromptCardProps {
  variant: 'female' | 'male';
  phase?: string;
  partnerName?: string;
  onAskHi?: () => void;
  onPrimaryAction?: () => void;
}

export default function DashboardCarePromptCard({
  variant,
  phase,
  partnerName = 'Người ấy',
  onAskHi,
  onPrimaryAction,
}: DashboardCarePromptCardProps) {
  const female = variant === 'female';
  const title = female ? 'Gợi ý chăm sóc hôm nay' : `Chăm sóc ${partnerName} hôm nay`;
  const description = female
    ? `Dựa trên giai đoạn ${phase || 'hiện tại'}, Hi gợi ý một nhịp chăm sóc nhỏ để bạn ghi nhận cơ thể và cảm xúc.`
    : `Một hành động nhỏ, đúng lúc, giúp ${partnerName} cảm thấy được đồng hành hơn trong ngày.`;
  const points = female
    ? ['Ghi nhanh triệu chứng nổi bật', 'Hỏi Hi AI nếu có dấu hiệu lạ', 'Chọn một việc nhẹ để cơ thể nghỉ']
    : ['Gửi một lời nhắn quan tm', 'Nhắc uống nước hoặc nghỉ sớm', 'Xem lịch kỷ niệm gần nhất'];
  const tone = female
    ? 'border-rose-100 bg-gradient-to-br from-white via-rose-50/70 to-sky-50/60 text-rose-500 shadow-rose-100/40'
    : 'border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/60 text-blue-500 shadow-blue-100/40';
  const button = female ? 'Ghi log hôm nay' : 'Gửi lời nhắn';
  const secondaryHref = female ? '/chat' : '/partner';

  return (
    <section className={`overflow-hidden rounded-3xl border p-5 shadow-sm ${tone}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Hi care prompt
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          <button type="button" onClick={onPrimaryAction} className="hi-btn-primary whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black">
            {button}
          </button>
          <button type="button" onClick={onAskHi} className="hi-btn-secondary whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black">
            Hỏi Hi AI
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point} className="flex min-h-14 items-center gap-2 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-sm font-bold text-slate-600 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="min-w-0 leading-snug">{point}</span>
          </div>
        ))}
      </div>
      <Link to={secondaryHref} className="sr-only">Mở chi tiết</Link>
    </section>
  );
}