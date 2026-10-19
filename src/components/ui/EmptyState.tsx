import React from 'react';
import { BookOpen, Compass, Bookmark, Upload } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  type?: 'library' | 'reading' | 'admin' | 'search' | 'error';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'library',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const configs = {
    library: {
      icon: <BookOpen className="w-8 h-8 text-[#123D2A]" strokeWidth={1.5} />,
      defaultTitle: 'The library is being prepared.',
      defaultDescription:
        'Books will appear here once uploaded by the library team. Please check back soon.',
      actionLabel: undefined,
    },
    reading: {
      icon: <Bookmark className="w-8 h-8 text-[#123D2A]" strokeWidth={1.5} />,
      defaultTitle: 'No books in progress.',
      defaultDescription:
        'Books you start reading will appear here with your saved page progress.',
      actionLabel: 'Browse Library',
    },
    admin: {
      icon: <Upload className="w-8 h-8 text-[#123D2A]" strokeWidth={1.5} />,
      defaultTitle: 'No books uploaded yet.',
      defaultDescription:
        'Upload your first PDF book to make it available to all readers.',
      actionLabel: 'Upload First Book',
    },
    search: {
      icon: <Compass className="w-8 h-8 text-[#123D2A]" strokeWidth={1.5} />,
      defaultTitle: 'No books match your search.',
      defaultDescription:
        'Try different keywords or clear the category filter to see all books.',
      actionLabel: 'Reset Filters',
    },
    error: {
      icon: <Compass className="w-8 h-8 text-[#A8322D]" strokeWidth={1.5} />,
      defaultTitle: 'Unable to connect to the library right now.',
      defaultDescription: 'Please verify your internet connection or try again.',
      actionLabel: 'Retry',
    },
  }[type];

  const headingText = title || configs.defaultTitle;
  const bodyText = description || configs.defaultDescription;
  const buttonLabel = actionText || configs.actionLabel;

  return (
    <div
      className={`py-16 sm:py-24 px-6 max-w-xl mx-auto text-center space-y-6 ${className}`}
    >
      {/* Refined Bookplate Crest / Linework Frame */}
      <div className="relative w-20 h-20 mx-auto rounded-full border border-[#D4AF65] flex items-center justify-center bg-white shadow-xs">
        <div className="absolute inset-1.5 rounded-full border border-[#EEF5F0]" />
        {configs.icon}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-heading font-semibold tracking-[0.25em] text-[#123D2A] uppercase">
          Library Notice
        </p>
        <h3 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
          {headingText}
        </h3>
        <div className="w-12 h-[1.5px] bg-[#D4AF65] mx-auto mt-2" />
        <p className="text-xs sm:text-sm text-[#737B76] max-w-md mx-auto leading-relaxed pt-2">
          {bodyText}
        </p>
      </div>

      {buttonLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction}>
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
