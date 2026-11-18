import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { ApiError, fetchAllCountries } from './countries';
import type { Country, RegionFilter } from './types';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CountriesSnapshot {
  status: LoadStatus;
  /** Accumulated so far — grows page by page while `status === 'loading'`. */
  countries: Country[];
  error: string | null;
}

const CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IDLE: CountriesSnapshot = { status: 'idle', countries: [], error: null };

/**
 * One snapshot per region key ("all", "Asia", …). Living outside React means:
 * - concurrent callers for the same region share one request,
 * - switching filters back and forth never refetches,
 * - snapshots keep a stable identity, which `useSyncExternalStore` needs.
 */
const snapshots = new Map<string, CountriesSnapshot>();
const listeners = new Set<() => void>();

const keyFor = (region: RegionFilter) => region ?? 'all';
const storageKey = (key: string) => `rest-countries:v${CACHE_VERSION}:${key}`;

function setSnapshot(key: string, next: CountriesSnapshot) {
  snapshots.set(key, next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readCache(key: string): Country[] | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; countries: Country[] };
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS || !Array.isArray(parsed.countries)) return null;
    return parsed.countries;
  } catch {
    return null; // Private mode, quota, or corrupted JSON — just refetch.
  }
}

function writeCache(key: string, countries: Country[]) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify({ savedAt: Date.now(), countries }));
  } catch {
    // Storage full or unavailable: the in-memory copy is enough for this session.
  }
}

/** Starts loading a region unless it's already loaded or in flight. */
export function loadCountries(region: RegionFilter, { force = false } = {}) {
  const key = keyFor(region);
  const current = snapshots.get(key);
  if (!force && current && (current.status === 'loading' || current.status === 'success')) return;

  if (!force) {
    const cached = readCache(key);
    if (cached) {
      setSnapshot(key, { status: 'success', countries: cached, error: null });
      return;
    }
  }

  setSnapshot(key, { status: 'loading', countries: [], error: null });

  fetchAllCountries(region, (soFar) => setSnapshot(key, { status: 'loading', countries: soFar, error: null }))
    .then((countries) => {
      writeCache(key, countries);
      setSnapshot(key, { status: 'success', countries, error: null });
    })
    .catch((error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : 'Network error — check your connection and try again.';
      setSnapshot(key, { status: 'error', countries: snapshots.get(key)?.countries ?? [], error: message });
    });
}

/** Subscribes a component to the countries of one region, triggering the fetch on first use. */
export function useCountries(region: RegionFilter) {
  const key = keyFor(region);
  const snapshot = useSyncExternalStore(subscribe, () => snapshots.get(key) ?? IDLE);

  useEffect(() => {
    loadCountries(region);
  }, [region]);

  const retry = useCallback(() => loadCountries(region, { force: true }), [region]);

  return { ...snapshot, retry };
}
