import type { CloudConfig } from '@stacksjs/types'
import type { CloudConfig as TsCloudConfig } from '@stacksjs/ts-cloud'
import { env } from '@stacksjs/env'

const APP_SLUG = 'marioadrion'
const APP_DOMAIN = env.APP_DOMAIN || 'marioadrion.stacksjs.com'

/**
 * Safe application cloud defaults.
 *
 * Set APP_DOMAIN and provider credentials before the first deploy. Use
 * `cloud.attachTo` only when this app is intentionally joining a server owned
 * by another ts-cloud project.
 */
export const tsCloud: TsCloudConfig = {
  project: {
    name: APP_SLUG,
    slug: APP_SLUG,
    region: 'us-east-1',
  },

  stateDir: 'storage/cloud',

  // Deploy to Hetzner Cloud, or set `provider: 'ssh'` to deploy to a Linux box
  // you already own over SSH (a Raspberry Pi, a NUC, an old laptop):
  //
  //   cloud: { provider: 'ssh' },
  //   ssh: { profile: 'raspberry-pi', hosts: [{ host: 'pi-stacks.local', user: 'pi' }] },
  //
  // See `buddy server:flash`, `server:first-boot`, `server:doctor` and
  // `server:setup` for getting a fresh board to that point.
  // A tenant on the shared stacks box, not a server of its own. Owns only
  // what `project.slug` names: /etc/rpx/sites.d/marioadrion.json, the
  // rpx-cert-renew-marioadrion units and /var/www/marioadrion-*.
  cloud: {
    provider: 'hetzner',
    attachTo: 'stacks',
  },

  mode: 'server',

  environments: {
    production: {
      type: 'production',
      deployBranch: 'main',
      region: 'us-east-1',
      variables: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
    },
  },

  infrastructure: {
    // The zone this host lives in. No `records`: the zone's mail, DKIM and
    // verification records belong to its owner, and reconciliation upserts
    // every declared record on every deploy.
    dns: {
      provider: 'cloudflare',
      domain: 'stacksjs.com',
    },

    compute: {
      instances: 1,
      size: 'small',
      disk: {
        size: 20,
        type: 'ssd',
        encrypted: true,
      },
      webServer: 'rpx',
      proxy: {
        engine: 'rpx',
        // This tenant's own certificate units, not the box's fallback cert.
        onDemandTls: true,

        // Served from Cloudflare's edge. Only the bare host: Universal SSL
        // covers one wildcard level (*.stacksjs.com), so www.marioadrion
        // would lose HTTPS if proxied. No origin-guard secret: the gateway
        // has one, and it belongs to the box's owner.
        cdn: {
          provider: 'cloudflare',
          frontedHosts: ['marioadrion.stacksjs.com'],
          cloudflare: {
            // Zone-wide, and this is a tenant, so only settings every other
            // site on stacksjs.com already satisfies. No HSTS.
            settings: {
              ssl: 'strict',
              alwaysUseHttps: true,
              minTlsVersion: '1.2',
              brotli: true,
              http3: true,
              emailObfuscation: false,
            },
            cache: {
              // Photos and fonts: stable URLs, content-addressed variants.
              assetEdgeTtl: 2592000,
              // Never the HTML. A cached page cannot carry the per-visitor
              // CSRF cookie, so the city form would 403 while looking fine,
              // and the tour list changes when Bandsintown does.
              documentEdgeTtl: 0,
            },
            purgeOnDeploy: true,
          },
        },
      },
    },
  },

  sites: {
    /**
     * The stx site. The database lives outside the atomic release
     * directories so a deploy never swaps it out from under the service, and
     * so does the migration differ's snapshot: inside a release it would be
     * rebuilt from nothing every deploy and re-propose finished migrations.
     */
    main: {
      root: '.',
      path: '/',
      domain: APP_DOMAIN,
      start: 'bun node_modules/@stacksjs/buddy/dist/serve-entry.js',
      // Picked from a live `ss -lntp` on the box: smakelo holds 3210/3218.
      port: 3230,
      preStart: [
        'bun install --frozen-lockfile',
        'mkdir -p /var/lib/marioadrion/db-snapshot',
        'bun node_modules/@stacksjs/buddy/dist/cli.js migrate',
      ],
      env: {
        HOST: '127.0.0.1',
        APP_ENV: 'production',
        NODE_ENV: 'production',
        APP_NAME: 'Mario Adrion',
        APP_URL: APP_DOMAIN,
        APP_KEY: env.APP_KEY || '',
        PORT_API: '3238',
        API_URL: 'http://127.0.0.1:3238',
        // Only the forms bundle: the city-request form posts to it. Naming a
        // bundle keeps auth, the dashboard and the storefront unmounted.
        STACKS_DEFAULT_ROUTES: 'forms',
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: '/var/lib/marioadrion/stacks.sqlite',
        DB_DATABASE_PATH: '/var/lib/marioadrion/stacks.sqlite',
        DB_SNAPSHOT_PATH: '/var/lib/marioadrion/db-snapshot',
      },
    },

    // People type it. A redirect, so one host stays canonical.
    wwwMain: {
      domain: 'www.marioadrion.stacksjs.com',
      redirect: 'https://marioadrion.stacksjs.com',
    },

    // The API (bun-router): forms, /tour.ics, robots, sitemap. No `domain`,
    // so the gateway never routes to it; it is reached only through the
    // site's same-origin proxy.
    api: {
      root: '.',
      start: 'bun node_modules/@stacksjs/actions/dist/serve/api.js',
      port: 3238,
      preStart: ['bun install --frozen-lockfile'],
      env: {
        HOST: '127.0.0.1',
        APP_ENV: 'production',
        NODE_ENV: 'production',
        APP_NAME: 'Mario Adrion',
        APP_URL: APP_DOMAIN,
        APP_KEY: env.APP_KEY || '',
        STACKS_DEFAULT_ROUTES: 'forms',
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: '/var/lib/marioadrion/stacks.sqlite',
        DB_DATABASE_PATH: '/var/lib/marioadrion/stacks.sqlite',
      },
    },
  },
}

const config: CloudConfig = {}

export default config
