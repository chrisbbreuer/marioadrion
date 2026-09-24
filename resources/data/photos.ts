/**
 * Every photograph on the site: its source under resources/images, the widths
 * it is served at, and its alt text.
 *
 * `buddy images:build` runs each through @stacksjs/image and writes the
 * variants to public/images/mario plus `photos.manifest.json`, which the
 * <Photo> component renders from. Nothing is hand-resized; change a width
 * here and rebuild.
 *
 * WebP carries the page (alpha included, for the cutouts). The fallback is
 * the one format every browser has, at a single mid width, because only the
 * few browsers without WebP ever download it.
 */

export interface PhotoDefinition {
  source: string
  widths: number[]
  fallback: 'png' | 'jpeg'
  fallbackWidth: number
  alt: string
}

export const photos = {
  'stage-laugh': {
    source: 'resources/images/stage-laugh.png',
    widths: [480, 720, 960, 1280],
    fallback: 'png',
    fallbackWidth: 720,
    alt: 'Mario Adrion laughing on stage, microphone in hand',
  },
  'portrait': {
    source: 'resources/images/portrait.png',
    widths: [420, 640, 900],
    fallback: 'png',
    fallbackWidth: 640,
    alt: 'Mario Adrion in a brown Adidas shirt, arms crossed, looking off to the side',
  },
  'mic-mono': {
    source: 'resources/images/mic-mono.png',
    widths: [360, 560, 800],
    fallback: 'png',
    fallbackWidth: 560,
    alt: 'Mario Adrion in black and white, mid-joke at the microphone',
  },
  'live': {
    source: 'resources/images/live.jpg',
    widths: [480, 720],
    fallback: 'jpeg',
    fallbackWidth: 720,
    alt: 'Mario Adrion performing in front of a red and purple club backdrop',
  },
  'my-struggle': {
    source: 'resources/images/my-struggle.jpg',
    widths: [640, 960, 1280],
    fallback: 'jpeg',
    fallbackWidth: 960,
    alt: 'Poster for My Struggle: Mario Adrion holding a microphone',
  },
} satisfies Record<string, PhotoDefinition>

export type PhotoName = keyof typeof photos

export interface PhotoManifestEntry {
  width: number
  height: number
  srcset: string
  fallback: string
  placeholder: string
}
