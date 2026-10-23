import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const { user, isAdmin, loading, signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTarget = new URLSearchParams(search).get('redirect') || (isAdmin ? '/admin' : '/library');

  useEffect(() => {
    if (!loading && user) navigate(isAdmin ? '/admin' : redirectTarget === '/admin' ? '/library' : redirectTarget);
  }, [loading, user, isAdmin, navigate, redirectTarget]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);
    if (result.success) navigate(result.approvedAdmin ? '/admin' : redirectTarget === '/admin' ? '/library' : redirectTarget);
    else setErrorMessage(result.error || 'Google sign-in could not be completed. Please try again.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#FAF8F2] px-4 py-12 text-left">
      <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />
        <div className="text-center space-y-3">
          <img src="/assets/yaya-crest.png" alt="RCCG YAYA Crest" className="w-16 h-22 mx-auto object-contain" />
          <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">RCCG YAYA Oyo Province 6</p>
          <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">Continue with Google</h1>
          <p className="text-xs text-[#737B76] leading-relaxed">Use your Google account to access the e-library. Approved Google accounts open the administrator dashboard automatically.</p>
        </div>
        {errorMessage && (
          <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
            <div><p className="font-semibold text-[#8C2925]">Notice</p><p className="leading-relaxed">{errorMessage}</p></div>
          </div>
        )}
        <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white rounded-xs text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[46px]">
          <span className="text-base font-bold text-[#4285F4]">G</span>
          <span>{isSubmitting ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>
        <p className="text-[11px] text-[#737B76] text-center leading-relaxed flex items-center justify-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Reading progress is saved securely to your Google account.</p>
        <div className="pt-2 border-t border-[#EEF5F0] text-center">
          <button type="button" onClick={() => window.open(window.location.href, '_blank')} className="text-[11px] text-[#123D2A] font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Open in a new tab</button>
        </div>
      </div>
    </div>
  );
};
