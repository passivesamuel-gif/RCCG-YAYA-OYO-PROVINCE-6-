import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, CheckCircle2, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

export const VerifyEmailScreen: React.FC = () => {
  const { user, resendVerificationEmail, reloadUser, signOutUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCheckVerification = async () => {
    setIsVerifying(true);
    setMessage(null);
    const verified = await reloadUser();
    setIsVerifying(false);

    if (verified) {
      setMessage({
        type: 'success',
        text: 'Your email address has been verified! Welcome to the library.',
      });
    } else {
      setMessage({
        type: 'error',
        text: 'Email not verified yet. Please click the link sent to your inbox and try again.',
      });
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);
    const result = await resendVerificationEmail();
    setIsResending(false);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'A new verification link has been sent to your email. Please check your inbox and spam folder.',
      });
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Failed to resend verification email. Please try again in a few moments.',
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#FAF8F2]">
      <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs relative text-left">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

        <div className="w-12 h-12 bg-[#EEF5F0] border border-[#123D2A]/20 rounded-full flex items-center justify-center text-[#123D2A]">
          <Mail className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
            Check Your Email
          </h1>
          <p className="text-xs text-[#737B76] leading-relaxed">
            We sent a verification email to{' '}
            <strong className="text-[#252B2A]">{user?.email || 'your email address'}</strong>.
            Please click the link in the email to verify your account and start reading.
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xs text-xs flex items-start gap-2.5 border ${
              message.type === 'success'
                ? 'bg-[#F2F8F4] border-[#123D2A]/30 text-[#123D2A]'
                : 'bg-[#FFF8F7] border-[#E8C4BF] text-[#732522]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#123D2A] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{message.text}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isVerifying}
            onClick={handleCheckVerification}
            className="w-full"
            icon={<CheckCircle2 className="w-4 h-4 text-[#D4AF65]" />}
          >
            I've Verified My Email
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            isLoading={isResending}
            onClick={handleResend}
            className="w-full"
            icon={<RefreshCw className="w-4 h-4 text-[#123D2A]" />}
          >
            Resend Email
          </Button>
        </div>

        <div className="pt-4 border-t border-[#EEF5F0] text-center">
          <button
            type="button"
            onClick={signOutUser}
            className="text-xs font-semibold text-[#737B76] hover:text-[#123D2A] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Use Another Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
