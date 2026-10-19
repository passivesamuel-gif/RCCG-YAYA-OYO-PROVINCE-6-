import React from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#FAF8F2] text-left">
      <div className="max-w-md w-full bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

        {/* Header */}
        <div className="space-y-3 pt-1">
          <div className="w-14 h-20">
            <img
              src="/assets/yaya-crest.png"
              alt="RCCG YAYA Crest"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-bold text-[#123D2A] tracking-widest uppercase">
                404
              </span>
              <span className="text-xs text-[#737B76]">·</span>
              <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-[#737B76]">
                Page Not Found
              </span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#123D2A] tracking-tight">
              Page Not Found
            </h1>
            <div className="h-[1.5px] w-12 bg-[#D4AF65] mt-2" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#252B2A]/85 leading-relaxed">
          The page or book you are searching for is not registered in the RCCG YAYA Oyo Province 6 digital library.
        </p>

        {/* Scriptural Inscription in Open Sans italic */}
        <div className="p-3.5 bg-[#FAF8F2] border-l-2 border-[#123D2A] text-xs space-y-1">
          <p className="font-sans italic text-[#737B76]">
            &ldquo;Thy word is a lamp unto my feet, and a light unto my path.&rdquo;
          </p>
          <p className="text-[10px] font-heading font-semibold text-[#123D2A] uppercase tracking-wider">
            Psalm 119:105
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <button
            onClick={() => navigate(user ? '/library' : '/')}
            className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[42px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF65]" />
            <span>{user ? 'Return to Library' : 'Return to Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
