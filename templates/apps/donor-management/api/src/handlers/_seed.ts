/**
 * donor-management — per-user demo seeding.
 *
 * On the first authenticated request from a new user this module checks
 * whether the user has any donors yet. If not, it seeds a realistic
 * nonprofit snapshot: an address book of donors (individuals + one
 * organization, tagged monthly/major/volunteer/board/lapsed), three
 * campaigns (an active year-end appeal, a completed spring gala, an
 * ongoing monthly-sustainers fund), two years of gifts across methods
 * and funds, one already-issued tax receipt for the previous year, and
 * a few donor notes.
 *
 * Gift dates mix FIXED calendar dates (so the dashboard's year-to-date
 * and the receipt year buckets are stable whatever day the seed runs)
 * with a couple of relative recent dates (so "recent gifts" looks live).
 *
 * All money is integer cents. Every row is owned by the caller's user id.
 *
 * The seed is gated on count(donors). Once a user has donors, subsequent
 * calls are a no-op. Concurrent calls are guarded with an in-memory
 * in-flight map to avoid double-seeding when a fresh signup hits
 * multiple endpoints simultaneously.
 *
 * @module
 */

import { count, create, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seedingInFlight = new Map<string, Promise<void>>()

const unwrap = (result: unknown): Record<string, unknown> => {
  const r = result as { data?: Record<string, unknown> } | Record<string, unknown>
  return ('data' in r && r.data ? r.data : r) as Record<string, unknown>
}

const nowIso = (): string => new Date().toISOString()
const daysAgo = (d: number): string =>
  new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

/** Seed a freshly signed-up user with realistic demo content. */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (!userId) return
  const existing = seedingInFlight.get(userId)
  if (existing) return existing
  const p = doSeed(userId).finally(() => {
    seedingInFlight.delete(userId)
  })
  seedingInFlight.set(userId, p)
  return p
}

