import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'period' | 'predicted' | 'ovulation' | 'success' | 'warning' | 'info' | 'gray';
  size?: 'sm' | 'md';
}

export default function Badge({ variant = 'info', size = 'md', children, className, ...props }: BadgeProps) {
  const variants = {
    period: 'bg-rose-100 text-rose-700',
    predicted: 'bg-purple-100 text-purple-700',
    ovulation: 'bg-green-100 text-green-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-pink-100 text-pink-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-xs' };
  return (
    <span className={clsx('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
