import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, Eye, EyeOff, KeyRound, Shield } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { safeFetch } from '../lib/api';

export const LoginPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const { user, isAdmin, loading, signInWithGoogle } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTarget = new URLSearchParams(search).get('redirect') || (isAdmin ? '/admin' : '/library');

  useEffect(() => {
    if (!loading && user && !isAdminMode) navigate(redirectTarget);
  }, [loading, user, navigate, redirectTarget, isAdminMode]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);
    if (result.success) navigate(redirectTarget);
    else setErrorMessage(result.error || 'Google sign-in could not be completed. Please try again.');
  };

  const handleAdminSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!adminPasscode) {
      setErrorMessage('Please enter the administrator passcode.');
      return;
    }
    setIsSubmitting(true);
    const result = await safeFetch('/api/admin/passcode-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: adminPasscode }),
    });
    setIsSubmitting(false);
    if (result.success) {
      setAdminPasscode('');
      navigate('/admin');
    } else {
      setErrorMessage(result.error || 'Administrator authentication failed.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#FAF8F2] px-4 py-12 text-left">
      <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />
        <div className="text-center space-y-3">
          <img src="/assets/yaya-crest.png" alt="RCCG YAYA Crest" className="w-16 h-22 mx-auto object-contain" />
          <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">RCCG YAYA Oyo Province 6</p>
          <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">{isAdminMode ? 'Admin Login' : 'Continue with Google'}</h1>
          <p className="text-xs text-[#737B76] leading-relaxed">
            {isAdminMode ? 'Enter the private administrator passcode to manage the library.' : 'Use your Google account to access the e-library. Approved Google accounts automatically receive administrator access.'}
          </p>
        </div>
        {errorMessage && (
          <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
            <div><p className="font-semibold text-[#8C2925]">Notice</p><p className="leading-relaxed">{errorMessage}</p></div>
          </div>
        )}
        {isAdminMode ? (
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#252B2A]">Administrator passcode</span>
              <span className="relative block">
                <KeyRound className="w-4 h-4 text-[#737B76] absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus required type={showPasscode ? 'text' : 'password'} value={adminPasscode} onChange={(event) => setAdminPasscode(event.target.value)} className="w-full pl-10 pr-11 py-3 text-sm bg-white border border-[#D8E5DC] rounded-xs focus:outline-none focus:border-[#123D2A]" placeholder="Private administrator passcode" />
                <button type="button" onClick={() => setShowPasscode((visible) => !visible)} aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737B76] hover:text-[#123D2A] cursor-pointer">
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </span>
            </label>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white rounded-xs text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[46px]"><Shield className="w-4 h-4 text-[#D4AF65]" /><span>{isSubmitting ? 'Signing in…' : 'Sign in as Admin'}</span></button>
            <button type="button" onClick={() => { setIsAdminMode(false); setErrorMessage(null); setAdminPasscode(''); }} className="w-full text-xs text-[#737B76] hover:text-[#123D2A] underline cursor-pointer">Return to reader sign-in</button>
          </form>
        ) : (
          <>
            <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white rounded-xs text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[46px]"><span className="text-base font-bold text-[#4285F4]">G</span><span>{isSubmitting ? 'Connecting to Google…' : 'Continue with Google'}</span></button>
            <p className="text-[11px] text-[#737B76] text-center leading-relaxed flex items-center justify-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Reading progress is saved securely to your Google account.</p>
            <button type="button" onClick={() => { setIsAdminMode(true); setErrorMessage(null); }} className="w-full pt-3 border-t border-[#EEF5F0] text-xs font-semibold text-[#123D2A] hover:text-[#1A543A] cursor-pointer">Admin Login</button>
          </>
        )}
      </div>
    </div>
  );
};
