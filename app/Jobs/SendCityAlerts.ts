import type { Run } from '../../resources/data/shows'
import { buildListUnsubscribeHeaders, buildUnsubscribeUrl, mail, template } from '@stacksjs/email'
import { log } from '@stacksjs/logging'
import { Job } from '@stacksjs/queue'
import CityAlert from '../Models/CityAlert'
import { alertKey, alertsDue } from '../../resources/data/alerts'
import { loadCityRequests } from '../../resources/data/city-requests'
import { citiesOf, tour } from '../../resources/data/shows'
import { absolute, artist } from '../../resources/data/site'

/**
 * Tell everyone who asked for a city when Mario is booked there.
 *
 * Hourly. Each run in a matching place is announced to a person once, keyed
 * in `city_alerts`; opt-outs live in the framework's `email_suppressions`,
 * which `mail.send()` checks before sending anything.
 */
export default new Job({
  name: 'SendCityAlerts',
  description: 'Email fans when Mario is booked in a city they asked for',
  tries: 1,
  handle: () => sendCityAlerts(),
})

const escape = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

function showRows(runs: Run[]): string {
  return runs.flatMap(run => run.shows.filter(show => !show.soldOut).map(show => `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #2c2b27;">
        <p style="margin: 0; color: #f3f1ea; font-size: 16px; font-weight: 600;">${escape(`${show.weekday} ${show.month} ${show.day}, ${show.time}`)}</p>
        <p style="margin: 2px 0 0; color: #a8a49a; font-size: 14px;">${escape(`${run.venue.name}, ${run.place}`)}</p>
      </td>
      <td style="padding: 14px 0; border-bottom: 1px solid #2c2b27; text-align: right; white-space: nowrap;">
        <a href="${escape(show.ticketUrl)}" style="color: #f5c542; font-size: 15px; font-weight: 700; text-decoration: none;">Tickets</a>
      </td>
    </tr>`)).join('')
}

export async function sendCityAlerts(): Promise<{ sent: number, skipped: number }> {
  const [upcoming, requests, recorded] = await Promise.all([
    tour(),
    loadCityRequests(),
    CityAlert.all(),
  ])

  const sentKeys = new Set(recorded.map(row => alertKey(String(row.email), { key: String(row.run_key) } as Run)))
  const due = alertsDue(requests, citiesOf(upcoming), sentKeys)

  let sent = 0
  let skipped = 0

  for (const alert of due) {
    const subject = `${artist.name} is coming to ${alert.city.place}`
    const { html, text } = await template('city-alert', {
      variables: {
        place: alert.city.place,
        showRows: showRows(alert.runs),
        cityUrl: absolute(`/tour/${alert.city.slug}`),
        unsubscribeUrl: buildUnsubscribeUrl(alert.email, 365 * 24 * 3600, { baseUrl: absolute('') }),
      },
      subject,
    })

    let result: { success?: boolean, message?: string } | undefined
    try {
      result = await mail.send({
        to: [alert.email],
        subject,
        html,
        text,
        headers: buildListUnsubscribeHeaders(alert.email, 365 * 24 * 3600, { baseUrl: absolute('') }),
      })
    }
    catch (error) {
      result = { success: false, message: error instanceof Error ? error.message : String(error) }
    }

    // A suppressed address comes back unsent, not thrown. Record it anyway:
    // they asked not to hear, so there is nothing to retry next hour.
    const delivered = result?.success !== false
    const suppressed = typeof result?.message === 'string' && result.message.startsWith('suppressed:')
    if (!delivered && !suppressed) {
      skipped++
      log.warn(`[city-alerts] ${alert.city.slug}: send failed (${result?.message ?? 'no reason given'}), will retry`)
      continue
    }

    for (const run of alert.runs)
      await CityAlert.create({ email: alert.email, run_key: run.key, city_slug: alert.city.slug })

    if (delivered)
      sent++
    else
      skipped++
  }

  if (due.length > 0)
    log.info(`[city-alerts] ${sent} sent, ${skipped} skipped, of ${due.length} due`)

  return { sent, skipped }
}
