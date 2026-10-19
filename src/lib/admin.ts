import { User } from 'firebase/auth';
import { UserProfile } from '../types/library';

/**
 * ============================================================================
 * RCCG YAYA OYO 6 E-LIBRARY: ADMINISTRATOR CONFIGURATION
 * ============================================================================
 */
export const ADMIN_EMAIL: string = 'fixonauts3d@gmail.com';
export const ADMIN_UID: string = '';

/**
 * Determines whether a user holds administrator privileges.
 */
export const checkIsAdmin = (
  firebaseUser: User | null,
  firestoreProfile?: UserProfile | null
): boolean => {
  if (!firebaseUser) return false;

  // 1. Check designated primary administrator email
  if (
    ADMIN_EMAIL &&
    firebaseUser.email &&
    firebaseUser.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()
  ) {
    return true;
  }

  // 2. Check designated UID if configured
  if (ADMIN_UID && firebaseUser.uid === ADMIN_UID) {
    return true;
  }

  // 3. Check persistent Firestore profile role
  if (firestoreProfile && firestoreProfile.role === 'admin') {
    return true;
  }

  // 4. Check active verified administrator session
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem('rccg_admin_verified') === 'true') {
      return true;
    }
  } catch {}

  return false;
};
