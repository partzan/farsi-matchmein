/** Cities available for event create (expand later). */
export type CityOption = {
  id: string;
  /** Canonical Farsi display name */
  nameFa: string;
  /** English / alternate search tokens */
  aliases: string[];
};

export const EVENT_CITIES: CityOption[] = [
  {
    id: 'rasht',
    nameFa: 'رشت',
    aliases: ['rasht', 'رشت', 'رش'],
  },
];

export function searchCities(query: string): CityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return EVENT_CITIES;
  return EVENT_CITIES.filter((c) => {
    if (c.nameFa.includes(query.trim())) return true;
    return c.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()));
  });
}
