const numberFormatter = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number) => numberFormatter.format(value);

/** Several territories (e.g. Antarctica, Bouvet Island) have no capital, currency or language. */
export const orNA = (value: string) => value || 'N/A';

/** Lower-cases and strips diacritics so "aland" matches "Åland Islands" and "cote" matches "Côte d'Ivoire". */
export const normalizeForSearch = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
