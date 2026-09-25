import { describe, expect, it } from 'bun:test'
import snapshot from '../../resources/data/bandsintown-snapshot.json'
import { alertKey, alertsDue, normalisePlace, requestMatches, requestTally } from '../../resources/data/alerts'
import { buildTour, citiesOf } from '../../resources/data/shows'

const BEFORE_TOUR = Date.parse('2026-09-24T00:00:00Z')
const cities = citiesOf(buildTour(snapshot as any, 'snapshot', BEFORE_TOUR))
const city = (slug: string) => cities.find(c => c.slug === slug)!

describe('matching a request to a place', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normalisePlace('  Düsseldorf ')).toBe('dusseldorf')
    expect(normalisePlace('St. Louis')).toBe(normalisePlace('Saint Louis'))
  })

  it('matches the city by name', () => {
    expect(requestMatches({ email: null, city: 'phoenix', region: '' }, city('phoenix-az'))).toBe(true)
    expect(requestMatches({ email: null, city: 'Tucson', region: '' }, city('phoenix-az'))).toBe(false)
  })

  it('matches the metro people actually type', () => {
    expect(requestMatches({ email: null, city: 'Los Angeles', region: 'CA' }, city('west-hollywood-ca'))).toBe(true)
    expect(requestMatches({ email: null, city: 'Atlanta', region: '' }, city('alpharetta-ga'))).toBe(true)
  })

  it('matches a metro named in the club, not in the city', () => {
    // Comedy Works Denver is in Greenwood Village; Pittsburgh Improv in Homestead.
    expect(requestMatches({ email: null, city: 'Denver', region: '' }, city('greenwood-village-co'))).toBe(true)
    expect(requestMatches({ email: null, city: 'Pittsburgh', region: 'PA' }, city('homestead-pa'))).toBe(true)
  })

  it('lets a state or country rule a place out, in either spelling', () => {
    expect(requestMatches({ email: null, city: 'Phoenix', region: 'Arizona' }, city('phoenix-az'))).toBe(true)
    expect(requestMatches({ email: null, city: 'Phoenix', region: 'USA' }, city('phoenix-az'))).toBe(true)
    expect(requestMatches({ email: null, city: 'Phoenix', region: 'Oregon' }, city('phoenix-az'))).toBe(false)
  })
})

describe('alerts owed', () => {
  const requests = [
    { email: 'Fan@Example.com', city: 'Phoenix', region: '' },
    // The same person asking twice gets one email.
    { email: 'fan@example.com ', city: 'phoenix', region: 'AZ' },
    // No email, nothing to send.
    { email: '', city: 'Phoenix', region: '' },
  ]

  it('sends one email per person per place', () => {
    const due = alertsDue(requests, cities, new Set())
    expect(due.length).toBe(1)
    expect(due[0]!.email).toBe('fan@example.com')
    expect(due[0]!.city.slug).toBe('phoenix-az')
  })

  it('never announces the same run to the same person twice', () => {
    const run = city('phoenix-az').runs[0]!
    expect(alertsDue(requests, cities, new Set([alertKey('fan@example.com', run)]))).toEqual([])
  })
})

describe('the management digest', () => {
  it('counts requests per place, most asked first', () => {
    const tally = requestTally([
      { email: 'a@x.com', city: 'Munich', region: 'Germany' },
      { email: null, city: 'munich', region: 'germany' },
      { email: null, city: 'Boise', region: '' },
    ])
    expect(tally).toEqual([
      { place: 'Munich, Germany', count: 2, emails: 1 },
      { place: 'Boise', count: 1, emails: 0 },
    ])
  })
})
