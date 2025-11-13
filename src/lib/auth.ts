/**
 * Centralized authentication utilities
 * Provides token retrieval and auth headers for all API calls
 */

/**
 * Get authentication token from HTTP cookie
 * Validates JWT format and expiration
 * @returns JWT token string or null if invalid/expired
 */
export const getAuthToken = (): string | null => {
  // Check for auth bypass mode
  if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return 'bypass-token';
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; token=`);
  
  if (parts.length !== 2) {
    return null;
  }

  const cookieValue = parts.pop()?.split(';').shift() || null;
  if (!cookieValue) {
    return null;
  }

  try {
    // JWT format: header.payload.signature
    const payload = cookieValue.split('.')[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (decoded.exp && typeof decoded.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      
      if (decoded.exp < now) {
        // Token expired
        console.warn('Auth token expired');
        return null;
      }
    }
    
    return cookieValue;
  } catch (e) {
    // If parsing fails, treat as invalid
    console.error('Token validation failed:', e);
    return null;
  }
};

/**
 * Get HTTP headers with authentication
 * Includes JWT token in Authorization header if available
 * @returns Headers object with Content-Type and Authorization
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token && token !== 'bypass-token') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Check if user is currently authenticated
 * @returns true if valid token exists, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Check if cached data is stale and needs refreshing
 * @param lastFetched Timestamp of last fetch in milliseconds
 * @param maxAge Maximum age in milliseconds (default: 5 minutes)
 * @returns true if data should be refetched
 */
export const isDataStale = (lastFetched: number | null, maxAge: number = 5 * 60 * 1000): boolean => {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > maxAge;
};
