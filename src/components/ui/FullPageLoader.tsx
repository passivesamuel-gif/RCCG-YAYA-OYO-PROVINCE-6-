import React, { useState, useEffect } from 'react';
import { Button } from './Button';

export const FullPageLoader: React.FC = () => {
  const [timedOut, setTimedOut] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    // 15-second timeout fallback
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 15000);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-label="Loading"
      className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F2] px-4 py-12 transition-opacity duration-300 animate-fadeIn"
    >
      <div className="max-w-sm w-full mx-auto text-center flex flex-col items-center space-y-4">
        {/* a) Official Crest */}
        <div className="h-[88px] sm:h-[104px] w-auto flex items-center justify-center">
          <img
            src="/assets/yaya-crest.png"
            alt="RCCG YAYA Crest"
            className="h-full w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* b) Name & E-Library */}
        <div className="space-y-1 pt-1">
          <h1 className="font-heading font-extrabold text-[#123D2A] text-lg sm:text-xl tracking-tight">
            RCCG YAYA OYO 6
          </h1>
          <p className="font-heading font-semibold text-[11px] sm:text-xs text-[#737B76] tracking-[0.25em] uppercase">
            E-LIBRARY
          </p>
        </div>

        {/* Thin Gold Hairline */}
        <div className="w-12 h-[1px] bg-[#D4AF65] my-2 mx-auto" />

        {/* c) Minimal Loader or Timeout Notice */}
        <div className="pt-2 min-h-[40px] flex flex-col items-center justify-center w-full">
          {timedOut ? (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-[#737B76] font-medium">
                Taking longer than usual.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="w-[120px] h-[3px] bg-[#EEF5F0] rounded-full overflow-hidden relative">
              {!prefersReducedMotion && (
                <div className="absolute top-0 bottom-0 w-12 bg-[#123D2A] rounded-full animate-slideBar" />
              )}
            </div>
          )}
          <span className="sr-only">Loading</span>
        </div>
      </div>
    </div>
  );
};
