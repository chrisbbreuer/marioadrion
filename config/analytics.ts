import type { AnalyticsConfig } from '@stacksjs/types'

/**
 * **Analytics Configuration**
 *
 * AnalyticsHQ (https://analyticshq.org): cookie-free, so no consent banner.
 * The site lives in Chris's AnalyticsHQ account; the tag is rendered by
 * resources/partials/head.stx in production only, so local development
 * never counts as a visit.
 *
 * Ticket clicks are custom events declared in markup
 * (`data-analyticshq-event="Ticket click"` in resources/components/TourRun.stx),
 * with the city, venue and show time as properties.
 */
export default {
  driver: 'analyticshq',

  drivers: {
    analyticshq: {
      siteId: 'd61994a9bf380d24c81029c3',
    },
  },
} satisfies AnalyticsConfig
