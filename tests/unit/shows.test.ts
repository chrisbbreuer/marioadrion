import { describe, expect, it } from 'bun:test'
import snapshot from '../../resources/data/bandsintown-snapshot.json'
import { buildTour, citiesOf, citySlug, groupRuns, normaliseEvent } from '../../resources/data/shows'
import { venueTimeZone } from '../../resources/data/zones'

// The snapshot was taken on 2026-09-24; pin "now" before the first show so
// these assertions do not drift as the dates pass.
const BEFORE_TOUR = Date.parse('2026-09-24T00:00:00Z')

describe('venue time zones', () => {
  it('maps US states to the zone their clubs run on', () => {
    expect(venueTimeZone({ region: 'CT', country: 'United States', longitude: -72.09 })).toBe('America/New_York')
    expect(venueTimeZone({ region: 'AZ', country: 'United States', longitude: -111.9 })).toBe('America/Phoenix')
    expect(venueTimeZone({ region: 'AL', country: 'United States', longitude: -86.6 })).toBe('America/Chicago')
  })

  it('puts El Paso on Mountain time, not the rest of Texas', () => {
    expect(venueTimeZone({ region: 'TX', country: 'United States', longitude: -106.4 })).toBe('America/Denver')
    expect(venueTimeZone({ region: 'TX', country: 'United States', longitude: -97.7 })).toBe('America/Chicago')
  })

  it('falls back to the country, then to longitude', () => {
    expect(venueTimeZone({ region: 'Bavaria', country: 'Germany', longitude: 11.5 })).toBe('Europe/Berlin')
    expect(venueTimeZone({ region: '', country: 'Atlantis', longitude: 75 })).toBe('Etc/GMT-5')
  })
})

describe('shows', () => {
  it('reads the ticket time in the venue zone', () => {
    const show = normaliseEvent(snapshot[0] as any)!
    // Comix at Mohegan Sun, 8pm Eastern daylight time.
    expect(show.startIso).toBe('2026-10-01T20:00:00-04:00')
    expect(show.startsAt.toISOString()).toBe('2026-10-02T00:00:00.000Z')
    expect(`${show.weekday} ${show.time}`).toBe('Thu 8:00 PM')
  })

  it('groups a venue weekend into one run', () => {
    const tour = buildTour(snapshot as any, 'snapshot', BEFORE_TOUR)
    expect(tour.shows).toHaveLength(61)
    expect(tour.runs).toHaveLength(19)
    expect(tour.cities).toBe(17)

    const first = tour.runs[0]!
    expect(first.place).toBe('Montville, CT')
    expect(first.dates).toBe('Oct 1 - 3')
    expect(first.shows).toHaveLength(4)
  })

  it('keeps the same venue weeks apart as separate runs', () => {
    const bellyRoom = buildTour(snapshot as any, 'snapshot', BEFORE_TOUR).runs.filter(run => run.venue.name.startsWith('The Belly Room'))
    expect(bellyRoom.map(run => run.dates)).toEqual(['Oct 29', 'Nov 16', 'Dec 19'])
  })

  it('drops shows once their evening is over', () => {
    const afterFirstWeekend = Date.parse('2026-10-05T12:00:00Z')
    const tour = buildTour(snapshot as any, 'snapshot', afterFirstWeekend)
    expect(tour.runs[0]!.place).toBe('Raleigh, NC')
  })

  it('skips an event it cannot place in time rather than inventing one', () => {
    expect(normaliseEvent({ id: 'x', url: '', datetime: 'soon', venue: { name: 'Club', city: 'A', region: 'CA', country: 'United States' } } as any)).toBeNull()
    expect(groupRuns([])).toEqual([])
  })
})

describe('cities', () => {
  const tour = buildTour(snapshot as any, 'snapshot', BEFORE_TOUR)
  const cities = citiesOf(tour)

  it('gives each place one page, named for the place', () => {
    expect(cities.length).toBe(tour.cities)
    expect(new Set(cities.map(city => city.slug)).size).toBe(cities.length)
    expect(cities.map(city => city.slug)).toContain('phoenix-az')
    expect(cities.map(city => city.slug)).toContain('west-hollywood-ca')
  })

  it('keeps two cities of the same name apart', () => {
    const venue = { name: 'Club', street: '', postalCode: '', latitude: null, longitude: null, country: 'United States' }
    expect(citySlug({ ...venue, city: 'Portland', region: 'OR' })).not.toBe(citySlug({ ...venue, city: 'Portland', region: 'ME' }))
  })

  it('collects every run in a place, in tour order', () => {
    // The Belly Room's monthly shows are separate runs, all in West Hollywood.
    const weho = cities.find(city => city.slug === 'west-hollywood-ca')!
    expect(weho.runs.length).toBe(3)
    expect(weho.dates).toBe('Oct 29 - Dec 19')
    expect(weho.shows.length).toBe(weho.runs.reduce((n, run) => n + run.shows.length, 0))
    const starts = weho.shows.map(show => show.startsAt.getTime())
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('links every run to its city page', () => {
    for (const run of tour.runs)
      expect(cities.some(city => city.slug === run.citySlug)).toBe(true)
  })
})
