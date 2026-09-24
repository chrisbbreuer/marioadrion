import { env } from '@stacksjs/env'

/**
 * Everything about Mario that the pages print, in one place.
 *
 * Copy is Mario's own, lifted from marioadrion.com; nothing here is invented.
 * Numbers that change (the tour) come from Bandsintown, not from this file.
 */

/**
 * The canonical origin, read from APP_URL so a canonical link or og:image
 * never names a host this build does not serve. APP_URL is a bare host in
 * development and a full URL in production.
 */
export const siteOrigin = normalizeOrigin(String(env.APP_URL || 'https://www.marioadrion.com'))

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (/^https?:\/\//.test(trimmed))
    return trimmed
  const host = trimmed.split(':')[0] ?? ''
  const local = /(^|\.)localhost$|^127\.|^0\.0\.0\.0$/.test(host)
  return `${local ? 'http' : 'https'}://${trimmed}`
}

export function absolute(path: string): string {
  return `${siteOrigin}${path.startsWith('/') ? path : `/${path}`}`
}

export const artist = {
  name: 'Mario Adrion',
  tour: 'The Superior Comedy Tour',
  previousTour: 'The German Efficiency Tour',
  homeBase: 'Los Angeles',
  imdb: 'https://www.imdb.com/name/nm8270575/',
}

/** The bio from marioadrion.com, split where it turns from who to what. */
export const bio = [
  'Mario Adrion is a stand-up comedian from a small town in Germany who gained over 4 million followers from posting his comedy across various social platforms. His comedy is refreshingly vulnerable, playing with the struggles and stereotypes of being a retired male model and as a European living in the United States.',
  'Over the past few years, Mario has been touring “The German Efficiency Tour” around the world, with sold out shows across the US, UK, Europe, and the Middle East. His debut hourlong special “My Struggle” premiered on YouTube in March 2026, and he is currently in the middle of an even bigger international tour, “The Superior Comedy Tour,” in clubs and theaters across the globe.',
  'Based out of Los Angeles, Mario is one of the hottest new comics and you don’t want to miss his European charm.',
]

export const special = {
  title: 'My Struggle',
  youtubeId: '0E54LoeEdUc',
  premiered: 'March 2026',
  url: 'https://www.youtube.com/watch?v=0E54LoeEdUc',
}

export interface Social {
  label: string
  handle: string
  href: string
  icon: string
}

export const socials: Social[] = [
  { label: 'Instagram', handle: '@marioadrion', href: 'https://www.instagram.com/marioadrion/', icon: 'i-simple-icons-instagram' },
  { label: 'TikTok', handle: '@marioadrioncomedy1', href: 'https://www.tiktok.com/@marioadrioncomedy1', icon: 'i-simple-icons-tiktok' },
  { label: 'YouTube', handle: '@marioadrioncomedy', href: 'https://www.youtube.com/@marioadrioncomedy', icon: 'i-simple-icons-youtube' },
  { label: 'X', handle: '@marioadrion', href: 'https://x.com/marioadrion', icon: 'i-simple-icons-x' },
  { label: 'Facebook', handle: 'marioadrion', href: 'https://www.facebook.com/marioadrion', icon: 'i-simple-icons-facebook' },
  { label: 'Threads', handle: '@marioadrion', href: 'https://www.threads.net/@marioadrion', icon: 'i-simple-icons-threads' },
]

export const socialImage = absolute('/social/og.jpg')
export const socialImageAlt = 'Mario Adrion laughing on stage with a microphone'
