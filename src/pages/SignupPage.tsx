import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, BookOpen, ExternalLink } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const {
    user,
    isAdmin,
    signInWithGoogle,
    loading: authLoading,
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryParams = new URLSearchParams(search);
  const redirectTarget = queryParams.get('redirect') || (isAdmin ? '/admin' : '/library');

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTarget);
  }, [user, authLoading, navigate, redirectTarget]);

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);
    if (result.success) navigate(redirectTarget);
    else setErrorMessage(result.error || 'Google sign-in could not be completed. Please try again.');
  };

  return (
    <div className="min-h-[85vh] grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F2] text-left">
      <div className="hidden lg:flex lg:col-span-5 bg-[#123D2A] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="space-y-4">
          <img src="/assets/yaya-crest.png" alt="RCCG YAYA Crest" className="w-16 h-22 object-contain" />
          <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#D4AF65] uppercase">
            The Redeemed Christian Church of God · Oyo Province 6
          </p>
          <h2 className="font-heading font-extrabold text-2xl tracking-tight">Create Your Reader Account</h2>
          <p className="text-xs uppercase font-heading font-semibold tracking-widest text-[#D4AF65]">E-Library</p>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>
        <div className="my-8 space-y-3 p-6 bg-white/5 border border-white/10 rounded-xs">
          <p className="font-sans italic text-sm text-[#FAF8F2]/90 leading-relaxed">
            “Thy words were found, and I did eat them; and thy word was unto me the joy and rejoicing of mine heart.”
          </p>
          <span className="text-[10px] font-heading font-semibold text-[#D4AF65] uppercase tracking-wider block">Jeremiah 15:16</span>
        </div>
        <div className="pt-4 border-t border-white/10 text-xs text-[#FAF8F2]/65 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#D4AF65] shrink-0" />
          <span>Use your Google account to access the library and save your reading progress.</span>
        </div>
      </div>

      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />
          <div className="text-center lg:hidden space-y-2 pt-1">
            <img src="/assets/yaya-crest.png" alt="RCCG YAYA Crest" className="w-14 h-20 mx-auto object-contain" />
            <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">RCCG YAYA Oyo Province 6</p>
          </div>
          <div className="space-y-1">
            <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">Create Your Reader Account</h1>
            <p className="text-xs text-[#737B76]">Continue with Google to register and access the RCCG YAYA Oyo Province 6 e-library.</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
              <div><p className="font-semibold text-[#8C2925]">Notice</p><p className="leading-relaxed text-[#252B2A]/90">{errorMessage}</p></div>
            </div>
          )}

          <button type="button" onClick={handleGoogleSignUp} disabled={isSubmitting} className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white rounded-xs text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[46px]">
            <span className="text-base font-bold text-[#4285F4]">G</span>
            <span>{isSubmitting ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>
          <p className="text-[11px] text-[#737B76] text-center leading-relaxed">Your account and reading progress are secured by Firebase Authentication.</p>
          <div className="pt-2 border-t border-[#EEF5F0] text-center space-y-2">
            <button type="button" onClick={() => navigate('/login')} className="w-full py-2.5 border border-[#EEF5F0] hover:border-[#123D2A] bg-white text-[#737B76] hover:text-[#123D2A] font-semibold text-xs rounded-xs transition-colors cursor-pointer">Administrator / Existing Account Sign-In</button>
            <button type="button" onClick={() => window.open(window.location.href, '_blank')} className="text-[11px] text-[#123D2A] font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Open in a new tab</button>
          </div>
        </div>
      </div>
    </div>
  );
};
