import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx('animate-spin rounded-full border-2 border-pink-200 border-t-rose-500', sizes[size])} />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🌸</div>
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Đang tải...</p>
      </div>
    </div>
  );
}
