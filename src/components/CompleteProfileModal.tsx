import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { User, X } from 'lucide-react';

export const CompleteProfileModal: React.FC = () => {
  const { user, profile, updateProfileNames } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDismissed(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if profile needs completion
  const needsCompletion =
    user &&
    profile &&
    !dismissed &&
    (!profile.firstName ||
      profile.firstName.trim() === '' ||
      profile.firstName.toLowerCase() === 'admin' ||
      profile.firstName.toLowerCase() === 'member');

  if (!needsCompletion) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    if (!cleanFirst) {
      setError('Please enter your first name.');
      return;
    }
    if (cleanFirst.toLowerCase() === 'admin' || cleanFirst.toLowerCase() === 'member') {
      setError('Please enter your real first name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await updateProfileNames(cleanFirst, lastName.trim());
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to save profile details. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={() => setDismissed(true)}
        aria-label="Close modal overlay"
      />
      <div className="bg-white border border-[#EEF5F0] rounded-xs shadow-lg max-w-md w-full p-6 sm:p-8 relative text-left z-10">
        <button
          onClick={() => setDismissed(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center absolute top-2 right-2 text-[#737B76] hover:text-[#123D2A] hover:bg-[#EEF5F0] rounded-xs cursor-pointer z-50 transition-colors"
          aria-label="Close"
          title="Close"
        >
          <X className="w-5 h-5 text-[#123D2A]" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#123D2A]/10 flex items-center justify-center text-[#123D2A]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-[#123D2A]">
              Complete Your Profile
            </h2>
            <p className="text-xs text-[#737B76]">
              Please enter your name for personalized library access.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#252B2A] uppercase tracking-wider mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g., Samuel"
              required
              className="w-full px-3 py-2 text-xs border border-[#EEF5F0] rounded-xs focus:outline-none focus:border-[#123D2A] bg-[#FAF8F2]/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252B2A] uppercase tracking-wider mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g., Adebayo"
              className="w-full px-3 py-2 text-xs border border-[#EEF5F0] rounded-xs focus:outline-none focus:border-[#123D2A] bg-[#FAF8F2]/50 focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setDismissed(true)}
              size="sm"
            >
              Skip
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} size="sm">
              Save Details
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
