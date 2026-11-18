import { memo } from 'react';
import type { Country } from '../api/types';
import { countryHref } from '../hooks/useHashRoute';
import { formatNumber, orNA } from '../lib/format';

interface CountryCardProps {
  country: Country;
  /** Eager-load the first row so the largest contentful paint isn't a lazy image. */
  priority?: boolean;
}

/**
 * "Block link" pattern: the only link is the country name, stretched over the whole card with ::after.
 * Screen readers announce a short link ("Belgium") instead of the entire card's text,
 * while mouse/touch users can still click anywhere on the card.
 */
export const CountryCard = memo(function CountryCard({ country, priority = false }: CountryCardProps) {
  return (
    <article className="card">
      <img
        className="card__flag"
        src={country.flag}
        alt=""
        width={264}
        height={160}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <div className="card__body">
        <h2 className="card__name">
          <a className="card__link" href={countryHref(country.code)} data-code={country.code}>
            {country.name}
          </a>
        </h2>
        <dl className="card__stats">
          <div>
            <dt>Population:</dt> <dd>{formatNumber(country.population)}</dd>
          </div>
          <div>
            <dt>Region:</dt> <dd>{orNA(country.region)}</dd>
          </div>
          <div>
            <dt>Capital:</dt> <dd>{orNA(country.capitals)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
});
