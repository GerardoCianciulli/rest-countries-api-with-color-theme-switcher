import type { Country } from '../api/types';
import type { LoadStatus } from '../api/countriesStore';
import { CountryCard } from './CountryCard';

interface CountryListProps {
  countries: Country[];
  status: LoadStatus;
  error: string | null;
  query: string;
  onRetry: () => void;
}

const SKELETON_COUNT = 8;
/** Cards in the first row(s) load eagerly; the rest wait until they scroll near the viewport. */
const EAGER_IMAGES = 8;

export function CountryList({ countries, status, error, query, onRetry }: CountryListProps) {
  const isInitialLoad = (status === 'loading' || status === 'idle') && countries.length === 0;

  if (isInitialLoad) {
    return (
      <ul className="country-grid" aria-hidden="true">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index} className="card card--skeleton">
            <div className="card__flag" />
            <div className="card__body">
              <span className="skeleton-line skeleton-line--title" />
              <span className="skeleton-line" />
              <span className="skeleton-line" />
              <span className="skeleton-line" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (status === 'error' && countries.length === 0) {
    return (
      <div className="notice" role="alert">
        <p>We couldn’t load the countries. {error}</p>
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="notice">
        <p>
          {query ? (
            <>
              No countries match “<strong>{query}</strong>”.
            </>
          ) : (
            'No countries found.'
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="country-grid">
        {countries.map((country, index) => (
          <li key={country.code}>
            <CountryCard country={country} priority={index < EAGER_IMAGES} />
          </li>
        ))}
      </ul>

      {status === 'loading' && (
        <p className="loading-more" aria-hidden="true">
          <span className="spinner" /> Loading more countries…
        </p>
      )}

      {status === 'error' && (
        <div className="notice" role="alert">
          <p>Some countries couldn’t be loaded. {error}</p>
          <button type="button" className="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </>
  );
}
