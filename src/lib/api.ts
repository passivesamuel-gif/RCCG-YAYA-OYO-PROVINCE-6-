import { auth } from './firebase';

/**
 * Safe client API caller for RCCG YAYA OYO 6 E-Library.
 * Guarantees zero "Unexpected token '<', <html>... is not valid JSON" errors.
 * Inspects content-type, enforces timeouts, handles offline states, and maps errors.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 12000
): Promise<ApiResponse<T>> {
  // Check navigator offline state
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'You appear to be offline. Please verify your internet connection and try again.',
      status: 0,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      // If server returned HTML (e.g. 404 or proxy error), gracefully handle without json parse error
      return {
        success: false,
        error: response.status === 404
          ? 'The requested administrative service endpoint could not be reached.'
          : 'The server responded with an unexpected format. Please try again shortly.',
        status: response.status,
      };
    }

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.error || `Server returned status ${response.status}. Please try again.`,
        data: json,
        status: response.status,
      };
    }

    return {
      success: true,
      data: json,
      status: response.status,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err?.name === 'AbortError') {
      return {
        success: false,
        error: 'The server took too long to respond. Please check your connection and retry.',
        status: 408,
      };
    }

    return {
      success: false,
      error: 'Unable to reach the server. Please check your network and try again.',
      status: 0,
    };
  }
}
