import { useSyncExternalStore } from 'react';

export type Route = { view: 'list' } | { view: 'detail'; code: string };

/*
 * Hash routing (`#/country/BEL`) instead of the History API: GitHub Pages has no
 * SPA fallback, so a refreshed `/country/BEL` path would 404. The hash never hits the server.
 */

export const listHref = '#/';
export const countryHref = (code: string) => `#/country/${encodeURIComponent(code)}`;

export function parseHash(hash: string): Route {
  const match = /^#\/country\/([^/?#]+)/.exec(hash);
  if (match?.[1]) return { view: 'detail', code: decodeURIComponent(match[1]) };
  return { view: 'list' };
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
