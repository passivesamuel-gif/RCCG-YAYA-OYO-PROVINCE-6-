import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { navigate } = useRouter();
  const { sendResetEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await sendResetEmail(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(result.error || "We couldn't send the password reset email. Please verify your address.");
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12 bg-[#FAF8F2]">
      <div className="w-full max-w-md bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs text-left relative">
        {/* Top forest accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

        <div className="text-center space-y-3 pt-1">
          <div className="w-14 h-20 mx-auto flex items-center justify-center">
            <img
              src="/assets/yaya-crest.png"
              alt="RCCG YAYA Crest"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
              The Redeemed Christian Church of God · Oyo Province 6
            </p>
            <h1 className="font-heading font-extrabold text-2xl text-[#123D2A] tracking-tight">
              Password Recovery
            </h1>
            <p className="text-xs text-[#737B76]">
              Enter your registered email address to receive a recovery link.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#8C2925]">Notice</p>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="p-5 bg-[#F2F8F4] border border-[#BFDFCA] text-center space-y-3 rounded-xs">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#123D2A] text-[#D4AF65] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-sm text-[#123D2A]">
              Recovery Email Dispatched
            </h3>
            <p className="text-xs text-[#252B2A]/80 leading-relaxed">
              We have sent password reset instructions to <strong>{email}</strong>. Please check your inbox and spam folder.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 px-6 py-2.5 bg-[#123D2A] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-xs hover:bg-[#1A543A] transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#252B2A] tracking-wide">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737B76]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reader@rccgyayaoyo6.org"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FAF8F2]/40 border border-[#EEF5F0] focus:border-[#123D2A] rounded-xs text-[#252B2A] placeholder-[#737B76]/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#123D2A] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-xs text-xs font-heading font-bold uppercase tracking-wider text-white bg-[#123D2A] hover:bg-[#1A543A] active:bg-[#0B2519] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[42px]"
            >
              {isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 text-xs font-semibold text-[#737B76] hover:text-[#123D2A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </button>
          </form>
        )}

        <div className="pt-2 text-[11px] font-sans italic text-[#737B76] border-t border-[#EEF5F0]/60 flex items-center justify-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#123D2A] shrink-0" />
          <span>&ldquo;The entrance of thy words giveth light.&rdquo; &mdash; Psalm 119:130</span>
        </div>
      </div>
    </div>
  );
};
