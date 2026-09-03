import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="card max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 shadow-2xl scrollbar-thin sm:rounded-b-[var(--radius-card)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="-mr-1.5 -mt-1.5 shrink-0 rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="text-sm text-[var(--text-muted)]">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
