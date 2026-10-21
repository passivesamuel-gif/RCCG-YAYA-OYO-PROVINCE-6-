import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, KeyRound, ArrowRight, AlertCircle, Shield, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const {
    user,
    isAdmin,
    userFirstName,
    signInWithEmail,
    signInAsAdmin,
    signInWithGoogle,
    loading: authLoading,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'reader' | 'admin'>('reader');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAccessPassword, setAdminAccessPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract redirect target from search query if provided
  const queryParams = new URLSearchParams(search);
  const redirectTarget = queryParams.get('redirect') || (isAdmin ? '/admin' : '/library');

  // Automatic redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (authMode === 'admin' && isAdmin) {
        navigate('/admin');
      } else {
        navigate(redirectTarget);
      }
    }
  }, [user, isAdmin, authLoading, navigate, redirectTarget, authMode]);

  // Standard Reader Form Submission
  const handleReaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithEmail(email.trim(), password);
      if (result.success) {
        navigate(redirectTarget);
      } else {
        setErrorMessage(result.error || 'Sign-in failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dedicated YAYA Oyo 6 Administrator Sign-In
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage(null);

    if (!adminEmail.trim() || !adminPassword || !adminAccessPassword.trim()) {
      setErrorMessage('Please provide your admin email, account password, and administrator access key.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInAsAdmin(
        adminEmail.trim(),
        adminPassword,
        adminAccessPassword.trim()
      );
      if (result.success) {
        navigate('/admin');
      } else {
        setErrorMessage(result.error || 'Administrator verification failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Administrator verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Single Sign-On
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        if (!result.redirecting) {
          navigate(redirectTarget);
        }
      } else {
        setErrorMessage(result.error || 'Google sign-in could not be completed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F2] text-left">
      {/* ----------------------------------------------------------- */}
      {/* LEFT COLUMN: Editorial Brand & Scripture Panel (Desktop)   */}
      {/* ----------------------------------------------------------- */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#123D2A] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative gold corner frame */}
        <div className="absolute top-6 left-6 w-5 h-5 border-t border-l border-[#D4AF65]/40" />
        <div className="absolute top-6 right-6 w-5 h-5 border-t border-r border-[#D4AF65]/40" />
        <div className="absolute bottom-6 left-6 w-5 h-5 border-b border-l border-[#D4AF65]/40" />
        <div className="absolute bottom-6 right-6 w-5 h-5 border-b border-r border-[#D4AF65]/40" />

        {/* Top Header */}
        <div className="space-y-4">
          <div className="w-16 h-22 relative flex items-center justify-center">
            {/* Subtle ivory circular backing on dark green background */}
            <div className="absolute inset-x-0.5 bottom-1 h-3/4 bg-[#FAF8F2] rounded-full -z-10 shadow-xs" />
            <img
              src="/assets/yaya-crest.png"
              alt="RCCG YAYA Crest"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#D4AF65] uppercase">
              The Redeemed Christian Church of God · Oyo Province 6
            </p>
            <h2 className="font-heading font-extrabold text-2xl tracking-tight text-white">
              RCCG YAYA OYO 6
            </h2>
            <p className="text-xs uppercase font-heading font-semibold tracking-widest text-[#D4AF65]">
              E-Library
            </p>
          </div>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        {/* Middle Pull-Quote in Open Sans italic */}
        <div className="my-8 space-y-3 p-6 bg-white/5 border border-white/10 rounded-xs">
          <p className="font-sans italic text-sm text-[#FAF8F2]/90 leading-relaxed">
            &ldquo;Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.&rdquo;
          </p>
          <span className="text-[10px] font-heading font-semibold text-[#D4AF65] uppercase tracking-wider block">
            2 Timothy 2:15
          </span>
        </div>

        {/* Footer Notice */}
        <div className="pt-4 border-t border-white/10 text-xs text-[#FAF8F2]/65 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#D4AF65] shrink-0" />
          <span>Christian literature for youth discipleship and spiritual growth.</span>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* RIGHT COLUMN: Authentication Form                           */}
      {/* ----------------------------------------------------------- */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

          {/* Mobile-only Crest Header */}
          <div className="text-center lg:hidden space-y-2 pt-1">
            <div className="w-14 h-20 mx-auto flex items-center justify-center">
              <img
                src="/assets/yaya-crest.png"
                alt="RCCG YAYA Crest"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
              RCCG YAYA Oyo Province 6
            </p>
          </div>

          {/* Form Title & Greeting */}
          <div className="space-y-1">
            <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
              {authMode === 'admin' ? 'Administrator Sign-In' : 'Sign In'}
            </h1>
            <p className="text-xs text-[#737B76]">
              {authMode === 'admin'
                ? 'Enter your administrator credentials and provincial access key.'
                : 'Enter your email and password to access the library.'}
            </p>
          </div>

          {/* Sign-In Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 border-b border-[#EEF5F0] pb-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode('reader');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-heading font-bold uppercase tracking-wider transition-colors border-b-2 -mb-[10px] cursor-pointer ${
                authMode === 'reader'
                  ? 'border-[#123D2A] text-[#123D2A]'
                  : 'border-transparent text-[#737B76] hover:text-[#252B2A]'
              }`}
            >
              Reader Sign-In
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('admin');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-heading font-bold uppercase tracking-wider transition-colors border-b-2 -mb-[10px] cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'admin'
                  ? 'border-[#123D2A] text-[#123D2A]'
                  : 'border-transparent text-[#737B76] hover:text-[#252B2A]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#123D2A]" />
              <span>YAYA OYO 6 Admin</span>
            </button>
          </div>

          {/* Friendly Inline Notification */}
          {errorMessage && (
            <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <p className="font-semibold text-[#8C2925]">Notice</p>
                  <p className="leading-relaxed text-[#252B2A]/90">{errorMessage}</p>
                </div>
              </div>
              {(errorMessage.includes('popup') || errorMessage.includes('New Tab') || errorMessage.includes('closed') || errorMessage.includes('domain')) && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full py-1.5 px-3 bg-[#123D2A] hover:bg-[#1A543A] text-white font-semibold text-xs rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#D4AF65]" />
                  <span>Open Sign-In in a New Tab Now</span>
                </button>
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* OPTION A: READER SIGN-IN FORM                             */}
          {/* --------------------------------------------------------- */}
          {authMode === 'reader' && (
            <form onSubmit={handleReaderSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@rccgyayaoyo6.org"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Account Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightAction={
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] text-[#123D2A] hover:underline font-semibold transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full mt-2"
                icon={<ArrowRight className="w-3.5 h-3.5 text-[#D4AF65]" />}
              >
                Sign In
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center pt-2">
                <div className="border-t border-[#EEF5F0] w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-heading font-semibold tracking-widest text-[#737B76] absolute">
                  or continue with
                </span>
              </div>

              {/* Google Authentication */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-2.5 border border-[#EEF5F0] hover:border-[#123D2A] bg-white hover:bg-[#EEF5F0]/60 rounded-xs text-xs font-semibold text-[#252B2A] transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 min-h-[42px]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Open in a new tab fallback for iframe preview */}
              <div className="pt-2 border-t border-[#EEF5F0] space-y-1.5">
                <p className="text-[11px] text-[#737B76] text-center">
                  Having trouble with Google sign-in inside the preview?
                </p>
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full py-2 bg-[#FAF8F2] hover:bg-[#EEF5F0] border border-[#123D2A]/30 text-[#123D2A] text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#123D2A]" />
                  <span>Open Sign-In in a New Tab</span>
                </button>
              </div>
            </form>
          )}

          {/* --------------------------------------------------------- */}
          {/* OPTION B: DEDICATED YAYA OYO 6 ADMIN SIGN-IN              */}
          {/* --------------------------------------------------------- */}
          {authMode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3 bg-[#FAF8F2] border border-[#EEF5F0] rounded-xs text-[11px] text-[#252B2A] leading-relaxed">
                <strong>Administrator Access:</strong> Requires your admin email, account password, and the provincial access key.
              </div>

              <Input
                label="Administrator Email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@rccgyayaoyo6.org"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Account Password"
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Administrator Access Password"
                type="password"
                required
                value={adminAccessPassword}
                onChange={(e) => setAdminAccessPassword(e.target.value)}
                placeholder="Separate secret server access key"
                leftIcon={<KeyRound className="w-4 h-4" />}
                hint="Verified securely by library authentication; never exposed to client code."
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full mt-2"
                icon={<Shield className="w-3.5 h-3.5 text-[#D4AF65]" />}
              >
                Sign In as Admin
              </Button>
            </form>
          )}

          {/* Link to Create Account */}
          <div className="pt-2 border-t border-[#EEF5F0] text-center space-y-2">
            <p className="text-xs text-[#737B76]">
              New to the library?{' '}
              <button
                type="button"
                onClick={() => navigate(queryParams.get('redirect') ? `/signup?redirect=${encodeURIComponent(queryParams.get('redirect')!)}` : '/signup')}
                className="text-[#123D2A] font-bold hover:text-[#1A543A] underline underline-offset-3 decoration-[#D4AF65] cursor-pointer"
              >
                Create a Free Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
