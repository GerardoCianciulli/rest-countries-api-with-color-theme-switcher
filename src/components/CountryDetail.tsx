import type { Ref } from 'react';
import type { Country } from '../api/types';
import { countryHref, listHref } from '../hooks/useHashRoute';
import { formatNumber, orNA } from '../lib/format';
import ArrowLeftIcon from '../icons/arrow-left.svg?react';

interface CountryDetailProps {
  country: Country;
  /** alpha-3 → names.common, built from the full ("all regions") dataset. */
  namesByCode: ReadonlyMap<string, string>;
  /** Focus target after navigation, so screen readers land on the new content. */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function BackLink() {
  return (
    <a className="button back-link" href={listHref}>
      <ArrowLeftIcon className="back-link__icon" aria-hidden="true" focusable="false" />
      Back
    </a>
  );
}

// React 19: `ref` is a regular prop on function components — no forwardRef needed.
export function CountryDetail({ country, namesByCode, headingRef }: CountryDetailProps) {
  const borders = country.borders.map((code) => ({ code, name: namesByCode.get(code) }));

  return (
    <article className="detail">
      <img
        className="detail__flag"
        src={country.flag}
        alt={`Flag of ${country.name}`}
        width={560}
        height={401}
        decoding="async"
      />

      <div className="detail__body">
        <h2 ref={headingRef} className="detail__name" tabIndex={-1}>
          {country.name}
        </h2>

        <div className="detail__stats">
          <dl className="detail__list">
            <div>
              <dt>Native Name:</dt> <dd>{orNA(country.nativeNames)}</dd>
            </div>
            <div>
              <dt>Population:</dt> <dd>{formatNumber(country.population)}</dd>
            </div>
            <div>
              <dt>Region:</dt> <dd>{orNA(country.region)}</dd>
            </div>
            <div>
              <dt>Sub Region:</dt> <dd>{orNA(country.subregion)}</dd>
            </div>
            <div>
              <dt>Capital:</dt> <dd>{orNA(country.capitals)}</dd>
            </div>
          </dl>
          <dl className="detail__list">
            <div>
              <dt>Top Level Domain:</dt> <dd>{orNA(country.tlds)}</dd>
            </div>
            <div>
              <dt>Currencies:</dt> <dd>{orNA(country.currencies)}</dd>
            </div>
            <div>
              <dt>Languages:</dt> <dd>{orNA(country.languages)}</dd>
            </div>
          </dl>
        </div>

        <section className="detail__borders" aria-labelledby="border-countries-title">
          <h3 id="border-countries-title" className="detail__borders-title">
            Border Countries:
          </h3>
          {borders.length > 0 ? (
            <ul className="detail__border-list">
              {borders.map(({ code, name }) => (
                <li key={code}>
                  <a className="button border-chip" href={countryHref(code)}>
                    {name ?? code}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="detail__no-borders">None</p>
          )}
        </section>
      </div>
    </article>
  );
}
