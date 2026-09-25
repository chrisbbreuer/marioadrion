import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * One run announced to one person: the record that keeps a "Mario is coming
 * to Phoenix" email from going out twice.
 *
 * Keyed by email and Bandsintown run, not by form submission, so someone who
 * asked for the same city twice still hears about it once. Opt-outs are not
 * kept here: the framework's `email_suppressions` list is checked by
 * `mail.send()` itself, and the signed unsubscribe link writes to it.
 */
export default defineModel({
  name: 'CityAlert',
  table: 'city_alerts',
  primaryKey: 'id',
  autoIncrement: true,
  // Written by the scheduler, not on behalf of a signed-in user.
  ownership: false,

  traits: {
    useTimestamps: true,
  },

  indexes: [
    { name: 'city_alerts_email_run_unique', columns: ['email', 'run_key'], unique: true },
  ],

  attributes: {
    email: {
      required: true,
      order: 1,
      fillable: true,
      validation: { rule: schema.string().email().max(255) },
      factory: faker => faker.internet.email(),
    },
    run_key: {
      required: true,
      order: 2,
      fillable: true,
      validation: { rule: schema.string().max(64) },
      factory: faker => String(faker.number.int({ min: 1_000_000, max: 9_999_999 })),
    },
    city_slug: {
      required: true,
      order: 3,
      fillable: true,
      validation: { rule: schema.string().max(120) },
      factory: () => 'phoenix-az',
    },
  },
})
