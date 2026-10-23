import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, authPersistenceReady } from '../lib/firebase';
import { UserProfile } from '../types/library';
import { safeFetch } from '../lib/api';

export interface AuthAttemptError {
  code: string;
  message: string;
  timestamp: number;
  type: 'google' | 'email-signin' | 'email-signup' | 'reset-password' | 'admin-verify';
}

export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  adminEmailConfigured: string;
  adminVerified: boolean;
  adminTokenRefreshed: boolean;
  userFirstName: string;
  lastAuthAttemptError: AuthAttemptError | null;
  lastAdminCheck: { status: number; success: boolean; isAdmin: boolean; message: string } | null;
  signInWithGoogle: () => Promise<{ success: boolean; approvedAdmin?: boolean; error?: string }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInAsAdmin: (
    email: string,
    pass: string,
    accessPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  verifyAdminAccess: (accessPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminAccessPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  authorizeAdminEmail: (
    newAdminEmail: string,
    accessPassword: string
  ) => Promise<{ success: boolean; authorizedEmails?: string[]; error?: string }>;
  listAuthorizedAdmins: (
    accessPassword: string
  ) => Promise<{ success: boolean; authorizedEmails?: string[]; primaryAdmin?: string; error?: string }>;
  updateProfileNames: (
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  reloadUser: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps technical Firebase error codes into short, friendly, context-aware messages.
 * NEVER exposes raw codes like "Firebase: Error (auth/...)" to normal users.
 */
export const mapAuthError = (err: any): string => {
  const code = (err?.code || '').toLowerCase();
  const rawMsg = String(err?.message || '');

  if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
    return 'This domain is not authorized in Firebase Console yet. Please add this app domain to Authorized Domains in Firebase Authentication Settings.';
  }

  if (code.includes('popup-blocked') || rawMsg.includes('popup-blocked')) {
    return 'The sign-in window was blocked by your browser or preview frame. Please tap "Open in a new tab" to sign in.';
  }

  if (code.includes('popup-closed-by-user')) {
    return 'The Google sign-in window was closed before completing. If you are on a mobile device or in the preview window, tap "Open Sign-In in a New Tab" below for the smoothest sign-in experience.';
  }

  if (code.includes('cancelled-popup-request')) {
    return 'Sign-in request was cancelled. Please try again.';
  }

  if (code.includes('operation-not-allowed') || rawMsg.includes('operation-not-allowed')) {
    return 'This sign-in provider is not enabled in Firebase Console. Please verify that Email/Password or Google sign-in is enabled.';
  }

  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    rawMsg.includes('invalid-credential')
  ) {
    return 'Incorrect email address or password. Please verify your credentials and try again.';
  }

  if (code.includes('user-not-found')) {
    return 'No registered account found with this email. Please check your email or create a free account.';
  }

  if (code.includes('email-already-in-use') || rawMsg.includes('email-already-in-use')) {
    return 'An account is already registered with this email address. Please sign in instead.';
  }

  if (code.includes('weak-password')) {
    return 'Please choose a stronger password (at least 6 characters in length).';
  }

  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (code.includes('missing-password')) {
    return 'Please enter a password for your account.';
  }

  if (code.includes('missing-email')) {
    return 'Please enter your email address.';
  }

  if (code.includes('too-many-requests')) {
    return 'Too many sign-in attempts were made. Please wait a moment and try again.';
  }

  if (code.includes('network-request-failed')) {
    return `Firebase sign-in failed (${err?.code || 'auth/network-request-failed'}): ${rawMsg || 'Network connection error.'}`;
  }

  if (code.includes('timeout')) {
    return 'Firebase did not respond within 20 seconds. Please check your connection and try again.';
  }

  if (code.includes('invalid-api-key')) {
    return 'Firebase API key configuration restriction error. Please check your Google Cloud / Firebase API key settings.';
  }

  const cleaned = rawMsg.replace(/^Firebase:\s*Error\s*\([^)]*\)\.?\s*/i, '').trim();
  if (cleaned && !cleaned.toLowerCase().includes('auth/')) {
    return cleaned;
  }

  return `Firebase sign-in failed (${err?.code || 'auth/unknown'}): ${rawMsg || "We couldn't complete your request."}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastAuthAttemptError, setLastAuthAttemptError] = useState<AuthAttemptError | null>(null);

  const [lastAdminCheck, setLastAdminCheck] = useState<AuthContextType['lastAdminCheck']>(null);
  const [adminVerified, setAdminVerified] = useState<boolean>(false);
  const [adminTokenRefreshed, setAdminTokenRefreshed] = useState<boolean>(false);

  const refreshGoogleAdminStatus = async (): Promise<boolean> => {
    const response = await safeFetch<{ isAdmin?: boolean; approved?: boolean; role?: 'admin' | 'reader' }>('/api/admin/google-status');
    setAdminVerified(Boolean(response.success && response.data?.isAdmin));
    if (response.success && response.data?.role) {
      setProfile((previous) => previous ? {
        ...previous,
        role: response.data?.role === 'admin' ? 'admin' : 'member',
      } : previous);
    }
    if (response.success && response.data?.isAdmin) {
      await auth.currentUser?.getIdToken(true);
      setAdminTokenRefreshed(true);
      if (auth.currentUser) setUser({ ...auth.currentUser });
    }
    setLastAdminCheck({
      status: response.status ?? 0,
      success: response.success,
      isAdmin: response.data?.isAdmin === true,
      message: response.success
        ? (response.data?.isAdmin ? 'The server returned administrator: yes.' : 'The server returned administrator: no.')
        : response.error || 'The administrator check did not complete.',
    });
    return Boolean(response.success && response.data?.approved);
  };

  // Sync Firebase Auth state
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    const startupFallback = window.setTimeout(() => setLoading(false), 5000);

    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          try {
            // Load user profile from Firestore: /users/{uid}
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const loadedProfile = userSnap.data() as UserProfile;
              setProfile(loadedProfile);
            } else {
              // Create default initial profile
              const displayName = currentUser.displayName || '';
              const parts = displayName.trim().split(' ');
              const parsedFirst = parts[0] || currentUser.email?.split('@')[0] || 'Member';
              const parsedLast = parts.slice(1).join(' ') || '';
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                firstName: parsedFirst,
                lastName: parsedLast,
                name: displayName || parsedFirst,
                email: currentUser.email || '',
                role: 'member',
                createdAt: Date.now(),
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            }
          } catch (profileErr) {
            console.warn('Could not sync Firestore profile:', profileErr);
            const displayName = currentUser.displayName || '';
            const parts = displayName.trim().split(' ');
            const parsedFirst = parts[0] || currentUser.email?.split('@')[0] || 'Member';
            setProfile({
              uid: currentUser.uid,
              firstName: parsedFirst,
              lastName: parts.slice(1).join(' ') || '',
              name: displayName || parsedFirst,
              email: currentUser.email || '',
              role: 'member',
              createdAt: Date.now(),
            });
          }
          await refreshGoogleAdminStatus();
        } else {
          setProfile(null);
          setAdminVerified(false);
          setLastAdminCheck(null);
        }

        window.clearTimeout(startupFallback);
        setLoading(false);
      });
    } catch (e) {
      console.warn('Firebase Auth initialization notice:', e);
      setLoading(false);
    }

    getRedirectResult(auth).catch((err: any) => {
        const errorRecord: AuthAttemptError = {
          code: err?.code || 'auth/unknown',
          message: err?.message || String(err || 'Unknown error'),
          timestamp: Date.now(),
          type: 'google',
        };
        setLastAuthAttemptError(errorRecord);
        console.error('[Auth Diagnostic - GOOGLE REDIRECT]', errorRecord);
      });

    return () => {
      window.clearTimeout(startupFallback);
      unsubscribe();
    };
  }, []);

  const recordAuthError = (err: any, type: AuthAttemptError['type']) => {
    const errorRecord: AuthAttemptError = {
      code: err?.code || 'auth/unknown',
      message: err?.message || String(err || 'Unknown error'),
      timestamp: Date.now(),
      type,
    };
    setLastAuthAttemptError(errorRecord);
    console.error(`[Auth Diagnostic - ${type.toUpperCase()}]`, errorRecord);
  };

  const signInWithGoogle = async () => {
    try {
      await authPersistenceReady;
      // Popup returns the completed Firebase credential directly, avoiding the
      // mobile redirect callback loop seen on some Render/Firebase combinations.
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const displayName = currentUser.displayName || '';
          const parts = displayName.trim().split(' ');
          const parsedFirst = parts[0] || 'Member';
          const parsedLast = parts.slice(1).join(' ') || '';

          const newProfile: UserProfile = {
            uid: currentUser.uid,
            firstName: parsedFirst,
            lastName: parsedLast,
            name: displayName || parsedFirst,
            email: currentUser.email || '',
            role: 'member',
            createdAt: Date.now(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          const existing = userSnap.data() as UserProfile;
          setProfile(existing);
        }

      } catch (err) {
        console.warn('Firestore profile write notice:', err);
      }

      await refreshGoogleAdminStatus();

      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '').toLowerCase();
      if (code.includes('popup-blocked') || code.includes('network-request-failed')) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return { success: true };
        } catch (redirectErr: any) {
          recordAuthError(redirectErr, 'google');
          return { success: false, error: mapAuthError(redirectErr) };
        }
      }
      recordAuthError(err, 'google');
      return { success: false, error: mapAuthError(err) };
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      setAdminVerified(false);
      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      recordAuthError(err, 'email-signin');
      return { success: false, error: mapAuthError(err) };
    }
  };

  /**
   * Dedicated Administrator Sign-In:
   * Requires Admin Email, Account Password, and separate Server Access Password
   */
  const signInAsAdmin = async (
    email: string,
    pass: string,
    accessPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      await signInWithEmailAndPassword(auth, cleanEmail, pass);

      // The server verifies the signed-in Firebase account and the separate access password.
      const checkRes = await safeFetch('/api/admin/verify-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          accessPassword: accessPassword.trim(),
        }),
      });

      if (!checkRes.success) {
        recordAuthError({ code: 'auth/admin-server-failed', message: checkRes.error }, 'admin-verify');
        return {
          success: false,
          error: checkRes.error || 'Administrator verification failed. Please check your credentials and try again.',
        };
      }

      await auth.currentUser?.getIdToken(true);
      if (auth.currentUser) setUser({ ...auth.currentUser });
      setAdminTokenRefreshed(true);
      setAdminVerified(true);

      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      recordAuthError(err, 'admin-verify');
      return { success: false, error: mapAuthError(err) };
    }
  };

  /**
   * Verify Administrator Access Password on server for an already logged-in session
   */
  const verifyAdminAccess = async (accessPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !user.email) {
        return { success: false, error: 'You must be signed in with an administrator account.' };
      }

      const res = await safeFetch('/api/admin/verify-access-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessPassword: accessPassword.trim(),
        }),
      });

      if (res.success && res.data?.verified) {
        await auth.currentUser?.getIdToken(true);
        if (auth.currentUser) setUser({ ...auth.currentUser });
        setAdminTokenRefreshed(true);
        setAdminVerified(true);

        return { success: true };
      } else {
        return {
          success: false,
          error: res.error || 'Administrator verification failed. Please check your credentials and try again.',
        };
      }
    } catch (err: any) {
      return { success: false, error: 'Could not contact administrator authentication server.' };
    }
  };

  /**
   * Security Panel: Change Admin Access Password
   */
  const updateAdminAccessPassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'Not authenticated.' };
    }
    const res = await safeFetch('/api/admin/update-access-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      }),
    });

    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update access password.' };
  };

  /**
   * Security Panel: Authorize New Admin Email
   */
  const authorizeAdminEmail = async (
    newAdminEmail: string,
    accessPassword: string
  ): Promise<{ success: boolean; authorizedEmails?: string[]; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'Not authenticated.' };
    }
    const res = await safeFetch('/api/admin/authorize-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newAdminEmail: newAdminEmail.trim().toLowerCase(),
        accessPassword: accessPassword.trim(),
      }),
    });

    if (res.success) {
      return { success: true, authorizedEmails: res.data?.authorizedEmails };
    }
    return { success: false, error: res.error || 'Failed to authorize administrator.' };
  };

  /**
   * Security Panel: List Authorized Administrators
   */
  const listAuthorizedAdmins = async (
    accessPassword: string
  ): Promise<{ success: boolean; authorizedEmails?: string[]; primaryAdmin?: string; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'Not authenticated.' };
    }
    const res = await safeFetch('/api/admin/list-authorized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessPassword: accessPassword.trim(),
      }),
    });

    if (res.success) {
      return {
        success: true,
        authorizedEmails: res.data?.authorizedEmails,
        primaryAdmin: res.data?.primaryAdmin,
      };
    }
    return { success: false, error: res.error || 'Failed to retrieve administrators.' };
  };

  /**
   * Profile Page: Update first and last name
   */
  const updateProfileNames = async (
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not signed in.' };
    }

    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      const fullName = `${cleanFirst} ${cleanLast}`.trim();

      await updateProfile(user, { displayName: fullName });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: cleanFirst,
        lastName: cleanLast,
        name: fullName,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: cleanFirst,
              lastName: cleanLast,
              name: fullName,
            }
          : null
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Unable to update profile. Please try again.' };
    }
  };

  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      recordAuthError(err, 'reset-password');
      return { success: false, error: mapAuthError(err) };
    }
  };

  const resendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'You are not currently signed in.' };
      }
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: mapAuthError(err) };
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
        return auth.currentUser.emailVerified;
      }
      return false;
    } catch {
      return false;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setAdminVerified(false);
      setAdminTokenRefreshed(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const isAdmin = Boolean(user && adminVerified);
  const userFirstName =
    profile?.firstName ||
    profile?.name?.split(' ')[0] ||
    user?.displayName?.split(' ')[0] ||
    'Member';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        adminEmailConfigured: '',
        adminVerified,
        adminTokenRefreshed,
        userFirstName,
        lastAuthAttemptError,
        lastAdminCheck,
        signInWithGoogle,
        signInWithEmail,
        signInAsAdmin,
        verifyAdminAccess,
        updateAdminAccessPassword,
        authorizeAdminEmail,
        listAuthorizedAdmins,
        updateProfileNames,
        sendResetEmail,
        resendVerificationEmail,
        reloadUser,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
