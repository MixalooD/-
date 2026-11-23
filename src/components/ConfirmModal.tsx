import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = 'Отмена',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-lg bg-[#FBF9F5] border border-[#D6CEBE] rounded-md shadow-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className="w-5 h-5 text-[#78350F] shrink-0"
              aria-hidden="true"
            />
            <h2
              id="confirm-modal-title"
              className="font-editorial text-2xl font-semibold text-[#1C1917]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label="Закрыть окно подтверждения"
            className="p-1.5 text-[#57534E] hover:text-[#1C1917] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-[#292524] leading-relaxed">
          {description}
        </p>

        {details.length > 0 && (
          <ul className="mt-4 py-3 px-4 bg-[#F2EDE4] border border-[#E6DFD3] rounded-md space-y-1.5 text-xs text-[#292524]">
            {details.map((line, index) => (
              <li key={index} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 pt-4 border-t border-[#E6DFD3] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium text-[#292524] bg-transparent border border-[#D6CEBE] hover:bg-[#F2EDE4] rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {isBusy ? 'Выполняется…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
