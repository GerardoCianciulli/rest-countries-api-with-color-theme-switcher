/** Regions accepted by the `?region=` query of the REST Countries API. */
export const REGIONS = ['Africa', 'America', 'Asia', 'Europe', 'Oceania'] as const;
export type Region = (typeof REGIONS)[number];

/** `null` means "every region". */
export type RegionFilter = Region | null;

/** Raw shape returned by `GET /countries/v5?response_fields=…` (only the fields we request). */
export interface ApiCountry {
  names?: {
    common?: string;
    native?: Record<string, { common?: string; official?: string } | undefined>;
  };
  codes?: { alpha_3?: string };
  population?: number;
  region?: string;
  subregion?: string;
  capitals?: { name?: string }[];
  tlds?: string[];
  currencies?: { name?: string }[];
  languages?: { name?: string }[];
  borders?: string[];
  flag?: { url_svg?: string };
}

export interface ApiMeta {
  total: number;
  count: number;
  limit: number;
  offset: number;
  more: boolean;
}

export interface ApiResponse {
  data: {
    objects: ApiCountry[];
    meta: ApiMeta;
  };
}

/** Normalised country used throughout the UI. List fields are already comma-joined. */
export interface Country {
  /** ISO alpha-3 code — used in URLs and to resolve border countries. */
  code: string;
  name: string;
  nativeNames: string;
  population: number;
  region: string;
  subregion: string;
  capitals: string;
  tlds: string;
  currencies: string;
  languages: string;
  /** Alpha-3 codes of neighbouring countries; resolved to names at render time. */
  borders: string[];
  flag: string;
}
