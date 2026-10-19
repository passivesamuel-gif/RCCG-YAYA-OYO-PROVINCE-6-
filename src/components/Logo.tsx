import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  light = false,
}) => {
  // Proportions matching 374x520 official crest aspect ratio (~1:1.39)
  const iconDimensions = {
    sm: 'w-8 h-11',
    md: 'w-10 h-14 sm:w-11 sm:h-15.5',
    lg: 'w-14 h-19.5',
    xl: 'w-20 h-28',
  }[size];

  const primaryColor = light ? '#FFFFFF' : '#123D2A';
  // Gold only on dark green; secondary grey on light backgrounds for AA contrast
  const subtitleColor = light ? '#D4AF65' : '#737B76';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Official YAYA Crowned Crest - Exact Official PNG Image */}
      <div className={`relative shrink-0 ${iconDimensions} flex items-center justify-center`}>
        {/* Subtle ivory circular backing on dark green backgrounds */}
        {light && (
          <div className="absolute inset-x-0.5 bottom-1 h-3/4 bg-[#FAF8F2] rounded-full -z-10 shadow-xs" />
        )}
        <img
          src="/assets/yaya-crest.png"
          alt="RCCG YAYA Official Crest"
          className="w-full h-full object-contain"
          style={{ imageRendering: 'auto' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-none tracking-tight">
          <span
            className="font-heading font-bold text-sm sm:text-base tracking-wide"
            style={{ color: primaryColor }}
          >
            RCCG YAYA OYO 6
          </span>
          <span
            className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase mt-1 font-heading"
            style={{ color: subtitleColor }}
          >
            E-LIBRARY
          </span>
        </div>
      )}
    </div>
  );
};
