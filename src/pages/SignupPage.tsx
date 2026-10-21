import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, BookOpen, ExternalLink, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const SignupPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const {
    user,
    isAdmin,
    readerMembership,
    signInWithMembershipPasscode,
    signInWithGoogle,
    loading: authLoading,
  } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryParams = new URLSearchParams(search);
  const redirectTarget = queryParams.get('redirect') || (isAdmin || readerMembership ? '/library' : '/library');

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTarget);
  }, [user, authLoading, navigate, redirectTarget]);

  const handlePasscodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!passcode.trim()) {
      setErrorMessage('Please enter your reader membership passcode.');
      return;
    }
    setIsSubmitting(true);
    const result = await signInWithMembershipPasscode(passcode);
    setIsSubmitting(false);
    if (result.success) {
      navigate(redirectTarget);
    } else {
      setErrorMessage(result.error || 'Membership access could not be verified.');
    }
  };

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
          <h2 className="font-heading font-extrabold text-2xl tracking-tight">Reader Membership Access</h2>
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
          <span>Enter your membership passcode to access the library and save reading progress on this device.</span>
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
            <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">Reader Membership Access</h1>
            <p className="text-xs text-[#737B76]">Enter the passcode provided by RCCG YAYA Oyo Province 6 to access the e-library.</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
              <div><p className="font-semibold text-[#8C2925]">Notice</p><p className="leading-relaxed text-[#252B2A]/90">{errorMessage}</p></div>
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} noValidate className="space-y-4">
            <Input
              label="Membership Passcode"
              type="password"
              required
              autoComplete="current-password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter your membership passcode"
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full" icon={<ArrowRight className="w-3.5 h-3.5 text-[#D4AF65]" />}>
              Enter E-Library
            </Button>
          </form>

          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-[#EEF5F0] w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-heading font-semibold tracking-widest text-[#737B76] absolute">or continue with Google</span>
          </div>
          <button type="button" onClick={handleGoogleSignUp} disabled={isSubmitting} className="w-full py-2.5 border border-[#EEF5F0] hover:border-[#123D2A] bg-white hover:bg-[#EEF5F0]/60 rounded-xs text-xs font-semibold text-[#252B2A] transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[42px]">
            <span className="text-base font-bold text-[#4285F4]">G</span>
            <span>Continue with Google</span>
          </button>
          <p className="text-[11px] text-[#737B76] text-center leading-relaxed">Your reading progress is saved securely for this device after membership access is verified.</p>
          <div className="pt-2 border-t border-[#EEF5F0] text-center space-y-2">
            <button type="button" onClick={() => navigate('/login')} className="w-full py-2.5 border border-[#EEF5F0] hover:border-[#123D2A] bg-white text-[#737B76] hover:text-[#123D2A] font-semibold text-xs rounded-xs transition-colors cursor-pointer">Administrator / Existing Account Sign-In</button>
            <button type="button" onClick={() => window.open(window.location.href, '_blank')} className="text-[11px] text-[#123D2A] font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Open in a new tab</button>
          </div>
        </div>
      </div>
    </div>
  );
};
