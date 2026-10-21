import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const SignupPage: React.FC = () => {
  const { navigate, search } = useRouter();
  const { user, isAdmin, signUpWithEmail, signInWithGoogle, loading: authLoading } = useAuth();

  // Create Account fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSentScreen, setEmailSentScreen] = useState(false);

  // Extract redirect target from search query if provided
  const queryParams = new URLSearchParams(search);
  const redirectTarget = queryParams.get('redirect') || (isAdmin ? '/admin' : '/library');

  // Redirect if already authenticated (unless showing check email confirmation screen)
  useEffect(() => {
    if (!authLoading && user && !emailSentScreen) {
      navigate(redirectTarget);
    }
  }, [user, isAdmin, authLoading, navigate, redirectTarget, emailSentScreen]);

  // Client-side form validation
  const validateForm = (): string | null => {
    if (!firstName.trim()) return 'Please enter your first name.';
    if (!lastName.trim()) return 'Please enter your last name.';
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) return 'Password must be at least 6 characters in length.';
    if (password !== confirmPassword) return 'The passwords you entered do not match.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await signUpWithEmail(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      setEmailSentScreen(true);
    } else {
      setErrorMessage(result.error || 'Account creation could not be completed. Please try again.');
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);

    if (result.success) {
      navigate(redirectTarget);
    } else {
      setErrorMessage(result.error || 'Google registration could not be completed. Please try again.');
    }
  };

  // Password strength hint
  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { text: 'Too short (min 6 chars)', color: 'text-amber-700' };
    if (password.length < 10) return { text: 'Good password', color: 'text-[#123D2A]' };
    return { text: 'Strong password', color: 'text-[#1A543A]' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-[85vh] grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F2] text-left">
      {/* ----------------------------------------------------------- */}
      {/* LEFT COLUMN: Editorial Brand & Scripture Panel (Desktop)   */}
      {/* ----------------------------------------------------------- */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#123D2A] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-6 left-6 w-5 h-5 border-t border-l border-[#D4AF65]/40" />
        <div className="absolute top-6 right-6 w-5 h-5 border-t border-r border-[#D4AF65]/40" />
        <div className="absolute bottom-6 left-6 w-5 h-5 border-b border-l border-[#D4AF65]/40" />
        <div className="absolute bottom-6 right-6 w-5 h-5 border-b border-r border-[#D4AF65]/40" />

        <div className="space-y-4">
          <div className="w-16 h-22 relative flex items-center justify-center">
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
              Free Reader Account
            </h2>
            <p className="text-xs uppercase font-heading font-semibold tracking-widest text-[#D4AF65]">
              E-Library
            </p>
          </div>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        {/* Pull quote in Open Sans italic */}
        <div className="my-8 space-y-3 p-6 bg-white/5 border border-white/10 rounded-xs">
          <p className="font-sans italic text-sm text-[#FAF8F2]/90 leading-relaxed">
            &ldquo;Thy words were found, and I did eat them; and thy word was unto me the joy and rejoicing of mine heart: for I am called by thy name, O LORD God of hosts.&rdquo;
          </p>
          <span className="text-[10px] font-heading font-semibold text-[#D4AF65] uppercase tracking-wider block">
            Jeremiah 15:16
          </span>
        </div>

        <div className="pt-4 border-t border-white/10 text-xs text-[#FAF8F2]/65 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#D4AF65] shrink-0" />
          <span>A free account gives you full online reading access and saves your reading progress.</span>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* RIGHT COLUMN: Create Account Form / Check Email Confirmation */}
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

          {emailSentScreen ? (
            /* STEP 4: Email Verification Confirmation Screen ("Check your email") */
            <div className="py-2 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#123D2A] text-[#D4AF65] flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
                  Check Your Email
                </h2>
                <p className="text-xs text-[#252B2A] leading-relaxed max-w-sm mx-auto">
                  A verification link has been sent to:
                </p>
                <p className="text-sm font-bold text-[#123D2A] bg-[#FAF8F2] py-2 px-3 rounded-xs border border-[#EEF5F0] inline-block font-mono">
                  {email}
                </p>
              </div>

              <div className="p-4 bg-[#F2F8F4] border border-[#BFDFCA] text-xs text-[#252B2A]/90 text-left rounded-xs leading-relaxed space-y-1">
                <p className="font-bold text-[#123D2A]">Next steps:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open your email inbox (or spam / junk folder).</li>
                  <li>Click the verification link from Firebase / RCCG YAYA E-Library.</li>
                  <li>Return here to start reading books in the library.</li>
                </ol>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(redirectTarget)}
                  className="w-full py-3 bg-[#123D2A] hover:bg-[#1A543A] text-white font-heading font-bold uppercase tracking-wider text-xs rounded-xs shadow-xs transition-colors cursor-pointer min-h-[42px]"
                >
                  Proceed to E-Library
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 border border-[#EEF5F0] hover:border-[#123D2A] bg-white text-[#737B76] hover:text-[#123D2A] font-semibold text-xs rounded-xs transition-colors cursor-pointer"
                >
                  Sign In Page
                </button>
              </div>
            </div>
          ) : (
            /* Standard Registration Form */
            <>
              <div className="space-y-1">
                <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
                  Create Free Reader Account
                </h1>
                <p className="text-xs text-[#737B76]">
                  Register to access the library collection and save your reading progress.
                </p>
              </div>

              {/* Notifications */}
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
                      <span>Open Registration in a New Tab Now</span>
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleRegister} noValidate className="space-y-4">
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label="First Name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Samuel"
                    leftIcon={<User className="w-4 h-4" />}
                  />

                  <Input
                    label="Last Name"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Adeyemi"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="samuel@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <div>
                  <Input
                    label="Password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                  {strength && (
                    <p className={`text-[11px] font-medium mt-1 ${strength.color}`}>
                      {strength.text}
                    </p>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your password"
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full mt-2"
                  icon={<ArrowRight className="w-3.5 h-3.5 text-[#D4AF65]" />}
                >
                  Create Free Account
                </Button>

                {/* Divider */}
                <div className="relative flex items-center justify-center pt-2">
                  <div className="border-t border-[#EEF5F0] w-full" />
                  <span className="bg-white px-3 text-[10px] uppercase font-heading font-semibold tracking-widest text-[#737B76] absolute">
                    or sign up with
                  </span>
                </div>

                {/* Google Authentication */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
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
                    Having trouble with Google sign-up inside the preview?
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2 bg-[#FAF8F2] hover:bg-[#EEF5F0] border border-[#123D2A]/30 text-[#123D2A] text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#123D2A]" />
                    <span>Open Registration in a New Tab</span>
                  </button>
                </div>
              </form>

              {/* Link to Sign In */}
              <div className="pt-2 border-t border-[#EEF5F0] text-center space-y-2">
                <p className="text-xs text-[#737B76]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate(queryParams.get('redirect') ? `/login?redirect=${encodeURIComponent(queryParams.get('redirect')!)}` : '/login')}
                    className="text-[#123D2A] font-bold hover:text-[#1A543A] underline underline-offset-3 decoration-[#D4AF65] cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
