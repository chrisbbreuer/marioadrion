import process from 'node:process'
import { schedule } from '@stacksjs/scheduler'

/**
 * **Scheduler**
 *
 * Define your scheduled tasks here. Jobs, actions, and shell commands
 * can all be scheduled with a fluent, expressive API.
 *
 * @see https://docs.stacksjs.com/scheduling
 */
export default function (): void {
  // Fans who asked for a city hear when Mario is booked there. Hourly: new
  // dates reach Bandsintown first and this site within FRESH_SECONDS.
  schedule.job('SendCityAlerts').hourly()

  // Where fans want him, for management. Inert until CITY_DIGEST_TO is set.
  schedule.job('SendCityDigest').onDays([1]).at('09:00').setTimeZone('America/Los_Angeles')

  // Run the Inspire job every hour. An example, so it ships commented out
  // like the others: live, it put an always-on scheduler daemon on every
  // deploy of every new app, and `buddy new --minimal` (which removes
  // app/Jobs) left it naming a job that no longer exists.
  // schedule.job('Inspire').hourly().setTimeZone('America/Los_Angeles')

  // Run a custom action every five minutes
  // schedule.action('CleanupTempFiles').everyFiveMinutes()

  // Run a shell command daily at midnight
  // schedule.command('echo "Daily maintenance complete"').daily()
}

process.on('SIGINT', () => {
  schedule.gracefulShutdown().then(() => process.exit(0))
})
