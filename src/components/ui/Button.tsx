import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none active:scale-[0.98]';
    const variants = {
      primary: 'lp-btn-gradient text-white focus:ring-pink-300',
      secondary: 'lp-btn-white border border-pink-100 bg-white text-pink-600 hover:text-purple-600 focus:ring-pink-200 shadow-sm',
      outline: 'lp-btn-white border border-pink-200 bg-white text-pink-600 hover:text-purple-600 focus:ring-pink-200',
      ghost: 'bg-transparent text-slate-600 hover:bg-pink-50 hover:text-pink-600 focus:ring-pink-200',
      danger: 'bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 focus:ring-rose-300 shadow-sm hover:shadow-rose-200/70 hover:-translate-y-0.5',
      icon: 'bg-white/90 text-slate-500 border border-white/80 shadow-sm hover:-translate-y-0.5 hover:border-pink-100 hover:bg-pink-50 hover:text-pink-500 focus:ring-pink-200',
    };
    const sizes = {
      sm: variant === 'icon' ? 'h-8 w-8 text-sm' : 'px-3 py-1.5 text-sm',
      md: variant === 'icon' ? 'h-9 w-9 text-sm' : 'px-5 py-2.5 text-sm',
      lg: variant === 'icon' ? 'h-11 w-11 text-base' : 'px-6 py-3 text-base',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
