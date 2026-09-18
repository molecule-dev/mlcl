import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authHeaders, API_BASE, seedCompany, seedDeal, signup } from './_helpers.js'

test.describe('crm: deals', () => {
  test('deals page renders for a fresh account without showing hardcoded $1M pipeline', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    // Pre-existing hardcoded baseline data must be gone.
    await expect(page.getByText('$1,060,000')).toHaveCount(0)
    await expect(page.getByText('Cloud Infrastructure Upgrade')).toHaveCount(0)
  })

  test('seeded deals show up in /api/deals and on the page', async ({ page }) => {
    const session = await signup(page)
    const company = await seedCompany(page, session.accessToken, { name: 'Acme Co' })
    const deal = await seedDeal(page, session.accessToken, {
      title: 'Q3 Acme Renewal',
      value: 50_000,
      stage: 'qualified',
      company_id: company.id,
    })
    expect(deal.title).toBe('Q3 Acme Renewal')
    const list = await page.request.get(`${API_BASE}/deals`, {
      headers: authHeaders(session.accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as { title: string; stage: string; value: string }[]
    const found = rows.find((r) => r.title === 'Q3 Acme Renewal')
    expect(found).toBeTruthy()
    expect(Number(found!.value)).toBe(50_000)
  })

  test('pipeline stats reflect open + won deals owned by the user', async ({ page }) => {
    const session = await signup(page)
    await seedDeal(page, session.accessToken, { value: 10_000, stage: 'qualified' })
    await seedDeal(page, session.accessToken, { value: 25_000, stage: 'negotiation' })
    await seedDeal(page, session.accessToken, { value: 40_000, stage: 'closed_won' })
    const stats = await page.request.get(`${API_BASE}/pipeline/stats`, {
      headers: authHeaders(session.accessToken),
    })
    expect(stats.status()).toBe(200)
    const body = (await stats.json()) as {
      total_open: number
      total_value: number
      won_count: number
      won_value: number
    }
    expect(body.total_open).toBe(2)
    expect(body.total_value).toBe(35_000)
    expect(body.won_count).toBe(1)
    expect(body.won_value).toBe(40_000)
  })

  test('PATCH /deals/:id can advance a deal stage without zeroing other fields', async ({
    page,
  }) => {
    const session = await signup(page)
    const deal = await seedDeal(page, session.accessToken, {
      title: 'Stage Move',
      value: 12_345,
      stage: 'lead',
      probability: 25,
    })
    const patch = await page.request.patch(`${API_BASE}/deals/${deal.id}`, {
      headers: authHeaders(session.accessToken),
      data: { stage: 'closed_won' },
    })
    expect(patch.status()).toBe(200)
    const updated = (await patch.json()) as { stage: string; value: string; probability: string }
    expect(updated.stage).toBe('closed_won')
    expect(Number(updated.value)).toBe(12_345)
    expect(Number(updated.probability)).toBe(25)
  })

  test("IDOR: cannot read or update another user's deal", async ({ page }) => {
    const userA = await signup(page)
    const dealA = await seedDeal(page, userA.accessToken, { title: 'Private Deal' })
    await page.evaluate(() => window.localStorage.clear())
    const userB = await signup(page)
    const get = await page.request.get(`${API_BASE}/deals/${dealA.id}`, {
      headers: authHeaders(userB.accessToken),
    })
    expect(get.status()).toBe(404)
    const patch = await page.request.patch(`${API_BASE}/deals/${dealA.id}`, {
      headers: authHeaders(userB.accessToken),
      data: { stage: 'closed_lost' },
    })
    expect(patch.status()).toBe(404)
  })
})
