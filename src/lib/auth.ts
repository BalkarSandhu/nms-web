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
const WORKER_ID_COOKIE = 'worker_id';
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
  // Token is expired if exp time has passed
  return payload.exp <= now;
};







const broadcastAuthChange = (event: AuthChangeEvent) => {
  if (!isBrowser) return;
  const payload = JSON.stringify({ ...event, timestamp: Date.now() });
  try {
    localStorage.setItem(AUTH_SYNC_EVENT, payload);
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
  // Fallback to 24 hours from now if backend did not provide an expiry
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};

/**
 * Persist token across cookie + storage for reliability.
 */
export const persistAuthToken = (token: string, expiry?: string) => {
  const payload = decodeJwtPayload(token);
  
  // Use JWT exp claim if available, otherwise use provided expiry
  let expiresAt: number | null = null;
  if (payload && typeof payload.exp === 'number') {
    expiresAt = payload.exp * 1000; // Convert seconds to milliseconds
  } else {
    expiresAt = coerceExpiry(expiry);
  }
  
  const expiresDate = buildExpiryDate(expiresAt);
  
  writeCookie(TOKEN_COOKIE, token, expiresDate);
  broadcastAuthChange({ type: 'login', expiresAt: expiresDate.getTime() });
};

/**
 * Clear token from cookie + storage and notify listeners.
 */
export const clearAuthToken = () => {
  deleteCookie(TOKEN_COOKIE);
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

  // Get token from cookie only (no localStorage for security)
  const token = readCookie(TOKEN_COOKIE);
  if (!token) return null;
  
  let expiresAt: number | null = null;

  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearAuthToken();
    return null;
  }

  // Check if token is expired
  if (isExpired(payload)) {
    clearAuthToken();
    return null;
  }

  // Get expiry from JWT payload
  if (typeof payload.exp === 'number') {
    expiresAt = payload.exp * 1000;
  }

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

/**
 * Refresh authentication token (NOT IMPLEMENTED - backend does not support refresh)
 * This function is kept for compatibility but will always return null
 */
export const refreshAuthToken = async (): Promise<ValidAuthToken | null> => {
  console.warn('Token refresh is not supported by backend');
  return null;
};

/**
 * Global 401 handler - called when any API returns 401
 * Clears auth and triggers logout across all tabs
 */
export const handle401Unauthorized = () => {
  console.warn('401 Unauthorized detected - clearing auth');
  clearAuthToken();
  
  // Redirect to login if in browser
  if (isBrowser && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

/**
 * Wrapper for fetch that automatically handles 401 responses
 * Use this instead of raw fetch for authenticated requests
 */
export const authenticatedFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  // Ensure auth headers are included
  const headers = {
    ...getAuthHeaders(),
    ...(init?.headers || {}),
  };

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // Handle 401 globally
  if (response.status === 401) {
    handle401Unauthorized();
    throw new Error('Unauthorized - token invalid or expired');
  }

  return response;
};

/**
 * Extract token from URL query parameter
 */
export const extractTokenFromUrl = (): string | null => {
  if (!isBrowser) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
};

/**
 * Store worker_id in cookie
 */
export const persistWorkerId = (workerId: string | number) => {
  if (!hasDocument) return;
  // Store worker_id in cookie for 1 year
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const cookieString = `${WORKER_ID_COOKIE}=${workerId}; expires=${expires.toUTCString()}; path=/; SameSite=${SAMESITE_POLICY}${getSecureFlag()}`;
  document.cookie = cookieString;
};

/**
 * Get worker_id from cookie
 */
export const getWorkerId = (): string | null => {
  return readCookie(WORKER_ID_COOKIE);
};

/**
 * Build URL with worker_id parameter if available
 * Appends worker_id as a query parameter if it exists in cookies
 */
export const buildUrlWithWorkerId = (baseUrl: string): string => {
  const workerId = getWorkerId();
  if (!workerId) return baseUrl;
  
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.append('worker_id', workerId);
  
  return url.toString();
};

/**
 * Clear worker_id from cookie
 */
export const clearWorkerId = () => {
  deleteCookie(WORKER_ID_COOKIE);
};

/**
 * Response type for token-based login
 */
export type TokenLoginResponse = {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    is_active: boolean;
    has_api_key: boolean;
    created_at: string;
    updated_at: string;
    last_login: string;
    token_expiry: string;
  };
};

/**
 * Response type for worker assignment
 */
export type WorkerAssignmentResponse = {
  assignments: Array<{
    worker_id: number;
    assigned_at: string;
  }>;
};

/**
 * Authenticate using URL token
 * Exchanges URL token for JWT token and stores it
 */
export const authenticateWithUrlToken = async (urlToken: string): Promise<TokenLoginResponse> => {
  const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/auth/token-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: urlToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with URL token');
  }

  const data: TokenLoginResponse = await response.json();
  
  // Store the JWT token
  persistAuthToken(data.token, data.user.token_expiry);
  
  return data;
};

/**
 * Fetch worker assignment for a user
 */
export const fetchWorkerAssignment = async (userId: number): Promise<number> => {
  const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/users/${userId}/assignments`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch worker assignment');
  }

  const data: WorkerAssignmentResponse = await response.json();
  
  if (!data.assignments || data.assignments.length === 0) {
    throw new Error('No worker assignment found for user');
  }

  const workerId = data.assignments[0].worker_id;
  persistWorkerId(workerId);
  
  return workerId;
};

/**
 * Complete URL token authentication flow
 * 1. Authenticate with URL token to get JWT
 * 2. Fetch worker assignment for the user
 * Returns user data and worker_id
 */
export const completeUrlTokenAuth = async (urlToken: string): Promise<{
  user: TokenLoginResponse['user'];
  workerId: number;
}> => {
  // Step 1: Authenticate with URL token
  const loginResponse = await authenticateWithUrlToken(urlToken);
  
  // Step 2: Fetch worker assignment
  const workerId = await fetchWorkerAssignment(loginResponse.user.id);
  
  return {
    user: loginResponse.user,
    workerId,
  };
};