/**
 * Which clock a venue runs on.
 *
 * Bandsintown publishes the time printed on the ticket (`2026-10-01T20:00:00`)
 * and never the zone, so the zone has to come from where the venue is. A full
 * tz boundary database is several megabytes to answer this for a comedy tour,
 * so it goes region first, then country, then longitude:
 *
 * - US states and Canadian provinces by their majority zone. The split states
 *   (Indiana, Kentucky, Tennessee, the Florida panhandle, west Texas) resolve
 *   to where most of their clubs are; a longitude check corrects the two that
 *   straddle Mountain and Central in a way that matters.
 * - Every country Mario has toured, by its one zone.
 * - Anything else by longitude, as a fixed `Etc/GMT` offset. Off by an hour in
 *   summer at worst, which beats pretending the show is in Los Angeles.
 */

const US: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DC: 'America/New_York',
  DE: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  IA: 'America/Chicago', ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', MA: 'America/New_York',
  MD: 'America/New_York', ME: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MO: 'America/Chicago', MS: 'America/Chicago', MT: 'America/Denver', NC: 'America/New_York',
  ND: 'America/Chicago', NE: 'America/Chicago', NH: 'America/New_York', NJ: 'America/New_York',
  NM: 'America/Denver', NV: 'America/Los_Angeles', NY: 'America/New_York', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VA: 'America/New_York', VT: 'America/New_York', WA: 'America/Los_Angeles',
  WI: 'America/Chicago', WV: 'America/New_York', WY: 'America/Denver', PR: 'America/Puerto_Rico',
}

const CANADA: Record<string, string> = {
  AB: 'America/Edmonton', BC: 'America/Vancouver', MB: 'America/Winnipeg', NB: 'America/Moncton',
  NL: 'America/St_Johns', NS: 'America/Halifax', ON: 'America/Toronto', PE: 'America/Halifax',
  QC: 'America/Toronto', SK: 'America/Regina', YT: 'America/Whitehorse',
}

const COUNTRIES: Record<string, string> = {
  'United Kingdom': 'Europe/London', 'Ireland': 'Europe/Dublin', 'Germany': 'Europe/Berlin',
  'Austria': 'Europe/Vienna', 'Switzerland': 'Europe/Zurich', 'Netherlands': 'Europe/Amsterdam',
  'Belgium': 'Europe/Brussels', 'Luxembourg': 'Europe/Luxembourg', 'France': 'Europe/Paris',
  'Spain': 'Europe/Madrid', 'Portugal': 'Europe/Lisbon', 'Italy': 'Europe/Rome',
  'Denmark': 'Europe/Copenhagen', 'Sweden': 'Europe/Stockholm', 'Norway': 'Europe/Oslo',
  'Finland': 'Europe/Helsinki', 'Iceland': 'Atlantic/Reykjavik', 'Poland': 'Europe/Warsaw',
  'Czech Republic': 'Europe/Prague', 'Czechia': 'Europe/Prague', 'Hungary': 'Europe/Budapest',
  'Greece': 'Europe/Athens', 'Croatia': 'Europe/Zagreb', 'Malta': 'Europe/Malta', 'Cyprus': 'Asia/Nicosia',
  'United Arab Emirates': 'Asia/Dubai', 'Qatar': 'Asia/Qatar', 'Bahrain': 'Asia/Bahrain',
  'Kuwait': 'Asia/Kuwait', 'Oman': 'Asia/Muscat', 'Saudi Arabia': 'Asia/Riyadh', 'Jordan': 'Asia/Amman',
  'Lebanon': 'Asia/Beirut', 'Israel': 'Asia/Jerusalem', 'Egypt': 'Africa/Cairo', 'Turkey': 'Europe/Istanbul',
  'Singapore': 'Asia/Singapore', 'Hong Kong': 'Asia/Hong_Kong', 'Japan': 'Asia/Tokyo',
  'South Africa': 'Africa/Johannesburg', 'New Zealand': 'Pacific/Auckland', 'Mexico': 'America/Mexico_City',
}

const AUSTRALIA: Record<string, string> = {
  NSW: 'Australia/Sydney', ACT: 'Australia/Sydney', VIC: 'Australia/Melbourne', QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide', WA: 'Australia/Perth', TAS: 'Australia/Hobart', NT: 'Australia/Darwin',
}

export interface VenuePlace {
  region: string
  country: string
  longitude: number | null
}

export function venueTimeZone({ region, country, longitude }: VenuePlace): string {
  const code = region.trim().toUpperCase()

  if (country === 'United States' && US[code]) {
    // The two splits a touring comic actually meets: El Paso runs on Mountain
    // time, and the Oregon/Idaho line is irrelevant, but Texas is not.
    if (code === 'TX' && longitude !== null && longitude < -104.9)
      return 'America/Denver'
    return US[code]
  }
  if (country === 'Canada' && CANADA[code])
    return CANADA[code]
  if (country === 'Australia' && AUSTRALIA[code])
    return AUSTRALIA[code]
  if (COUNTRIES[country])
    return COUNTRIES[country]

  if (longitude === null)
    return 'UTC'

  // Etc/GMT signs are inverted by POSIX convention: Etc/GMT+5 is UTC-5.
  const hours = Math.max(-12, Math.min(14, Math.round(longitude / 15)))
  return hours === 0 ? 'UTC' : `Etc/GMT${hours > 0 ? '-' : '+'}${Math.abs(hours)}`
}
