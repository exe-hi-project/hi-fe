interface PageBackdropProps {
  variant?: 'female' | 'male' | 'admin';
}

const variantClasses = {
  female: {
    base: 'bg-[#fdfbf7]',
    first: 'bg-rose-100/70',
    second: 'bg-sky-100/60',
    third: 'bg-yellow-100/40',
  },
  male: {
    base: 'bg-[#f5fbff]',
    first: 'bg-sky-200/50',
    second: 'bg-indigo-100/45',
    third: 'bg-pink-100/25',
  },
  admin: {
    base: 'bg-[#f8fbff]',
    first: 'bg-sky-200/40',
    second: 'bg-pink-200/35',
    third: 'bg-violet-100/35',
  },
};

export default function PageBackdrop({ variant = 'female' }: PageBackdropProps) {
  const cls = variantClasses[variant];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className={`lp-blob absolute -left-28 -top-28 h-[520px] w-[520px] rounded-full blur-3xl ${cls.first}`} />
      <div className={`lp-blob absolute -bottom-28 -right-24 h-[480px] w-[480px] rounded-full blur-3xl ${cls.second}`} />
      {variant === 'female' ? (
        <div className={`lp-blob absolute top-[40%] left-[30%] h-[300px] w-[300px] rounded-full blur-3xl opacity-40 ${cls.third}`} />
      ) : (
        <div className={`lp-blob absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${cls.third}`} />
      )}
    </div>
  );
}
