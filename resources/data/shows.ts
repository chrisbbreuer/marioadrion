/**
 * Mario's tour dates, read from Bandsintown on the server.
 *
 * The old site embedded the Bandsintown widget: an iframe that rendered 61
 * identical rows after the page loaded, invisible to search engines, with a
 * third-party script on every visit. The same data comes from the public API
 * the widget itself calls, so the dates render here as real HTML, grouped by
 * venue, with schema.org events for search and a calendar feed.
 *
 * Bandsintown stays the source of truth: dates are added there and appear
 * here within `FRESH_SECONDS`. When it is unreachable the page serves the last
 * good copy, then the committed snapshot, and never an empty tour.
 */

import { cache } from '@stacksjs/cache'
import { isoInZone, zonedTimeToUtc } from '@stacksjs/datetime'
import snapshot from './bandsintown-snapshot.json'
import { venueTimeZone } from './zones'

export const ARTIST_ID = '15601048'
const APP_ID = 'js_www.marioadrion.com'
const SOURCE_URL = `https://rest.bandsintown.com/artists/id_${ARTIST_ID}/events?app_id=${APP_ID}`
export const BANDSINTOWN_URL = `https://www.bandsintown.com/a/${ARTIST_ID}-mario-adrion`

const FRESH_SECONDS = 15 * 60
const FETCH_TIMEOUT_MS = 5000
// A show stays listed through its own evening, so a late walk-up still finds
// the ticket link.
const GRACE_MS = 4 * 60 * 60 * 1000
// Two dates at one venue this close together are the same weekend run.
const RUN_GAP_DAYS = 3

interface RawEvent {
  id: string
  url: string
  datetime: string
  title?: string
  venue: {
    name: string
    city: string
    region: string
    country: string
    location?: string
    street_address?: string
    postal_code?: string
    latitude?: string
    longitude?: string
  }
  offers?: { type: string, url: string, status: string }[]
  sold_out?: boolean
}

export interface Venue {
  name: string
  city: string
  region: string
  country: string
  street: string
  postalCode: string
  latitude: number | null
  longitude: number | null
}

export interface Show {
  id: string
  /** The time printed on the ticket, in the venue's zone. */
  wallClock: string
  timeZone: string
  startsAt: Date
  /** ISO 8601 with the venue's offset, for schema.org. */
  startIso: string
  weekday: string
  month: string
  day: string
  year: string
  time: string
  venue: Venue
  ticketUrl: string
  eventUrl: string
  soldOut: boolean
}

export interface Run {
  key: string
  venue: Venue
  place: string
  shows: Show[]
  /** "Oct 1" or "Oct 1 - 4" or "Jan 29 - Feb 1". */
  dates: string
  month: string
  year: string
  soldOut: boolean
}

export interface Tour {
  shows: Show[]
  runs: Run[]
  cities: number
  source: 'live' | 'cached' | 'snapshot'
}

function num(value: string | undefined): number | null {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : null
}

function part(instant: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(instant)
}

export function normaliseEvent(raw: RawEvent): Show | null {
  if (!raw?.id || !raw.datetime || !raw.venue?.name)
    return null

  const venue: Venue = {
    name: raw.venue.name.trim(),
    city: raw.venue.city?.trim() ?? '',
    region: raw.venue.region?.trim() ?? '',
    country: raw.venue.country?.trim() ?? '',
    street: raw.venue.street_address?.trim() ?? '',
    postalCode: raw.venue.postal_code?.trim() ?? '',
    latitude: num(raw.venue.latitude),
    longitude: num(raw.venue.longitude),
  }

  const timeZone = venueTimeZone({ region: venue.region, country: venue.country, longitude: venue.longitude })
  let startsAt: Date
  try {
    startsAt = zonedTimeToUtc(raw.datetime, timeZone)
  }
  catch {
    return null
  }

  const tickets = raw.offers?.find(offer => offer.type === 'Tickets') ?? raw.offers?.[0]
  const soldOut = raw.sold_out === true || tickets?.status === 'sold out'

  return {
    id: String(raw.id),
    wallClock: raw.datetime,
    timeZone,
    startsAt,
    startIso: isoInZone(startsAt, timeZone),
    weekday: part(startsAt, timeZone, { weekday: 'short' }),
    month: part(startsAt, timeZone, { month: 'short' }),
    day: part(startsAt, timeZone, { day: 'numeric' }),
    year: part(startsAt, timeZone, { year: 'numeric' }),
    time: part(startsAt, timeZone, { hour: 'numeric', minute: '2-digit' }),
    venue,
    ticketUrl: tickets?.url ?? raw.url,
    eventUrl: raw.url,
    soldOut,
  }
}

