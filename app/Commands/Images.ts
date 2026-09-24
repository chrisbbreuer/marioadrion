import type { PhotoManifestEntry } from '../../resources/data/photos'
import { readdirSync, rmSync } from 'node:fs'
import process from 'node:process'
import { defineCommand, log } from '@stacksjs/cli'
import { image } from '@stacksjs/image'
import { ExitCode } from '@stacksjs/types'
import { photos } from '../../resources/data/photos'

const OUTPUT_DIR = 'public/images/mario'
const PUBLIC_PATH = '/images/mario'
const MANIFEST = 'resources/data/photos.manifest.json'

/**
 * `buddy images:build` - every photo in resources/data/photos.ts through the
 * @stacksjs/image pipeline. Variants are content-addressed, so a rerun only
 * encodes what changed.
 */
export default defineCommand((cli) => {
  cli
    .command('images:build', 'Build the responsive photo variants and their manifest')
    .action(async () => {
      const root = process.cwd()
      const manifest: Record<string, PhotoManifestEntry> = {}

      for (const [name, photo] of Object.entries(photos)) {
        const started = performance.now()
        const build = () => image(photo.source, { root, outputDir: `${root}/${OUTPUT_DIR}`, publicPath: PUBLIC_PATH })

        const responsive = await build().widths(photo.widths).formats(['webp']).quality(80).generate()
        const fallback = await build().widths([photo.fallbackWidth]).formats([photo.fallback]).quality(80).generate()

        // The builder always adds the source width as a variant; keep only the
        // widths this photo asked for.
        const wanted = new Set(photo.widths)
        const webp = responsive.variants.filter(variant => wanted.has(variant.width))
        const small = fallback.variants.find(variant => variant.width === photo.fallbackWidth) ?? fallback.variants[0]!

        manifest[name] = {
          width: responsive.source.width,
          height: responsive.source.height,
          srcset: webp.map(variant => `${variant.url} ${variant.width}w`).join(', '),
          fallback: small.url,
          placeholder: responsive.placeholder,
        }

        const bytes = webp.map(variant => `${variant.width}w ${Math.round(variant.bytes / 1024)}KB`).join(', ')
        log.info(`${name}: ${bytes}; ${photo.fallback} ${Math.round(small.bytes / 1024)}KB (${Math.round(performance.now() - started)}ms)`)
      }

      // Variants are content-addressed, so an edited photo or a dropped width
      // leaves its old files behind. Anything the manifest does not point at
      // is one of those.
      const referenced = new Set(Object.values(manifest).flatMap(entry => [
        entry.fallback,
        ...entry.srcset.split(', ').map(candidate => candidate.split(' ')[0]),
      ]).map(url => url!.split('/').pop()))
      for (const file of readdirSync(`${root}/${OUTPUT_DIR}`)) {
        if (!referenced.has(file))
          rmSync(`${root}/${OUTPUT_DIR}/${file}`)
      }

      await Bun.write(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
      log.success(`Wrote ${MANIFEST}`)
      // Every log level yields before it prints; drain them or the last lines
      // are lost to the exit.
      await log.flush()
      process.exit(ExitCode.Success)
    })
})
