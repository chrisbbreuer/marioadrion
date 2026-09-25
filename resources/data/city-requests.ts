/**
 * "Tell me where to perform": the one question the old site asked and never
 * collected. The button there was a dead end; here it is a @stacksjs/forms
 * form, so answers land in `form_submissions` with the framework's honeypot,
 * minimum-fill-time and rate limit in front of them, and export as CSV.
 *
 * The form is provisioned from this definition rather than by hand.
 * `createForm` is idempotent on the handle, so the first render on a fresh
 * database creates it and every later one just reads it back.
 */

import type { CreateFormInput } from '@stacksjs/forms'
import type { CityRequest } from './alerts'
import { createForm, fetchSubmissions, loadFormByHandle } from '@stacksjs/forms'

export const CITY_REQUEST_HANDLE = 'where-to-perform'

export const cityRequestDefinition: CreateFormInput = {
  handle: CITY_REQUEST_HANDLE,
  name: 'Tell me where to perform',
  status: 'active',
  settings: {
    submitLabel: 'Send it',
    confirmation: { type: 'message', value: 'Thanks. Your city is on the list.' },
  },
  fields: [
    { name: 'city', label: 'City', type: 'text', required: true, width: 'half', options: { placeholder: 'Munich' } },
    { name: 'region', label: 'State or country', type: 'text', required: false, width: 'half', options: { placeholder: 'Germany' } },
    { name: 'email', label: 'Email, if you want to hear when tickets go on sale', type: 'email', required: false },
  ],
}

let uuid: string | null = null

/** The public uuid the page posts to, provisioning the form the first time. */
export async function cityRequestFormUuid(): Promise<string | null> {
  if (uuid)
    return uuid

  try {
    const existing = await loadFormByHandle(null, CITY_REQUEST_HANDLE)
    uuid = existing?.uuid ?? (await createForm(null, cityRequestDefinition)).uuid
    return uuid
  }
  catch (error) {
    // A database that is not migrated yet should cost the form, not the page.
    console.warn(`[city-requests] ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/** A request as the alert and digest jobs read it, with when it arrived. */
export interface StoredCityRequest extends CityRequest {
  submittedAt: string | null
}

/**
 * Every request ever left, oldest first, or nothing when the form has not
 * been provisioned yet. Read in pages because `fetchSubmissions` is the admin
 * list and pages itself.
 */
export async function loadCityRequests(): Promise<StoredCityRequest[]> {
  const form = await loadFormByHandle(null, CITY_REQUEST_HANDLE)
  if (!form)
    return []

  const requests: StoredCityRequest[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchSubmissions(form.id, { limit: pageSize, offset })
    for (const row of page) {
      requests.push({
        city: String(row.values.city ?? ''),
        region: String(row.values.region ?? ''),
        email: row.email ?? (typeof row.values.email === 'string' ? row.values.email : null),
        submittedAt: row.submittedAt,
      })
    }
    if (page.length < pageSize)
      break
  }

  return requests.reverse()
}
