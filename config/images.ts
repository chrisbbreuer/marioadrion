import type { ImagesConfig } from '@stacksjs/types'

/**
 * **Images Configuration**
 *
 * Generated imagery — the social cards link previews show, the App Store
 * screenshot set, and the platform icon sets — is declared here and built by
 * `buddy generate:images`. Because Stacks is fully-typed, you may hover any of
 * the options below and the definitions will be provided. In case you have any
 * questions, feel free to reach out via Discord or GitHub Discussions.
 *
 * Every generator is off until you fill it in: each one needs an asset the
 * framework cannot invent — a TrueType face, a product capture, a square
 * source icon.
 */
export default {
  // Static instances of the site's faces: Anybody at the condensed extra-bold
  // the headlines use, Geist for the line under it. The site itself ships the
  // variable WOFF2s; the card renderer needs TrueType outlines.
  fonts: {
    title: 'resources/fonts/anybody-condensed-extrabold.ttf',
    body: 'resources/fonts/geist-medium.ttf',
  },

  // The stage: near-black with one warm spotlight, as on the page.
  background: {
    color: '#0e0e0d',
    glows: [{ x: 0.74, y: 0.42, radius: 0.42, color: '#fff4d62a' }],
  },
  color: '#f3f1ea',
  accent: '#f5c542',

  social: {
    enabled: true,
    outputDir: 'public/social',
    publicPath: '/social',
    presets: ['og', 'square'],
    format: 'jpeg',
    brand: 'Mario Adrion',
    // The cutout stands on the card the way it stands in the hero. It is not
    // a screenshot, so no frame, corner radius or drop shadow.
    foreground: 'resources/images/stage-laugh.png',
    device: { radius: 0, shadow: false },
    // No dates on the card: a generated image outlives the tour it names.
    pages: [
      { path: '/', eyebrow: 'The Superior Comedy Tour', title: 'Mario Adrion', subtitle: 'Stand-up comedian from Germany, based in Los Angeles.' },
    ],
  },

  appStore: {
    enabled: false,
  },

  appIcons: {
    enabled: true,
    source: 'resources/icon.png',
    // A website: favicons and a manifest, no Xcode asset catalogs.
    platforms: [],
    favicon: true,
    faviconDir: 'public',
    manifest: {
      name: 'Mario Adrion',
      shortName: 'Mario Adrion',
      themeColor: '#0e0e0d',
      backgroundColor: '#0e0e0d',
    },
  },
} satisfies ImagesConfig
