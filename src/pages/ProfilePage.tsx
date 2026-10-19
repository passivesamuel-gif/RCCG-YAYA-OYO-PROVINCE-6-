import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { User, Mail, Shield, LogOut, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { navigate } = useRouter();
  const { user, profile, isAdmin, updateProfileNames, signOutUser, loading: authLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/profile');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      const f = profile.firstName || profile.name?.split(' ')[0] || '';
      const l = profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '';
      setFirstName(f.toLowerCase() !== 'admin' && f.toLowerCase() !== 'member' ? f : '');
      setLastName(l.toLowerCase() !== 'admin' && l.toLowerCase() !== 'member' ? l : '');
    } else if (user?.displayName) {
      const parts = user.displayName.split(' ');
      const f = parts[0] || '';
      setFirstName(f.toLowerCase() !== 'admin' && f.toLowerCase() !== 'member' ? f : '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [profile, user]);

  if (authLoading || (!user && !authLoading)) {
    return <FullPageLoader />;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please provide both your first name and last name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateProfileNames(firstName, lastName);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Your profile information has been successfully updated.');
    } else {
      setErrorMessage(res.error || 'Unable to update profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-left space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-[#EEF5F0] pb-6 space-y-2">
        <div className="space-y-1">
          <p className="text-[11px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
            Account Settings
          </p>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pt-1">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-[#123D2A] tracking-tight">
              Reader Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#737B76] max-w-xl leading-relaxed mt-1">
              Manage your personal identification details and library account credentials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#123D2A] text-white text-[11px] font-semibold tracking-wider uppercase rounded-xs">
                <Shield className="w-3.5 h-3.5 text-[#D4AF65]" />
                <span>YAYA Oyo 6 Administrator</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF5F0] text-[#123D2A] text-[11px] font-semibold uppercase tracking-wider rounded-xs">
                Reader Account
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Form: Profile Settings */}
        <div className="md:col-span-8 bg-white border border-[#EEF5F0] rounded-xs p-6 sm:p-8 space-y-6 shadow-xs relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

          <div className="border-b border-[#EEF5F0] pb-3">
            <h2 className="font-heading font-bold text-base text-[#123D2A]">
              Personal Information
            </h2>
            <p className="text-xs text-[#737B76]">
              Used to personalize your greeting across the library.
            </p>
          </div>

          {successMessage && (
            <div className="p-3.5 bg-[#F2F8F4] border border-[#BFDFCA] text-[#123D2A] text-xs rounded-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1A543A] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#123D2A]">Update Confirmed</p>
                <p className="leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#8C2925]">Notice</p>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737B76]" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FAF8F2]/40 border border-[#D4AF65]/40 rounded-xs text-[#252B2A] focus:bg-white focus:outline-none focus:border-[#123D2A] focus:ring-1 focus:ring-[#123D2A] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  Last Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737B76]" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FAF8F2]/40 border border-[#D4AF65]/40 rounded-xs text-[#252B2A] focus:bg-white focus:outline-none focus:border-[#123D2A] focus:ring-1 focus:ring-[#123D2A] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Read-Only Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  Email Address
                </label>
                <span className="text-[10px] uppercase font-heading font-semibold tracking-wider text-[#737B76]">
                  Primary Account Email
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737B76]" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#EEF5F0]/60 border border-[#EEF5F0] rounded-xs text-[#737B76] cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-[#737B76]">
                Your email address is linked to your account and cannot be changed here.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#123D2A] hover:bg-[#1A543A] active:bg-[#0B2519] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 min-h-[42px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Panel: Account Actions & Privacy */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white border border-[#EEF5F0] rounded-xs p-6 space-y-4 shadow-xs">
            <h3 className="font-heading font-bold text-sm text-[#123D2A]">
              Reading Privacy
            </h3>
            <p className="text-xs text-[#737B76] leading-relaxed">
              Your reading milestones and last-read page bookmarks are saved securely to your private library account. No other user can view your personal progress.
            </p>
          </div>

          <div className="bg-white border border-[#EEF5F0] rounded-xs p-6 space-y-4 shadow-xs">
            <h3 className="font-heading font-bold text-sm text-[#123D2A]">
              Sign Out
            </h3>
            <p className="text-xs text-[#737B76] leading-relaxed">
              Sign out of your account on this device.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
