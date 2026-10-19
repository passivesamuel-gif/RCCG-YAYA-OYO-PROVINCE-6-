import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop tap to close */}
      <div
        className="fixed inset-0 bg-[#252B2A]/60 backdrop-blur-[2px] transition-opacity z-40 cursor-pointer"
        onClick={onClose}
        aria-label="Close dialog overlay"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center z-50 relative pointer-events-none">
        <div
          className="relative transform overflow-hidden rounded-xs bg-white text-left shadow-2xl border border-[#EEF5F0] w-full max-w-md p-6 space-y-4 pointer-events-auto z-50 my-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header with 44px Touch Target X Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#123D2A]">
                  {title}
                </h3>
                <p className="text-[10px] text-[#737B76] uppercase tracking-wider">
                  Action Confirmation
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#737B76] hover:text-[#123D2A] hover:bg-[#EEF5F0] rounded-xs transition-colors cursor-pointer shrink-0 -mr-2 -mt-2 z-50"
              aria-label="Close confirmation dialog"
              title="Close"
            >
              <X className="w-5 h-5 text-[#123D2A]" />
            </button>
          </div>

          <p className="text-xs text-[#252B2A]/85 leading-relaxed border-t border-[#EEF5F0] pt-3">
            {message}
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF5F0]">
            <Button variant="quiet" onClick={onClose} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button
              variant={isDestructive ? 'destructive' : 'primary'}
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
