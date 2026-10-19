/**
 * RCCG YAYA OYO PROVINCE 6 E-LIBRARY
 * CENTRALIZED USER-FACING COPY & FRIENDLY ERROR MAPPING
 * 
 * DEVELOPER NOTICE:
 * Do not show infrastructure or technical terms in the UI (no Firebase, Firestore, Storage, backend,
 * database, collection, document, repository, bucket, token, UID, API, server, endpoint, JSON, SDK,
 * rules, index, quota, localhost, stack traces, or raw error codes like auth/... or storage/...).
 * Always use plain, warm, professional, church-appropriate language.
 */

export const LIBRARY_NAME = "RCCG YAYA Oyo Province 6 E-Library";
export const PUBLISHER_NAME = "The Redeemed Christian Church of God · Oyo Province 6";

export const UI_COPY = {
  welcomeSubtitle: "A Christian library from RCCG YAYA Oyo Province 6, open to everyone. Create a free account to start reading.",
  emptyCollection: "No books in the collection match your current filter query. Try searching by author or resetting the category.",
  emptyDashboard: "You have not started reading any books yet. Explore the collection to begin.",
  adminVerificationHint: "Verified securely by library authentication; never exposed in public variables.",
  loginHint: "Verified securely by library authentication; never exposed to client code.",
  privacyText: "Your reading milestones and last-read page bookmarks are saved securely to your private library account. No other user can view your personal progress.",
};

/**
 * Converts any technical error, code, or exception into a warm, friendly,
 * user-facing message with zero exposure of raw codes, SDK details, or stack traces.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  let raw = "";
  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === 'object' && error !== null) {
    try {
      raw = JSON.stringify(error);
    } catch {
      raw = String(error);
    }
  }

  const lower = raw.toLowerCase();

  // Network / Connection errors
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('offline') ||
    lower.includes('connection') ||
    lower.includes('failed to fetch') ||
    lower.includes('err_internet_disconnected')
  ) {
    return "Unable to reach the library. Please check your internet connection and try again.";
  }

  // Authentication errors
  if (
    lower.includes('auth/wrong-password') ||
    lower.includes('auth/user-not-found') ||
    lower.includes('auth/invalid-credential') ||
    lower.includes('auth/invalid-email') ||
    lower.includes('wrong password') ||
    lower.includes('user not found') ||
    lower.includes('invalid email')
  ) {
    return "That email address or password isn't correct. Please check your details and try again.";
  }

  if (lower.includes('auth/email-already-in-use')) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  if (lower.includes('auth/weak-password')) {
    return "Please choose a stronger password with at least 6 characters.";
  }

  if (lower.includes('auth/too-many-requests')) {
    return "Too many unsuccessful attempts. Please wait a moment before trying again.";
  }

  // Permission / Access errors
  if (
    lower.includes('permission-denied') ||
    lower.includes('permission denied') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    return "You do not have administrator access for this action.";
  }

  // Storage / Upload errors
  if (
    lower.includes('storage/') ||
    lower.includes('file-size-exceeded') ||
    lower.includes('exceeds') ||
    lower.includes('too large')
  ) {
    return "The uploaded file exceeds the maximum allowed size limit. Please choose a smaller file.";
  }

  // Default fallback
  return "Something went wrong. Please check your connection and try again.";
}
