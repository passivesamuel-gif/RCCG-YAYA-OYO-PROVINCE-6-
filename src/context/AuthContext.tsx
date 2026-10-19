import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile } from '../types/library';
import { checkIsAdmin, ADMIN_EMAIL } from '../lib/admin';
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
  userFirstName: string;
  lastAuthAttemptError: AuthAttemptError | null;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInAsAdmin: (
    email: string,
    pass: string,
    accessPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ success: boolean; verificationSent?: boolean; error?: string }>;
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
    return 'Network connection error. Please verify your internet connection or check if this domain is authorized in Firebase.';
  }

  if (code.includes('invalid-api-key')) {
    return 'Firebase API key configuration restriction error. Please check your Google Cloud / Firebase API key settings.';
  }

  const cleaned = rawMsg.replace(/^Firebase:\s*Error\s*\([^)]*\)\.?\s*/i, '').trim();
  if (cleaned && !cleaned.toLowerCase().includes('auth/')) {
    return cleaned;
  }

  return "We couldn't complete your request. Please check your details and try again.";
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastAuthAttemptError, setLastAuthAttemptError] = useState<AuthAttemptError | null>(null);
  const isRegisteringAdminRef = useRef<boolean>(false);

  const [adminVerified, setAdminVerified] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('rccg_admin_verified') === 'true';
    } catch {
      return false;
    }
  });

  // Sync Firebase Auth state
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          if (isRegisteringAdminRef.current) {
            setLoading(false);
            return;
          }

          try {
            // Load user profile from Firestore: /users/{uid}
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const loadedProfile = userSnap.data() as UserProfile;
              setProfile(loadedProfile);
              if (
                loadedProfile.role === 'admin' ||
                checkIsAdmin(currentUser, loadedProfile)
              ) {
                setAdminVerified(true);
                try {
                  sessionStorage.setItem('rccg_admin_verified', 'true');
                } catch {}
              }
            } else {
              // Create default initial profile
              const displayName = currentUser.displayName || '';
              const parts = displayName.trim().split(' ');
              const parsedFirst = parts[0] || currentUser.email?.split('@')[0] || 'Member';
              const parsedLast = parts.slice(1).join(' ') || '';
              const isDesignatedAdmin = checkIsAdmin(currentUser, null);

              const newProfile: UserProfile = {
                uid: currentUser.uid,
                firstName: parsedFirst,
                lastName: parsedLast,
                name: displayName || parsedFirst,
                email: currentUser.email || '',
                role: isDesignatedAdmin ? 'admin' : 'member',
                createdAt: Date.now(),
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
              if (isDesignatedAdmin) {
                setAdminVerified(true);
                try {
                  sessionStorage.setItem('rccg_admin_verified', 'true');
                } catch {}
              }
            }
          } catch (profileErr) {
            console.warn('Could not sync Firestore profile:', profileErr);
            const displayName = currentUser.displayName || '';
            const parts = displayName.trim().split(' ');
            const parsedFirst = parts[0] || currentUser.email?.split('@')[0] || 'Member';
            const isDesignatedAdmin = checkIsAdmin(currentUser, null);

            setProfile({
              uid: currentUser.uid,
              firstName: parsedFirst,
              lastName: parts.slice(1).join(' ') || '',
              name: displayName || parsedFirst,
              email: currentUser.email || '',
              role: isDesignatedAdmin ? 'admin' : 'member',
              createdAt: Date.now(),
            });
            if (isDesignatedAdmin) {
              setAdminVerified(true);
            }
          }
        } else {
          setProfile(null);
          setAdminVerified(false);
          try {
            sessionStorage.removeItem('rccg_admin_verified');
            sessionStorage.removeItem('rccg_admin_token');
          } catch {}
        }

        setLoading(false);
      });
    } catch (e) {
      console.warn('Firebase Auth initialization notice:', e);
      setLoading(false);
    }

    return () => unsubscribe();
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
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const isDesignatedAdmin = checkIsAdmin(currentUser, null);

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
            role: isDesignatedAdmin ? 'admin' : 'member',
            createdAt: Date.now(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          const existing = userSnap.data() as UserProfile;
          setProfile(existing);
        }

        if (isDesignatedAdmin) {
          setAdminVerified(true);
          try {
            sessionStorage.setItem('rccg_admin_verified', 'true');
          } catch {}
        }
      } catch (err) {
        console.warn('Firestore profile write notice:', err);
      }

      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      recordAuthError(err, 'google');
      return { success: false, error: mapAuthError(err) };
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const isDesignatedAdmin = checkIsAdmin(cred.user, profile);
      if (isDesignatedAdmin) {
        setAdminVerified(true);
        try {
          sessionStorage.setItem('rccg_admin_verified', 'true');
        } catch {}
      }
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

      // Step 1: Pre-verify access password on backend server
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

      // Step 2: Sign in with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      if (!cred.user) {
        recordAuthError({ code: 'auth/no-user-returned', message: 'No user credential returned' }, 'admin-verify');
        return {
          success: false,
          error: "We couldn't complete your sign-in. Please check your credentials and try again.",
        };
      }

      // Step 3: Set verified status & session token
      setAdminVerified(true);
      try {
        sessionStorage.setItem('rccg_admin_verified', 'true');
        if (checkRes.data?.token) {
          sessionStorage.setItem('rccg_admin_token', checkRes.data.token);
        }
      } catch {}

      // Ensure profile role is marked admin in Firestore
      try {
        const userRef = doc(db, 'users', cred.user.uid);
        await setDoc(userRef, { role: 'admin' }, { merge: true });
        setProfile((prev) => (prev ? { ...prev, role: 'admin' } : null));
      } catch (e) {
        console.warn('Profile admin role note:', e);
      }

      setLastAuthAttemptError(null);
      return { success: true };
    } catch (err: any) {
      recordAuthError(err, 'admin-verify');
      return { success: false, error: mapAuthError(err) };
    }
  };

  const signUpWithEmail = async (
    arg1: string,
    arg2: string,
    arg3?: string,
    arg4?: string
  ): Promise<{ success: boolean; verificationSent?: boolean; error?: string }> => {
    try {
      let email = '';
      let pass = '';
      let firstName = '';
      let lastName = '';

      // Determine argument positions dynamically
      if (arg1 && arg1.includes('@')) {
        email = arg1.trim();
        pass = arg2 || '';
        firstName = (arg3 || '').trim();
        lastName = (arg4 || '').trim();
      } else if (arg3 && arg3.includes('@')) {
        firstName = (arg1 || '').trim();
        lastName = (arg2 || '').trim();
        email = arg3.trim();
        pass = arg4 || '';
      } else {
        email = (arg1 || '').trim();
        pass = arg2 || '';
        firstName = (arg3 || '').trim();
        lastName = (arg4 || '').trim();
      }

      if (!email || !email.includes('@')) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
      if (!pass || pass.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters in length.' };
      }

      const cleanFirst = firstName || email.split('@')[0] || 'Member';
      const cleanLast = lastName;
      const fullName = `${cleanFirst} ${cleanLast}`.trim();

      // Prevent race conditions with onAuthStateChanged creating an empty profile
      isRegisteringAdminRef.current = true;

      const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase(), pass);
      let verificationSent = false;

      if (cred.user) {
        try {
          await updateProfile(cred.user, { displayName: fullName });
        } catch (profileErr) {
          console.warn('Could not set displayName on Firebase user:', profileErr);
        }

        // Send email verification as required by Step 4
        try {
          await sendEmailVerification(cred.user);
          verificationSent = true;
        } catch (verifyErr) {
          console.warn('Email verification dispatch notice:', verifyErr);
        }

        // STRICT SECURITY: A new reader MUST NEVER be an administrator automatically!
        const isDesignatedAdmin = Boolean(
          ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        );

        const assignedRole: 'admin' | 'member' = isDesignatedAdmin ? 'admin' : 'member';

        const userRef = doc(db, 'users', cred.user.uid);
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          firstName: cleanFirst,
          lastName: cleanLast,
          name: fullName,
          email: email.toLowerCase(),
          role: assignedRole,
          createdAt: Date.now(),
        };

        try {
          await setDoc(userRef, newProfile, { merge: true });
          setProfile(newProfile);
        } catch (docErr) {
          console.warn('Firestore profile save warning:', docErr);
          setProfile(newProfile);
        }

        if (isDesignatedAdmin) {
          setAdminVerified(true);
          try {
            sessionStorage.setItem('rccg_admin_verified', 'true');
          } catch {}
        }
      }

      setLastAuthAttemptError(null);
      return { success: true, verificationSent };
    } catch (err: any) {
      recordAuthError(err, 'email-signup');
      return { success: false, error: mapAuthError(err) };
    } finally {
      isRegisteringAdminRef.current = false;
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
          email: user.email,
          accessPassword: accessPassword.trim(),
        }),
      });

      if (res.success && res.data?.verified) {
        setAdminVerified(true);
        try {
          sessionStorage.setItem('rccg_admin_verified', 'true');
          if (res.data?.token) {
            sessionStorage.setItem('rccg_admin_token', res.data.token);
          }
        } catch {}

        if (profile && profile.role !== 'admin') {
          const updated = { ...profile, role: 'admin' as const };
          setProfile(updated);
          try {
            await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
          } catch {}
        }

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
    const token = sessionStorage.getItem('rccg_admin_token') || undefined;
    const res = await safeFetch('/api/admin/update-access-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        adminToken: token,
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
        requestEmail: user.email,
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
        email: user.email,
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
      try {
        sessionStorage.removeItem('rccg_admin_verified');
        sessionStorage.removeItem('rccg_admin_token');
      } catch {}
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const isAdmin = checkIsAdmin(user, profile);
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
        adminEmailConfigured: ADMIN_EMAIL,
        adminVerified,
        userFirstName,
        lastAuthAttemptError,
        signInWithGoogle,
        signInWithEmail,
        signInAsAdmin,
        signUpWithEmail,
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
