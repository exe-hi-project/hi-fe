import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass';
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ variant = 'default', padding = 'md', children, className, ...props }: CardProps) {
  const variants = {
    default: 'bg-white border border-gray-100 shadow-sm',
    gradient: 'bg-gradient-to-br from-rose-50 to-pink-50 border border-pink-100',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg',
  };
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div className={clsx('rounded-2xl', variants[variant], paddings[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-lg font-bold text-gray-800', className)} {...props}>
      {children}
    </h3>
  );
}
