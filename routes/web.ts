import { buildCalendarFeed, calendarFeedHeaders } from '@stacksjs/calendar-api'
import { suppress, verifyUnsubscribeToken } from '@stacksjs/email'
import { route } from '@stacksjs/router'
import { absolute, artist, indexable } from '../resources/data/site'
import { renderCityCard } from '../resources/data/city-cards'
import { citiesOf, tour } from '../resources/data/shows'

/**
 * Every upcoming show as one subscribable calendar.
 *
 * Built from the same Bandsintown data as the page, with each show pinned to
 * its venue's zone, so a fan in New York subscribing to a Los Angeles date
 * sees it at the right hour. UIDs are Bandsintown's event ids: stable, so a
 * moved show updates in place instead of appearing twice.
 */
route.get('/tour.ics', async () => {
  const { shows } = await tour()

  const body = buildCalendarFeed({
    name: `${artist.name} tour dates`,
    prodId: '-//Mario Adrion//Tour//EN',
    refreshInterval: 'PT6H',
    events: shows.map(show => ({
      uid: `bandsintown-${show.id}@marioadrion.com`,
      title: `${artist.name} at ${show.venue.name}`,
      start: show.startsAt,
      // Club sets run about ninety minutes, headliner plus openers.
      end: new Date(show.startsAt.getTime() + 90 * 60_000),
      location: [show.venue.name, show.venue.street, show.venue.city, show.venue.region].filter(Boolean).join(', '),
      description: `${artist.tour}. Tickets: ${show.ticketUrl}`,
      url: show.ticketUrl,
    })),
  })

  return new Response(body, { headers: calendarFeedHeaders('mario-adrion-tour.ics') })
})

/**
 * Crawl rules and the sitemap, served rather than committed so both name the
 * origin this build actually runs on (APP_URL), never a hard-coded one.
 */
route.get('/robots.txt', () => new Response(
  indexable
    ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${absolute('/sitemap.xml')}\n`
    // A preview host is a copy of Mario's site; keep it out of search.
    : 'User-agent: *\nDisallow: /\n',
  { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
))

// The home page and a page per city on the tour. Cities come and go with
// Bandsintown, so this is read from the same data every request.
route.get('/sitemap.xml', async () => {
  const pages = [
    `  <url><loc>${absolute('/')}</loc><changefreq>daily</changefreq></url>`,
    ...citiesOf(await tour()).map(city => `  <url><loc>${absolute(`/tour/${city.slug}`)}</loc><changefreq>daily</changefreq></url>`),
  ]

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
  )
})

/**
 * The unsubscribe link in the city alert emails, taken over from the
 * framework's `email` routes (an app's own route wins) so a fan lands on a
 * page of this site rather than a line of plain text. Same signed token, same
 * `email_suppressions` list that `mail.send()` checks.
 *
 * GET is the person clicking the link; POST is the mail client's one-click
 * unsubscribe button (RFC 8058), which only needs a 200.
 */
async function unsubscribe(token: string): Promise<boolean> {
  const result = verifyUnsubscribeToken(token)
  if (!result.valid || !result.email)
    return false

  await suppress(result.email, 'unsubscribe', 'city alert unsubscribe link')
  return true
}

const tokenOf = (req: unknown): string => (req as { params?: { token?: string } }).params?.token ?? ''

route.get('/_stacks/email/unsubscribe/{token}', async req => Response.redirect(
  absolute((await unsubscribe(tokenOf(req))) ? '/unsubscribed' : '/unsubscribed?expired=1'),
  303,
)).skipCsrf()

route.post('/_stacks/email/unsubscribe/{token}', async req => new Response(
  (await unsubscribe(tokenOf(req))) ? 'Unsubscribed.' : 'This link has expired.',
  { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
)).skipCsrf()

/**
 * Each city page's share card, drawn on request (resources/data/city-cards.ts).
 * The page links it with a `?v=` hash of its words, so it can be cached hard.
 */
route.get('/social/tour/{file}', async (req) => {
  const file = (req as { params?: { file?: string } }).params?.file ?? ''
  const city = citiesOf(await tour()).find(candidate => `${candidate.slug}.jpg` === file)
  const card = city ? await renderCityCard(city) : null
  if (!card)
    return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(card.bytes), {
    headers: { 'Content-Type': card.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
})
