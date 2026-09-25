/**
 * schema.org for search: Mario as a Person, and every show as a ComedyEvent
 * that names him as the performer. Shared by the home page and the city
 * pages so an event is described the same way wherever it appears.
 */

import type { Show } from './shows'
import { BANDSINTOWN_URL } from './shows'
import { absolute, artist, siteOrigin, socialImage, socialImageSquare, socials } from './site'

export const personId = `${siteOrigin}/#mario`

export function person(): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': personId,
    'name': artist.name,
    'url': absolute('/'),
    'image': socialImage,
    'jobTitle': 'Stand-up comedian',
    'homeLocation': { '@type': 'Place', 'name': 'Los Angeles, CA' },
    'sameAs': [...socials.map(social => social.href), artist.imdb, BANDSINTOWN_URL],
  }
}

export function comedyEvent(show: Show, images: string[] = [socialImage, socialImageSquare]): Record<string, unknown> {
  return {
    '@type': 'ComedyEvent',
    'name': `${artist.name}: ${artist.tour}`,
    'startDate': show.startIso,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'Place',
      'name': show.venue.name,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': show.venue.street,
        'addressLocality': show.venue.city,
        'addressRegion': show.venue.region,
        'postalCode': show.venue.postalCode,
        'addressCountry': show.venue.country,
      },
    },
    'image': images,
    'performer': { '@id': personId },
    'offers': {
      '@type': 'Offer',
      'url': show.ticketUrl,
      'availability': show.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  }
}

/** A graph as the string a `<script type="application/ld+json">` carries. */
export function jsonLdGraph(nodes: Record<string, unknown>[]): string {
  // `<` escaped so a venue name can never close the script element.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replaceAll('<', '\\u003c')
}
