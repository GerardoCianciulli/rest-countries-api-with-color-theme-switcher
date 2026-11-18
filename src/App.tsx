import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import $ from 'jquery';
import { useCountries } from './api/countriesStore';
import type { RegionFilter as RegionValue } from './api/types';
import { useHashRoute } from './hooks/useHashRoute';
import { normalizeForSearch } from './lib/format';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { RegionFilter } from './components/RegionFilter';
import { CountryList } from './components/CountryList';
import { BackLink, CountryDetail } from './components/CountryDetail';

const APP_TITLE = 'Where in the world? | REST Countries';

export default function App() {
  const route = useHashRoute();

  // Search & filter live here (not in the list view) so they survive a trip to a detail page.
  const [region, setRegion] = useState<RegionValue>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Full dataset: needed on every detail page to turn border alpha-3 codes into names.
  const all = useCountries(null);
  // Per-region dataset fetched with `?region=`. When no region is selected this is the same store entry.
  const regional = useCountries(region);

  const countriesByCode = useMemo(() => new Map(all.countries.map((c) => [c.code, c])), [all.countries]);
  const namesByCode = useMemo(
    () => new Map(all.countries.map((c) => [c.code, c.name] as const)),
    [all.countries],
  );

  // Pre-normalise names once per dataset rather than on every keystroke.
  const searchIndex = useMemo(
    () => regional.countries.map((country) => ({ country, key: normalizeForSearch(country.name) })),
    [regional.countries],
  );

  const visibleCountries = useMemo(() => {
    const needle = normalizeForSearch(deferredQuery);
    if (!needle) return regional.countries;
    return searchIndex.filter((entry) => entry.key.includes(needle)).map((entry) => entry.country);
  }, [deferredQuery, regional.countries, searchIndex]);

  /* ---------- Scroll + focus management between views (jQuery for the window scroll) ---------- */
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listScrollY = useRef(0);
  const openedFromList = useRef<string | null>(null);
  const previousView = useRef(route.view);
  const routeKey = route.view === 'detail' ? `detail:${route.code}` : 'list';

  // Track the list's scroll position while it's on screen. Layout effect → the listener is removed
  // during the commit, before the browser clamps scrollTop for the (shorter) detail page.
  useLayoutEffect(() => {
    if (route.view !== 'list') return;
    const $window = $(window);
    $window.on('scroll.listPosition', () => {
      listScrollY.current = $window.scrollTop() ?? 0;
    });
    return () => {
      $window.off('scroll.listPosition');
    };
  }, [route.view]);

  useLayoutEffect(() => {
    const cameFrom = previousView.current;
    previousView.current = route.view;

    if (route.view === 'detail') {
      if (cameFrom === 'list') openedFromList.current = route.code;
      $(window).scrollTop(0);
      headingRef.current?.focus({ preventScroll: true });
      return;
    }

    if (cameFrom === 'detail') {
      $(window).scrollTop(listScrollY.current);
      const code = openedFromList.current;
      if (code) {
        document
          .querySelector<HTMLElement>(`.card__link[data-code="${CSS.escape(code)}"]`)
          ?.focus({ preventScroll: true });
      }
    }
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Detail view data ---------- */
  const detailCountry =
    route.view === 'detail'
      ? (countriesByCode.get(route.code) ?? regional.countries.find((c) => c.code === route.code))
      : undefined;

  useEffect(() => {
    document.title = detailCountry ? `${detailCountry.name} | ${APP_TITLE}` : APP_TITLE;
  }, [detailCountry]);

  const resultsMessage =
    regional.status === 'success'
      ? `${visibleCountries.length} ${visibleCountries.length === 1 ? 'country' : 'countries'}` +
        (region ? ` in ${region}` : '') +
        (deferredQuery.trim() ? ` matching “${deferredQuery.trim()}”` : '')
      : regional.status === 'loading' && regional.countries.length === 0
        ? 'Loading countries…'
        : '';

  return (
    <>
      <Header />

      <main className={`container main main--${route.view}`}>
        {route.view === 'list' ? (
          <>
            <div className="toolbar">
              <SearchBar value={query} onChange={setQuery} />
              <RegionFilter value={region} onChange={setRegion} />
            </div>

            <p className="sr-only" role="status">
              {resultsMessage}
            </p>

            <CountryList
              countries={visibleCountries}
              status={regional.status}
              error={regional.error}
              query={deferredQuery.trim()}
              onRetry={regional.retry}
            />
          </>
        ) : (
          <>
            <BackLink />
            {detailCountry ? (
              <CountryDetail country={detailCountry} namesByCode={namesByCode} headingRef={headingRef} />
            ) : all.status === 'error' ? (
              <div className="notice" role="alert">
                <p>We couldn’t load this country. {all.error}</p>
                <button type="button" className="button" onClick={all.retry}>
                  Try again
                </button>
              </div>
            ) : all.status === 'success' ? (
              <div className="notice">
                <h2 className="detail__name">Country not found</h2>
                <p>We couldn’t find a country with the code “{route.code}”.</p>
              </div>
            ) : (
              <div className="detail detail--skeleton" aria-busy="true">
                <span className="sr-only" role="status">
                  Loading country…
                </span>
                <div className="detail__flag" />
                <div className="detail__body">
                  <span className="skeleton-line skeleton-line--title" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
