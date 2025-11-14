/**
 * Centralized authentication utilities
 * Provides token persistence, validation, cross-tab sync, and auth headers
 */

type JwtPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

export type ValidAuthToken = {
  token: string;
  payload: JwtPayload;
  expiresAt: number | null;
};

export type AuthChangeEvent = {
  type: 'login' | 'logout' | 'refresh';
  expiresAt?: number | null;
};

const TOKEN_COOKIE = 'token';
const TOKEN_STORAGE_KEY = 'nms-auth-token';
const AUTH_SYNC_EVENT = 'nms-auth-sync';
const SAMESITE_POLICY = 'Lax';

const isBrowser = typeof window !== 'undefined';
const hasDocument = typeof document !== 'undefined';

const getSecureFlag = () =>
  isBrowser && window.location.protocol === 'https:' ? '; Secure' : '';

const readCookie = (name: string): string | null => {
  if (!hasDocument) return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return null;
  return parts.pop()?.split(';').shift() ?? null;
};

const writeCookie = (name: string, value: string, expires: Date) => {
  if (!hasDocument) return;
  const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=${SAMESITE_POLICY}${getSecureFlag()}`;
  document.cookie = cookieString;
};

const deleteCookie = (name: string) => {
  if (!hasDocument) return;
  const pastDate = new Date(0);
  document.cookie = `${name}=; expires=${pastDate.toUTCString()}; path=/; SameSite=${SAMESITE_POLICY}${getSecureFlag()}`;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
};

const isExpired = (payload: JwtPayload | null): boolean => {
  if (!payload || typeof payload.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

const persistTokenMetadata = (token: string, expiresAt: number | null) => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token, expiresAt })
    );
  } catch (error) {
    console.warn('Unable to persist auth token metadata', error);
  }
};

const readPersistedToken = (): { token: string; expiresAt: number | null } | null => {
  if (!isBrowser) return null;
  try {
    const value = localStorage.getItem(TOKEN_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn('Unable to read auth token metadata', error);
    return null;
  }
};

const clearPersistedToken = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear auth token metadata', error);
  }
};

const broadcastAuthChange = (event: AuthChangeEvent) => {
  if (!isBrowser) return;
  const payload = JSON.stringify({ ...event, timestamp: Date.now() });
  try {
    localStorage.setItem(AUTH_SYNC_EVENT, payload);
    // Remove the key to ensure subsequent events fire
    localStorage.removeItem(AUTH_SYNC_EVENT);
  } catch (error) {
    console.warn('Unable to broadcast auth change via storage', error);
  }

  window.dispatchEvent(
    new CustomEvent<AuthChangeEvent>(AUTH_SYNC_EVENT, { detail: event })
  );
};

const coerceExpiry = (expiry?: string | number | null): number | null => {
  if (!expiry) return null;
  const date = typeof expiry === 'number' ? new Date(expiry) : new Date(expiry);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
};

const buildExpiryDate = (expiresAt: number | null): Date => {
  if (expiresAt) return new Date(expiresAt);
  // Fallback to 1 hour from now if backend did not provide an expiry
  return new Date(Date.now() + 60 * 60 * 1000);
};

/**
 * Persist token across cookie + storage for reliability.
 */
export const persistAuthToken = (token: string, expiry?: string) => {
  const expiresAt = coerceExpiry(expiry);
  const expiresDate = buildExpiryDate(expiresAt);
  writeCookie(TOKEN_COOKIE, token, expiresDate);
  persistTokenMetadata(token, expiresDate.getTime());
  broadcastAuthChange({ type: 'login', expiresAt: expiresDate.getTime() });
};

/**
 * Clear token from cookie + storage and notify listeners.
 */
export const clearAuthToken = () => {
  deleteCookie(TOKEN_COOKIE);
  clearPersistedToken();
  broadcastAuthChange({ type: 'logout', expiresAt: null });
};

/**
 * Subscribe to auth changes across tabs and same-tab events
 */
export const subscribeToAuthChanges = (
  handler: (event: AuthChangeEvent) => void
) => {
  if (!isBrowser) return () => undefined;

  const storageListener = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_EVENT || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as AuthChangeEvent;
      handler(parsed);
    } catch (error) {
      console.warn('Unable to parse auth sync payload', error);
    }
  };

  const customListener = (event: Event) => {
    const detail = (event as CustomEvent<AuthChangeEvent>).detail;
    if (detail) handler(detail);
  };

  window.addEventListener('storage', storageListener);
  window.addEventListener(AUTH_SYNC_EVENT, customListener as EventListener);

  return () => {
    window.removeEventListener('storage', storageListener);
    window.removeEventListener(AUTH_SYNC_EVENT, customListener as EventListener);
  };
};

/**
 * Get authentication token from cookie/storage with validation
 */
export const getAuthToken = (): ValidAuthToken | null => {
  if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return { token: 'bypass-token', payload: {}, expiresAt: null };
  }

  let token = readCookie(TOKEN_COOKIE);
  if (!token) {
    const stored = readPersistedToken();
    if (!stored) return null;
    token = stored.token;
    // Rehydrate cookie for subsequent requests
    writeCookie(TOKEN_COOKIE, token, buildExpiryDate(stored.expiresAt));
  }

  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload || isExpired(payload)) {
    clearAuthToken();
    return null;
  }

  const expiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  persistTokenMetadata(token, expiresAt);
  return { token, payload, expiresAt };
};

/**
 * Get HTTP headers with authentication
 */
export const getAuthHeaders = (): HeadersInit => {
  const validToken = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (validToken && validToken.token !== 'bypass-token') {
    headers['Authorization'] = `Bearer ${validToken.token}`;
  }

  return headers;
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Check if cached data is stale and needs refreshing
 */
export const isDataStale = (lastFetched: number | null, maxAge: number = 5 * 60 * 1000): boolean => {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > maxAge;
};
