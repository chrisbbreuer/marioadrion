/**
 * A share card per city page, drawn on request from the same theme as the
 * site's own card (config/images.ts), so a link to /tour/phoenix-az previews
 * as Phoenix and its dates rather than as the home page.
 *
 * Drawn on demand because the cities come from Bandsintown and change without
 * a deploy. The URL carries a hash of the card's words: when a date moves,
 * the URL moves with it, so no scraper or edge cache keeps the old card.
 */

import type { RenderedSocialCard } from '@stacksjs/image'
import type { City } from './shows'
import { renderOnDemandSocialCard } from '@stacksjs/image'
import images from '../../config/images'
import { absolute, artist } from './site'

export interface CityCardText {
  eyebrow: string
  title: string
  subtitle: string
}

/** "The Belly Room: New Material & Crowdwork Show" reads as "The Belly Room". */
function venueLabel(city: City): string {
  const names = [...new Set(city.runs.map(run => run.venue.name.split(':')[0]!.trim()))]
  return names.length === 1 ? names[0]! : `${names[0]} and more`
}

export function cityCardText(city: City): CityCardText {
  return {
    eyebrow: `${artist.name} live`,
    title: city.name,
    subtitle: `${city.dates} at ${venueLabel(city)}`,
  }
}

export function cityCardAlt(city: City): string {
  return `Mario Adrion on stage with a microphone, beside the words ${city.name}, ${city.dates} at ${venueLabel(city)}`
}

function version(text: CityCardText): string {
  return Bun.hash(JSON.stringify(text)).toString(36).slice(0, 8)
}

export function cityCardUrl(city: City): string {
  return absolute(`/social/tour/${city.slug}.jpg?v=${version(cityCardText(city))}`)
}

// Drawing a card is ~100ms of CPU; the words decide the pixels, so keep each
// one for the life of the process. Seventeen cities, well under 2MB.
const drawn = new Map<string, Promise<RenderedSocialCard | null>>()

export function renderCityCard(city: City): Promise<RenderedSocialCard | null> {
  const text = cityCardText(city)
  const key = JSON.stringify(text)
  let card = drawn.get(key)
  if (!card) {
    card = renderOnDemandSocialCard(images, text)
    drawn.set(key, card)
    card.catch(() => drawn.delete(key))
  }
  return card
}
