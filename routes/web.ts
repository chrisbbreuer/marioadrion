import { buildCalendarFeed, calendarFeedHeaders } from '@stacksjs/calendar-api'
import { route } from '@stacksjs/router'
import { absolute, artist } from '../resources/data/site'
import { tour } from '../resources/data/shows'

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
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${absolute('/sitemap.xml')}\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
))

route.get('/sitemap.xml', () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${absolute('/')}</loc><changefreq>daily</changefreq></url>\n</urlset>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
))
