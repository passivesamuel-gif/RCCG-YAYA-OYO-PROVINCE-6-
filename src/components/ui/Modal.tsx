import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isUploading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  isUploading = false,
}) => {
  const handleAttemptClose = () => {
    if (isUploading) {
      const confirmLeave = window.confirm('Leave without finishing? Your file upload is still in progress.');
      if (!confirmLeave) return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleAttemptClose();
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
  }, [isOpen, isUploading]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0 bg-[#252B2A]/60 backdrop-blur-[2px] transition-opacity z-40 cursor-pointer"
        onClick={handleAttemptClose}
        aria-label="Close overlay"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center z-50 relative pointer-events-none">
        <div
          className={`relative transform overflow-hidden rounded-xs bg-white text-left shadow-2xl border border-[#D4AF65]/35 w-full ${widthClass} p-5 sm:p-8 space-y-5 pointer-events-auto z-50 my-auto`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Top Forest Green Accent Rule */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

          {/* Modal Header with 44px Touch Target X Close Button */}
          <div className="flex items-start justify-between gap-4 border-b border-[#EEF5F0] pb-3 pt-1">
            <div className="space-y-1">
              {subtitle && (
                <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
                  {subtitle}
                </p>
              )}
              <h2 className="font-heading font-extrabold text-xl text-[#123D2A] tracking-tight">
                {title}
              </h2>
            </div>

            {/* Prominent 44px touch target Close Button */}
            <button
              onClick={handleAttemptClose}
              type="button"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#737B76] hover:text-[#123D2A] hover:bg-[#EEF5F0] rounded-xs transition-colors cursor-pointer shrink-0 -mr-2 -mt-2 z-50"
              aria-label="Close dialog window"
              title="Close"
            >
              <X className="w-6 h-6 text-[#123D2A]" />
            </button>
          </div>

          {/* Modal Body */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};
