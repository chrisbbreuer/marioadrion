import { env } from '@stacksjs/env'
import { mail, template } from '@stacksjs/email'
import { exportSubmissionsCsv, loadFormByHandle } from '@stacksjs/forms'
import { log } from '@stacksjs/logging'
import { Job } from '@stacksjs/queue'
import CityAlert from '../Models/CityAlert'
import { requestTally } from '../../resources/data/alerts'
import { CITY_REQUEST_HANDLE, loadCityRequests } from '../../resources/data/city-requests'

/**
 * Monday morning: where fans asked Mario to play, for whoever books him.
 *
 * Off until `CITY_DIGEST_TO` names someone (comma-separated for more than
 * one). Nobody should start receiving a weekly email because a site shipped.
 */
export default new Job({
  name: 'SendCityDigest',
  description: 'Weekly summary of city requests for management',
  tries: 1,
  handle: () => sendCityDigest(),
})

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const escape = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

function rows(tally: ReturnType<typeof requestTally>, limit: number): string {
  return tally.slice(0, limit).map(entry => `
    <tr>
      <td style="padding: 8px 0; border-top: 1px solid #ecebe6; font-size: 15px;">${escape(entry.place)}</td>
      <td style="padding: 8px 0; border-top: 1px solid #ecebe6; font-size: 15px; text-align: right; white-space: nowrap;">${entry.count} ${entry.count === 1 ? 'request' : 'requests'}${entry.emails ? `, ${entry.emails} with email` : ''}</td>
    </tr>`).join('')
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

function summaryOf(week: number, total: number, emails: number, alerts: number): string {
  return `${count(week, 'new request', 'new requests')} this week, ${total} in total. `
    + `${count(emails, 'person has', 'people have')} left an email for ticket news, `
    + `and ${count(alerts, 'show announcement', 'show announcements')} went out to them this week.`
}

export async function sendCityDigest(now = Date.now()): Promise<boolean> {
  const recipients = String(env.CITY_DIGEST_TO ?? '').split(',').map(address => address.trim()).filter(Boolean)
  if (recipients.length === 0) {
    log.debug('[city-digest] CITY_DIGEST_TO is not set; no digest sent')
    return false
  }

  const [requests, alerts, form] = await Promise.all([
    loadCityRequests(),
    CityAlert.all(),
    loadFormByHandle(null, CITY_REQUEST_HANDLE),
  ])
  if (!form)
    return false

  const since = now - WEEK_MS
  const thisWeek = requests.filter(request => request.submittedAt && Date.parse(request.submittedAt) >= since)
  const alertsThisWeek = alerts.filter(row => Date.parse(String(row.created_at)) >= since).length

  const subject = thisWeek.length
    ? `${thisWeek.length} new city ${thisWeek.length === 1 ? 'request' : 'requests'} for Mario this week`
    : 'City requests for Mario: this week'
  const { html, text } = await template('city-digest', {
    variables: {
      weekRows: rows(requestTally(thisWeek), 15),
      allRows: rows(requestTally(requests), 25),
      summary: summaryOf(thisWeek.length, requests.length, new Set(requests.map(request => request.email?.trim().toLowerCase()).filter(Boolean)).size, alertsThisWeek),
    },
    subject,
  })

  await mail.send({
    to: recipients,
    subject,
    html,
    text,
    attachments: [{ filename: 'city-requests.csv', content: await exportSubmissionsCsv(form), contentType: 'text/csv' }],
  })

  return true
}
