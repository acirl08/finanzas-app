/**
 * Safe localStorage utilities
 * Handles SSR, private browsing mode, and corrupted data gracefully
 */

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get an item from localStorage
 * Returns null if localStorage is unavailable or key doesn't exist
 */
export function safeGetItem(key: string): string | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    return localStorage.getItem(key);
  } catch {
    console.warn(`Failed to read from localStorage: ${key}`);
    return null;
  }
}

/**
 * Safely set an item in localStorage
 * Returns true if successful, false otherwise
 */
export function safeSetItem(key: string, value: string): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write to localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    console.warn(`Failed to remove from localStorage: ${key}`);
    return false;
  }
}

/**
 * Safely parse JSON from localStorage with a default value
 * Returns defaultValue if parsing fails or data doesn't exist
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  const item = safeGetItem(key);
  if (item === null) return defaultValue;

  try {
    return JSON.parse(item) as T;
  } catch {
    console.warn(`Failed to parse JSON from localStorage: ${key}`);
    return defaultValue;
  }
}

/**
 * Safely stringify and store JSON in localStorage
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    const stringified = JSON.stringify(value);
    return safeSetItem(key, stringified);
  } catch {
    console.warn(`Failed to stringify JSON for localStorage: ${key}`);
    return false;
  }
}
