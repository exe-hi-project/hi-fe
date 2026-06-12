import { clsx } from 'clsx';

type SubscriptionLike = {
  plan?: string | null;
  status?: string | null;
};

interface PlanStatusPillProps {
  subscription?: SubscriptionLike | null;
  compact?: boolean;
  className?: string;
}

function getPlanMeta(subscription?: SubscriptionLike | null) {
  const plan = (subscription?.plan ?? 'free').toLowerCase();
  const active = subscription?.status === 'active';
  if (active && plan.includes('yearly')) {
    return {
      label: 'PREMIUM NĂM',
      sublabel: 'Tiết kiệm',
      className: 'bg-[linear-gradient(135deg,#fb7185,#d8b4fe,#fbbf24)] text-white shadow-[0_10px_26px_rgba(244,114,182,0.24)]',
    };
  }
  if (active && (plan.includes('monthly') || plan === 'premium')) {
    return {
      label: 'PREMIUM THÁNG',
      sublabel: 'Đang mở khóa',
      className: 'bg-[linear-gradient(135deg,#fb7185,#ec4899,#c084fc)] text-white shadow-[0_10px_26px_rgba(236,72,153,0.24)]',
    };
  }
  return {
    label: 'FREE',
    sublabel: 'Cơ bản',
    className: 'border border-sky-100 bg-white/90 text-slate-600 shadow-sm',
  };
}

export default function PlanStatusPill({ subscription, compact = false, className }: PlanStatusPillProps) {
  const meta = getPlanMeta(subscription);
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-black uppercase tracking-wide transition-all duration-300 hover:-translate-y-0.5',
        compact ? 'px-2.5 py-1 text-[10px]' : 'gap-2 px-3.5 py-2 text-[11px]',
        meta.className,
        className,
      )}
    >
      <span>{meta.label}</span>
      {!compact && (
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-extrabold normal-case tracking-normal text-current">
          {meta.sublabel}
        </span>
      )}
    </span>
  );
}
