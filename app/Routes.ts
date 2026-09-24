/**
 * Route registry.
 *
 * `api` loads routes/api.ts under /api. `web` is the one key that loads at the
 * document root, which is where the tour calendar feed lives: calendar apps
 * are given `webcal://<host>/tour.ics`, and a feed URL, once subscribed, can
 * never move.
 *
 * @see https://docs.stacksjs.com/routing
 */
import type { RouteRegistry } from '@stacksjs/router'

export type { RouteDefinition, RouteRegistry } from '@stacksjs/router'

export default {
  api: 'api',
  web: 'web',
} satisfies RouteRegistry
