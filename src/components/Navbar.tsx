import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Menu, X, Shield, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { path, navigate } = useRouter();
  const { user, isAdmin, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Hide standard navbar in Reader mode to preserve distraction-free reading space
  if (path.startsWith('/read/')) {
    return null;
  }

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F2] border-b border-[#EEF5F0]">
      {/* Editorial Thin Gold Accent Rule */}
      <div className="h-[2px] w-full bg-[#D4AF65]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-20">
          {/* Logo Wordmark Lockup */}
          <button
            onClick={() => navigate(user ? '/library' : '/')}
            className="flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123D2A] rounded-xs group whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Logo size="md" />
          </button>

          {/* Desktop Navigation Links & Actions */}
          <div className="hidden md:flex items-center gap-7">
            {user ? (
              /* Authenticated Navigation */
              <nav className="flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-[#737B76]">
                <button
                  onClick={() => navigate('/library')}
                  className={`py-1.5 transition-colors hover:text-[#123D2A] cursor-pointer ${
                    path === '/library' || path.startsWith('/book/')
                      ? 'text-[#123D2A] font-bold border-b-2 border-[#123D2A]'
                      : ''
                  }`}
                >
                  Library
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className={`py-1.5 transition-colors hover:text-[#123D2A] cursor-pointer ${
                    path === '/dashboard'
                      ? 'text-[#123D2A] font-bold border-b-2 border-[#123D2A]'
                      : ''
                  }`}
                >
                  My Reading
                </button>

                <button
                  onClick={() => navigate('/profile')}
                  className={`py-1.5 transition-colors hover:text-[#123D2A] flex items-center gap-1.5 cursor-pointer ${
                    path === '/profile'
                      ? 'text-[#123D2A] font-bold border-b-2 border-[#123D2A]'
                      : ''
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>

                {/* Admin Link: Strictly visible to designated administrator only */}
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className={`py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer ${
                      path === '/admin'
                        ? 'text-[#123D2A] font-bold border-b-2 border-[#123D2A]'
                        : 'text-[#123D2A] hover:text-[#1A543A] font-semibold'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="py-1.5 text-[#737B76] hover:text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </nav>
            ) : (
              /* Public Navigation (Signed Out) */
              <nav className="flex items-center gap-4 text-xs font-semibold">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2.5 text-[#123D2A] hover:text-[#0B2519] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-5 py-2.5 text-white bg-[#123D2A] hover:bg-[#1A543A] uppercase tracking-wider transition-colors rounded-xs shadow-xs cursor-pointer min-h-[40px]"
                >
                  Reader Access
                </button>
              </nav>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-[#123D2A] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EEF5F0] bg-[#FAF8F2] px-4 py-5 space-y-4">
          {user ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigate('/library');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xs ${
                  path === '/library' ? 'bg-[#EEF5F0] text-[#123D2A]' : 'text-[#737B76]'
                }`}
              >
                Library
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xs ${
                  path === '/dashboard' ? 'bg-[#EEF5F0] text-[#123D2A]' : 'text-[#737B76]'
                }`}
              >
                My Reading
              </button>
              <button
                onClick={() => {
                  navigate('/profile');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-2 ${
                  path === '/profile' ? 'bg-[#EEF5F0] text-[#123D2A]' : 'text-[#737B76]'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-xs ${
                    path === '/admin' ? 'bg-[#EEF5F0] text-[#123D2A]' : 'text-[#123D2A]'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </button>
              )}

              <div className="pt-2 border-t border-[#EEF5F0]">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left py-2.5 px-3 text-xs font-semibold text-[#737B76] hover:text-rose-700 flex items-center gap-2 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-[#123D2A] border border-[#123D2A] rounded-xs min-h-[44px]"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  navigate('/signup');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-white bg-[#123D2A] rounded-xs min-h-[44px]"
              >
                Reader Access
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
