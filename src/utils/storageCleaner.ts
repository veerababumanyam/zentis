/**
 * storageCleaner.ts
 *
 * Tiered browser-storage cleanup:
 *   - clearCacheStorage()    – evicts temporary/AI caches from localStorage (safe, no logout)
 *   - clearAllStorage()      – nuclear wipe for account deletion (LS, SS, Cache API, IndexedDB, SW)
 *
 * QuotaExceededError recovery should call clearCacheStorage() first;
 * clearAllStorage() is reserved for "delete my account" flows.
 */

// ---------------------------------------------------------------------------
// Keys that Firebase Auth uses in localStorage / IndexedDB – never evict
// during a selective cleanup or the user will be logged out.
// ---------------------------------------------------------------------------
const FIREBASE_AUTH_KEY_PREFIXES = [
  'firebase:authUser:',
  'firebase:host:',
  'firebase:previous_websocket_failure',
] as const;

/** Known temporary-cache prefixes that are safe to evict. */
const CACHE_KEY_PREFIXES = [
  'daily_huddle_',
  'analysis_cache_',
  'briefing_cache_',
  'med_search_',
] as const;

/** Known IndexedDB databases used by the app (Safari lacks indexedDB.databases()). */
const KNOWN_INDEXEDDB_NAMES = [
  'firebaseLocalStorageDb',
  'firebase-heartbeat-database',
  'firebase-installations-database',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isFirebaseAuthKey = (key: string): boolean =>
  FIREBASE_AUTH_KEY_PREFIXES.some(p => key.startsWith(p));

const isCacheKey = (key: string): boolean =>
  CACHE_KEY_PREFIXES.some(p => key.startsWith(p));

/** Returns estimated localStorage usage in bytes (UTF-16 = 2 bytes per char). */
const estimateLocalStorageBytes = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
  }
  return total;
};

// ---------------------------------------------------------------------------
// Selective cleanup – safe to call while user is logged in
// ---------------------------------------------------------------------------

/**
 * Evicts only temporary AI / huddle caches from localStorage.
 * Preserves Firebase Auth state, chat histories, and user settings.
 *
 * @returns The number of entries removed.
 */
export const clearCacheStorage = (): number => {
  const beforeBytes = estimateLocalStorageBytes();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isCacheKey(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(k => localStorage.removeItem(k));

  const freedKB = Math.round((beforeBytes - estimateLocalStorageBytes()) / 1024);
  if (keysToRemove.length > 0) {
    console.info(
      `[StorageCleaner] Evicted ${keysToRemove.length} cache entries (~${freedKB} KB freed)`,
    );
  }
  return keysToRemove.length;
};

// ---------------------------------------------------------------------------
// Nuclear cleanup – account deletion only
// ---------------------------------------------------------------------------

/**
 * Wipes **all** browser storage: localStorage, sessionStorage, Cache API,
 * IndexedDB, and unregisters service workers.
 *
 * ⚠️  This will log the user out. Only use for account deletion.
 */
export const clearAllStorage = async (): Promise<void> => {
  console.warn('[StorageCleaner] Starting full storage wipe…');

  // 1. LocalStorage
  try {
    localStorage.clear();
    console.log('[StorageCleaner] ✓ LocalStorage cleared');
  } catch (e) {
    console.error('[StorageCleaner] Failed to clear LocalStorage', e);
  }

  // 2. SessionStorage
  try {
    sessionStorage.clear();
    console.log('[StorageCleaner] ✓ SessionStorage cleared');
  } catch (e) {
    console.error('[StorageCleaner] Failed to clear SessionStorage', e);
  }

  // 3. Cache API (Service Worker caches)
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
      console.log(`[StorageCleaner] ✓ Cleared ${names.length} Cache API entries`);
    }
  } catch (e) {
    console.error('[StorageCleaner] Failed to clear Cache API', e);
  }

  // 4. IndexedDB – use databases() when available, fall back to known names
  try {
    if ('indexedDB' in window) {
      let dbNames: string[] = [];

      if (typeof indexedDB.databases === 'function') {
        const dbs = await indexedDB.databases();
        dbNames = dbs.map(db => db.name).filter((n): n is string => !!n);
      } else {
        // Safari fallback – delete known databases
        dbNames = [...KNOWN_INDEXEDDB_NAMES];
      }

      for (const name of dbNames) {
        indexedDB.deleteDatabase(name);
        console.log(`[StorageCleaner] ✓ Deleted IndexedDB: ${name}`);
      }
    }
  } catch (e) {
    console.error('[StorageCleaner] Failed to clear IndexedDB', e);
  }

  // 5. Unregister service workers (prevents caches from being re-populated)
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      if (registrations.length > 0) {
        console.log(
          `[StorageCleaner] ✓ Unregistered ${registrations.length} service worker(s)`,
        );
      }
    }
  } catch (e) {
    console.error('[StorageCleaner] Failed to unregister service workers', e);
  }

  console.log('[StorageCleaner] ✓ Full storage wipe complete. Reload required.');
};
