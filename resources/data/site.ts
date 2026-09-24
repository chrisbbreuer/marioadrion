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

/**
 * Whether search engines may index this deployment. Only on Mario's own
 * domain: a preview such as marioadrion.stacksjs.com is a copy of his site
 * and must not compete with it in search.
 */
export const indexable = /^https:\/\/(www\.)?marioadrion\.com$/.test(siteOrigin)

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

export interface Contact {
  role: string
  name: string
  email: string
}

/** Who to write to, as Mario's team lists it. Business enquiries only. */
export const contacts: Contact[] = [
  { role: 'Management', name: 'Stephen Walker', email: 'stephen@wtwtalent.com' },
  { role: 'Agent', name: 'Valentijn Sloot', email: 'vsloot@gersh.com' },
]

export interface Social {
  label: string
  handle: string
  href: string
  /**
   * An Iconify class from hugeicons, the one collection this project installs
   * (@iconify-json/hugeicons). A class from any other collection renders
   * nothing at all, with no build error, which is how every one of these
   * came to be blank.
   */
  icon: string
  /** Also shown as an icon button in the top nav. */
  nav?: boolean
}

export const socials: Social[] = [
  { label: 'Instagram', handle: '@marioadrion', href: 'https://www.instagram.com/marioadrion/', icon: 'i-hugeicons-instagram', nav: true },
  { label: 'TikTok', handle: '@marioadrioncomedy1', href: 'https://www.tiktok.com/@marioadrioncomedy1', icon: 'i-hugeicons-tiktok', nav: true },
  { label: 'YouTube', handle: '@marioadrioncomedy', href: 'https://www.youtube.com/@marioadrioncomedy', icon: 'i-hugeicons-youtube', nav: true },
  { label: 'X', handle: '@marioadrion', href: 'https://x.com/marioadrion', icon: 'i-hugeicons-new-twitter' },
  { label: 'Facebook', handle: 'marioadrion', href: 'https://www.facebook.com/marioadrion', icon: 'i-hugeicons-facebook-01' },
  { label: 'Threads', handle: '@marioadrion', href: 'https://www.threads.net/@marioadrion', icon: 'i-hugeicons-threads' },
]

export const navSocials: Social[] = socials.filter(social => social.nav)

export const socialImage = absolute('/social/og.jpg')
export const socialImageAlt = 'Mario Adrion laughing on stage with a microphone'