export function placeOf(venue: Venue): string {
  if (venue.country === 'United States' || venue.country === 'Canada' || venue.country === 'Australia')
    return [venue.city, venue.region].filter(Boolean).join(', ')
  return [venue.city, venue.country].filter(Boolean).join(', ')
}

function dayNumber(show: Show): number {
  const [y, m, d] = show.wallClock.slice(0, 10).split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!) / 86_400_000
}

function dateRange(first: Show, last: Show): string {
  if (first.wallClock.slice(0, 10) === last.wallClock.slice(0, 10))
    return `${first.month} ${first.day}`
  if (first.month === last.month)
    return `${first.month} ${first.day} - ${last.day}`
  return `${first.month} ${first.day} - ${last.month} ${last.day}`
}

/** Consecutive dates at one venue become one run, the way a club books a weekend. */
export function groupRuns(shows: Show[]): Run[] {
  const runs: Run[] = []

  for (const show of shows) {
    const current = runs.at(-1)
    const previous = current?.shows.at(-1)
    const sameRun = current
      && previous
      && current.venue.name === show.venue.name
      && current.venue.city === show.venue.city
      && dayNumber(show) - dayNumber(previous) <= RUN_GAP_DAYS

    if (sameRun) {
      current.shows.push(show)
      continue
    }

    runs.push({
      key: show.id,
      venue: show.venue,
      place: placeOf(show.venue),
      shows: [show],
      dates: '',
      month: show.month,
      year: show.year,
      soldOut: false,
    })
  }

  for (const run of runs) {
    run.dates = dateRange(run.shows[0]!, run.shows.at(-1)!)
    run.soldOut = run.shows.every(show => show.soldOut)
  }

  return runs
}

export function buildTour(raw: RawEvent[], source: Tour['source'], now = Date.now()): Tour {
  const shows = raw
    .map(normaliseEvent)
    .filter((show): show is Show => show !== null && show.startsAt.getTime() + GRACE_MS > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())

  const runs = groupRuns(shows)
  const cities = new Set(shows.map(show => placeOf(show.venue))).size

  return { shows, runs, cities, source }
}

async function readSource(): Promise<RawEvent[]> {
  const res = await fetch(SOURCE_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok)
    throw new Error(`Bandsintown answered ${res.status}`)

  const body = await res.json()
  // An artist with no dates gets `[]`; an unknown app_id gets an object with
  // an error message. Only the first is a real answer.
  if (!Array.isArray(body))
    throw new Error('Bandsintown returned something other than a list of events')
  return body as RawEvent[]
}

let lastGood: RawEvent[] | null = null

/** The upcoming tour, cached for a quarter of an hour. */
export async function tour(): Promise<Tour> {
  try {
    const raw = await cache.remember('bandsintown:events', FRESH_SECONDS, readSource)
    lastGood = raw
    return buildTour(raw, 'live')
  }
  catch (error) {
    console.warn(`[shows] ${error instanceof Error ? error.message : String(error)}; serving ${lastGood ? 'the last good copy' : 'the snapshot'}`)
    if (lastGood)
      return buildTour(lastGood, 'cached')
    return buildTour(snapshot as RawEvent[], 'snapshot')
  }
}
