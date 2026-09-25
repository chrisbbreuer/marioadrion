/**
 * "Hear when tickets go on sale": which city requests an announced show
 * answers.
 *
 * The request form asks for a city, an optional state or country, and an
 * optional email. Whoever left an email gets one message per run in a place
 * that matches what they typed, the first time the job sees that run. Pure,
 * so the matching is testable without a database or a mail server; the job
 * in app/Jobs/SendCityAlerts.ts does the reading, sending and recording.
 */

import type { City, Run } from './shows'

/** One "tell me where to perform" answer, as the job reads it back. */
export interface CityRequest {
  email: string | null
  city: string
  region: string
}

/** One email to send: every run in one place the person has not heard about. */
export interface DueAlert {
  email: string
  city: City
  runs: Run[]
}

/** Lowercase, no accents, no punctuation: "St. Louis" and "st louis" agree. */
export function normalisePlace(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\bst\b\.?/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Metro names people type, mapped to the cities clubs actually sit in.
 *
 * Someone in Los Angeles asks for "Los Angeles", not "West Hollywood", and a
 * Denver fan does not know Comedy Works is in Greenwood Village. The venue's
 * own name catches some of these ("Pittsburgh Improv" is in Homestead); this
 * catches the rest. Keys and values are normalised.
 */
const METROS: Record<string, string[]> = {
  'los angeles': ['west hollywood', 'hollywood', 'los angeles', 'santa monica', 'burbank', 'pasadena', 'long beach', 'brea', 'ontario'],
  'la': ['west hollywood', 'hollywood', 'los angeles', 'santa monica', 'burbank', 'pasadena', 'long beach'],
  'san diego': ['la jolla', 'san diego'],
  'orange county': ['irvine', 'brea', 'costa mesa', 'anaheim'],
  'bay area': ['san francisco', 'san jose', 'oakland', 'berkeley'],
  'san francisco': ['san francisco', 'san jose', 'oakland'],
  'atlanta': ['alpharetta', 'atlanta'],
  'detroit': ['royal oak', 'detroit'],
  'denver': ['greenwood village', 'denver'],
  'pittsburgh': ['homestead', 'pittsburgh'],
  'seattle': ['tacoma', 'seattle', 'bellevue'],
  'new york': ['new york', 'brooklyn', 'newark', 'jersey city'],
  'nyc': ['new york', 'brooklyn', 'newark', 'jersey city'],
  'palm springs': ['palm springs', 'rancho mirage', 'indio'],
  'connecticut': ['montville', 'uncasville', 'hartford', 'new haven'],
}

const US_STATES: Record<string, string> = {
  'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca', 'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md', 'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt', 'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy', 'district of columbia': 'dc',
}

const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'united states', 'us': 'united states', 'america': 'united states',
  'uk': 'united kingdom', 'england': 'united kingdom', 'scotland': 'united kingdom', 'great britain': 'united kingdom',
  'deutschland': 'germany', 'holland': 'netherlands', 'the netherlands': 'netherlands', 'uae': 'united arab emirates',
}

/** Whether "Arizona", "AZ", "USA" or "" is consistent with where a city is. */
function regionAgrees(requested: string, city: City): boolean {
  const region = normalisePlace(requested)
  if (!region)
    return true

  const venue = city.runs[0]!.venue
  const venueRegion = normalisePlace(venue.region)
  const venueCountry = normalisePlace(venue.country)

  return region === venueRegion
    || US_STATES[region] === venueRegion
    || region === venueCountry
    || COUNTRY_ALIASES[region] === venueCountry
}

/** Whether a request names this place, directly, by metro, or by the club's name. */
export function requestMatches(request: CityRequest, city: City): boolean {
  const wanted = normalisePlace(request.city)
  if (!wanted)
    return false

  const venueCities = new Set(city.runs.map(run => normalisePlace(run.venue.city)))
  const cityMatches = venueCities.has(wanted)
    || (METROS[wanted] ?? []).some(name => venueCities.has(name))
    // "Pittsburgh Improv", "Comedy Works Denver": the metro is in the name.
    || city.runs.some(run => ` ${normalisePlace(run.venue.name)} `.includes(` ${wanted} `))

  return cityMatches && regionAgrees(request.region, city)
}

/** The key a sent alert is recorded under, so a run is announced to a person once. */
export function alertKey(email: string, run: Run): string {
  return `${email.trim().toLowerCase()}|${run.key}`
}

/**
 * Every alert owed: for each email, each matching place with runs not yet
 * announced to it. Sold-out runs are left out, since there is nothing to buy.
 * One email per person per place, however many times they asked.
 */
export function alertsDue(requests: CityRequest[], cities: City[], sent: Set<string>): DueAlert[] {
  const due = new Map<string, DueAlert>()

  for (const request of requests) {
    const email = request.email?.trim().toLowerCase()
    if (!email)
      continue

    for (const city of cities) {
      if (!requestMatches(request, city))
        continue

      const key = `${email}|${city.slug}`
      const runs = city.runs.filter(run => !run.soldOut && !sent.has(alertKey(email, run)))
      if (runs.length === 0 || due.has(key))
        continue

      due.set(key, { email, city, runs })
    }
  }

  return [...due.values()]
}

/** Requests per place, most asked first, for the management digest. */
export function requestTally(requests: CityRequest[]): { place: string, count: number, emails: number }[] {
  const tally = new Map<string, { place: string, count: number, emails: number }>()

  for (const request of requests) {
    const city = request.city.trim()
    if (!city)
      continue

    const region = request.region.trim()
    const key = `${normalisePlace(city)}|${normalisePlace(region)}`
    const entry = tally.get(key) ?? { place: region ? `${city}, ${region}` : city, count: 0, emails: 0 }
    entry.count++
    if (request.email?.trim())
      entry.emails++
    tally.set(key, entry)
  }

  return [...tally.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place))
}
