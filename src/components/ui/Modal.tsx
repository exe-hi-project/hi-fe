import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'dialog' | 'fullscreen';
}

export default function Modal({ open, onClose, title, children, footer, variant = 'dialog' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  const fullscreen = variant === 'fullscreen';
  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${fullscreen ? 'p-0' : 'p-4'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex w-full flex-col bg-white shadow-2xl animate-slide-up ${
        fullscreen ? 'h-[100dvh]' : 'max-w-md rounded-2xl'
      }`}>
        {title && (
          <div className={`flex shrink-0 items-center justify-between border-b border-gray-100 bg-white ${
            fullscreen ? 'px-4 py-4 md:px-8' : 'px-6 py-4'
          }`}>
            <h2 className={`${fullscreen ? 'text-xl' : 'text-lg'} font-bold text-gray-800`}>{title}</h2>
            <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className={fullscreen ? 'min-h-0 flex-1 overflow-y-auto bg-slate-50' : 'px-6 py-5'}>{children}</div>
        {footer && (
          <div className={`shrink-0 border-t border-gray-100 bg-white ${fullscreen ? 'px-4 py-3 md:px-8' : 'px-6 py-4'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
