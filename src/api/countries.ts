import type { ApiCountry, ApiResponse, Country, RegionFilter } from './types';

// Dev goes through the Vite proxy (see vite.config.ts); production hits the API directly,
// which requires the site's origin to be allow-listed for this key in the REST Countries dashboard.
const API_URL = import.meta.env.DEV ? '/rc-api/countries/v5' : 'https://api.restcountries.com/countries/v5';
const API_KEY = import.meta.env.VITE_REST_COUNTRIES_API_KEY;

/** Page size for `&limit=`. */
export const PAGE_SIZE = 25;
/** Safety valve so a misbehaving `meta.more` can never loop forever. */
const MAX_PAGES = 40;

// `codes.alpha_3` isn't displayed, but it's required to turn `borders` (alpha-3 codes) into names.
const RESPONSE_FIELDS = [
  'names.native',
  'names.common',
  'population',
  'region',
  'subregion',
  'capitals',
  'tlds',
  'currencies',
  'languages',
  'borders',
  'flag.url_svg',
  'codes.alpha_3',
].join(',');

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Builds e.g. `…/countries/v5?region=Asia&response_fields=…&limit=25&offset=50`. */
export function buildUrl(region: RegionFilter, offset: number): string {
  const params = new URLSearchParams();
  if (region) params.set('region', region);
  params.set('response_fields', RESPONSE_FIELDS);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  // Keep the commas readable — the API accepts them unencoded.
  return `${API_URL}?${params.toString().replaceAll('%2C', ',')}`;
}

const MAX_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isRetryable = (status: number) => status === 429 || status >= 500;

/**
 * The API rate-limits bursts (HTTP 429) and a full load is ~11 paged requests,
 * so transient failures are retried with exponential backoff + jitter, honouring `Retry-After`.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!isRetryable(response.status) || attempt === MAX_ATTEMPTS) return response;

      const retryAfter = Number(response.headers.get('Retry-After'));
      const backoff = 400 * 2 ** (attempt - 1) + Math.random() * 250;
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff);
    } catch (error) {
      // Aborts are intentional; other TypeErrors are network failures worth retrying.
      if ((error as Error).name === 'AbortError' || attempt === MAX_ATTEMPTS) throw error;
      await sleep(400 * 2 ** (attempt - 1));
    }
  }
}

async function fetchPage(region: RegionFilter, page: number, signal?: AbortSignal): Promise<ApiResponse['data']> {
  if (!API_KEY) {
    throw new ApiError('Missing API key. Add VITE_REST_COUNTRIES_API_KEY to .env.local and restart the dev server.');
  }

  // "Increment the offset by one page": page 0 → offset 0, page 1 → offset 25, …
  // (the API's `offset` counts items, so +1 per request would re-fetch 24 duplicates each time).
  const response = await fetchWithRetry(buildUrl(region, page * PAGE_SIZE), {
    headers: { Authorization: `Bearer ${API_KEY}` },
    signal,
  });

  if (!response.ok) {
    // The API explains itself (e.g. "Origin is not allowed for this API key"), so surface that when present.
    let detail = '';
    try {
      const body = (await response.json()) as { errors?: { message?: string }[] };
      detail = body.errors?.[0]?.message ?? '';
    } catch {
      // Non-JSON error body — fall back to the status code.
    }
    throw new ApiError(detail || `The countries service responded with ${response.status}.`, response.status);
  }

  const json = (await response.json()) as Partial<ApiResponse>;
  if (!json.data || !Array.isArray(json.data.objects)) {
    throw new ApiError('The countries service returned an unexpected response.');
  }
  return json.data;
}

/**
 * Fetches every page for a region (or all regions), page by page.
 * `onPage` receives the accumulated, normalised list after each page so the UI can render progressively.
 */
export async function fetchAllCountries(
  region: RegionFilter,
  onPage?: (countriesSoFar: Country[]) => void,
  signal?: AbortSignal,
): Promise<Country[]> {
  const countries: Country[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { objects, meta } = await fetchPage(region, page, signal);

    for (const raw of objects) {
      const country = toCountry(raw);
      if (country) countries.push(country);
    }
    onPage?.([...countries]);

    const fetched = meta.offset + meta.count;
    if (!meta.more || meta.count === 0 || fetched >= meta.total) break;
  }

  return countries;
}

/** Joins non-empty values with commas, dropping duplicates (e.g. identical native names). */
export function joinUnique(values: Array<string | undefined | null>): string {
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen].join(', ');
}

/** Normalises a raw API country. Returns `null` for entries without a flag, which we don't show. */
export function toCountry(raw: ApiCountry): Country | null {
  const flag = raw.flag?.url_svg?.trim();
  const name = raw.names?.common?.trim();
  if (!flag || !name) return null;

  return {
    code: raw.codes?.alpha_3?.trim() || name,
    name,
    nativeNames: joinUnique(Object.values(raw.names?.native ?? {}).map((entry) => entry?.common)),
    population: raw.population ?? 0,
    region: raw.region ?? '',
    subregion: raw.subregion ?? '',
    capitals: joinUnique((raw.capitals ?? []).map((capital) => capital.name)),
    tlds: joinUnique(raw.tlds ?? []),
    currencies: joinUnique((raw.currencies ?? []).map((currency) => currency.name)),
    languages: joinUnique((raw.languages ?? []).map((language) => language.name)),
    borders: (raw.borders ?? []).filter(Boolean),
    flag,
  };
}