async function doSeed(userId: string): Promise<void> {
  try {
    const existing = await count('donors', [{ field: 'owner_id', operator: '=', value: userId }])
    if (existing > 0) return

    const thisYear = new Date().getFullYear()
    const lastYear = thisYear - 1
    const now = nowIso()

    // ---- donors ----
    const donor = async (
      name: string,
      email: string | null,
      phone: string | null,
      address: string | null,
      isOrganization: boolean,
      tags: string[],
    ): Promise<Record<string, unknown>> =>
      unwrap(
        // `unwrap` reads `result.data` — it needs the SETTLED row, so the
        // create must be awaited here. Without the await it receives the
        // Promise itself, every later `String(donorRow.id)` becomes
        // "undefined", and the first gift insert dies with
        // `invalid input syntax for type uuid: "undefined"` — silently
        // seeding zero gifts (caught + logged by doSeed's try/catch).
        await create('donors', {
          owner_id: userId,
          name,
          email,
          phone,
          address,
          is_organization: isOrganization,
          tags,
          created_at: now,
          updated_at: now,
        }),
      )

    const margaret = await donor(
      'Margaret Osei',
      'margaret.osei@example.com',
      '+1-206-555-0134',
      '4120 Holly Lane, Seattle, WA 98103',
      false,
      ['major-donor', 'monthly-donor'],
    )
    const daniel = await donor(
      'Daniel Reyes',
      'daniel.reyes@example.com',
      '+1-312-555-0177',
      '88 Harbor Street Apt 3, Chicago, IL 60601',
      false,
      ['monthly-donor'],
    )
    const aisha = await donor(
      'Aisha Bello',
      'aisha.bello@example.com',
      '+1-718-555-0122',
      '620 Quincy Street, Brooklyn, NY 11221',
      false,
      ['volunteer', 'monthly-donor'],
    )
    const helen = await donor(
      'Helen Larsen',
      'helen.larsen@example.com',
      null,
      '19 Birchwood Court, Portland, OR 97202',
      false,
      ['lapsed'],
    )
    const peter = await donor(
      'Peter Kowalski',
      'peter.kowalski@example.com',
      '+1-614-555-0189',
      '77 Sycamore Road, Columbus, OH 43214',
      false,
      ['board-member'],
    )
    const sofia = await donor(
      'Sofia Márquez',
      'sofia.marquez@example.com',
      null,
      '310 Alameda de las Pulgas, San Mateo, CA 94403',
      false,
      ['new'],
    )
    const riversideFund = await donor(
      'Riverside Family Fund',
      'grants@riversidefund.example.org',
      '+1-503-555-0110',
      '1 Foundation Way, Suite 200, Portland, OR 97204',
      true,
      ['major-donor'],
    )
    const grace = await donor('Grace Nakamura', 'grace.nakamura@example.com', null, null, false, [
      'volunteer',
    ])

    // ---- campaigns ----
    const campaign = async (
      name: string,
      description: string,
      goalCents: number,
      startsOn: string,
      endsOn: string | null,
      status: string,
    ): Promise<Record<string, unknown>> =>
      unwrap(
        // Awaited for the same reason as the donor helper above — a Promise
        // passed through `unwrap` makes `String(campaignRow.id)` become
        // "undefined" in every gift that references this campaign.
        await create('campaigns', {
          owner_id: userId,
          name,
          description,
          goal_cents: goalCents,
          starts_on: startsOn,
          ends_on: endsOn,
          status,
          created_at: now,
          updated_at: now,
        }),
      )

    const yearEnd = await campaign(
      'Year-End Appeal',
      'Annual year-end giving drive across mail, email and social.',
      5_000_000,
      `${thisYear}-10-01`,
      `${thisYear}-12-31`,
      'active',
    )
    const gala = await campaign(
      'Spring Gala',
      'Evening fundraiser with dinner, auction and program.',
      2_500_000,
      `${lastYear}-03-01`,
      `${lastYear}-05-31`,
      'completed',
    )
    const sustainers = await campaign(
      'Monthly Sustainers',
      'Recurring monthly giving program — steady support for general operations.',
      1_800_000,
      `${lastYear}-01-01`,
      null,
      'active',
    )

    // ---- gifts ----
    const gift = async (
      donorRow: Record<string, unknown>,
      amountCents: number,
      date: string,
      method: string,
      fund: string,
      campaignRow: Record<string, unknown> | null,
      note = '',
    ): Promise<Record<string, unknown>> =>
      unwrap(
        // Awaited for the same reason as the donor helper above — `unwrap`
        // must see the settled row, and `String(donorRow.id)` must read a
        // real uuid, not `undefined`.
        await create('gifts', {
          owner_id: userId,
          donor_id: String(donorRow.id),
          amount_cents: amountCents,
          gift_date: date,
          method,
          fund,
          campaign_id: campaignRow ? String(campaignRow.id) : null,
          receipt_id: null,
          note,
          created_at: now,
          updated_at: now,
        }),
      )

    // Margaret — major donor: big year-end checks both years + a gala table.
    // Her last-year gifts stay UNreceipted so the generate flow has material
    // on the Receipts page from day one.
    await gift(
      margaret,
      250_000,
      `${lastYear}-02-14`,
      'check',
      'general',
      null,
      'Gala table sponsorship',
    )
    await gift(margaret, 500_000, `${lastYear}-11-30`, 'check', 'capital', yearEnd)
    await gift(margaret, 750_000, `${thisYear}-11-18`, 'check', 'capital', yearEnd)
    await gift(margaret, 25_000, daysAgo(9), 'ach', 'general', sustainers)

    // Daniel — monthly sustainer, card on file.
    for (const m of ['01', '03', '05', '07', '09']) {
      await gift(daniel, 5_000, `${thisYear}-${m}-02`, 'card', 'general', sustainers)
    }
    for (const m of ['04', '08', '11']) {
      await gift(daniel, 5_000, `${lastYear}-${m}-02`, 'card', 'general', sustainers)
    }

    // Aisha — volunteer who also gives, cash at events.
    await gift(aisha, 12_000, `${lastYear}-04-22`, 'cash', 'programs', gala)
    await gift(aisha, 15_000, `${thisYear}-06-14`, 'cash', 'programs', null)
    await gift(aisha, 10_000, daysAgo(4), 'card', 'general', sustainers)

    // Helen — lapsed: gave last year, nothing since.
    const helenLastYear = [
      await gift(helen, 7_500, `${lastYear}-05-19`, 'check', 'general', null),
      await gift(helen, 10_000, `${lastYear}-12-03`, 'check', 'general', yearEnd),
    ]

    // Peter — board member, steady mid-size gifts.
    await gift(peter, 50_000, `${lastYear}-09-10`, 'ach', 'general', null)
    await gift(peter, 60_000, `${thisYear}-02-27`, 'ach', 'general', null)
    await gift(peter, 100_000, `${thisYear}-11-05`, 'check', 'endowment', null)

    // Sofia — brand-new donor, first gift this year via the appeal.
    await gift(sofia, 35_000, `${thisYear}-10-29`, 'card', 'general', yearEnd)

    // Riverside Family Fund — grant-maker, annual grant.
    await gift(
      riversideFund,
      1_000_000,
      `${lastYear}-06-30`,
      'check',
      'programs',
      null,
      'Annual community grant',
    )
    await gift(
      riversideFund,
      1_000_000,
      `${thisYear}-06-30`,
      'check',
      'programs',
      null,
      'Annual community grant',
    )

    // Grace — volunteer, small cash gift.
    await gift(grace, 2_500, `${thisYear}-08-11`, 'cash', 'general', null)

    // ---- a receipt for Helen's complete last year (signature flow, seeded) ----
    const helenTotal = helenLastYear.reduce((sum, g) => sum + Number(g.amount_cents ?? 0), 0)
    const helenReceipt = unwrap(
      await create('receipts', {
        owner_id: userId,
        donor_id: String(helen.id),
        year: lastYear,
        receipt_number: `${lastYear}-00001`,
        total_cents: helenTotal,
        issued_at: `${lastYear}-12-31T18:00:00.000Z`,
        created_at: now,
        updated_at: now,
      }),
    )
    for (const g of helenLastYear) {
      await create('receipt_items', {
        receipt_id: String(helenReceipt.id),
        gift_id: String(g.id),
        amount_cents: Number(g.amount_cents ?? 0),
        created_at: now,
      })
      await updateById('gifts', String(g.id), { receipt_id: String(helenReceipt.id) })
    }

    // ---- notes ----
    const note = (donorRow: Record<string, unknown>, body: string): Promise<unknown> =>
      create('notes', {
        owner_id: userId,
        donor_id: String(donorRow.id),
        author: 'Development Officer',
        body,
        created_at: now,
      })

    await note(
      margaret,
      'Prefers a phone call in November before the year-end ask. Interested in the capital project.',
    )
    await note(
      daniel,
      'Card on file expires in March — send a reminder email before the failed-payment window.',
    )
    await note(
      aisha,
      'Volunteers at every spring event; always asks for a receipt for tax purposes.',
    )
    await note(
      helen,
      'Lapsed since last December. Add to the reactivation segment for the spring appeal.',
    )
    await note(
      riversideFund,
      'Grant renewal decision is each June; the program report is due two weeks before.',
    )
  } catch (err) {
    // Forensic, not blocking: a failed seed must never break the page that
    // triggered it.
    logger.warn('[donor-management] seedDemoForUser failed', err)
  }
}
