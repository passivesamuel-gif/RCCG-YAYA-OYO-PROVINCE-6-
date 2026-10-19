import React from 'react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#123D2A] text-white pt-12 pb-8 border-t border-[#1A543A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#1A543A]">
          {/* Logo & Province Identity */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <Logo light size="md" />
            <p className="text-xs text-[#FAF8F2]/75 max-w-md mt-1">
              RCCG Young Adults &amp; Youths, Oyo Province 6.
            </p>
          </div>

          {/* Scripture Inscription in Open Sans italic (gold on dark green) */}
          <div className="text-center md:text-right">
            <p className="font-sans italic text-xs text-[#D4AF65]">
              &ldquo;Till I come, give attendance to reading, to exhortation, to doctrine.&rdquo;
            </p>
            <p className="text-[11px] font-heading font-semibold text-[#FAF8F2]/70 mt-1 uppercase tracking-wider">
              1 Timothy 4:13
            </p>
          </div>
        </div>

        {/* Copyright strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FAF8F2]/60">
          <p>© {new Date().getFullYear()} RCCG Young Adults &amp; Youths, Oyo Province 6. All rights reserved.</p>
          <p className="text-[11px] font-heading font-semibold text-[#D4AF65] tracking-widest uppercase">
            Discover. Read. Grow.
          </p>
        </div>
      </div>
    </footer>
  );
};
