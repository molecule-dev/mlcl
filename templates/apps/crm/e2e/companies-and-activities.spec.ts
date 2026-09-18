import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  seedActivity,
  seedCompany,
  seedContact,
  signup,
} from './_helpers.js'

test.describe('crm: companies', () => {
  test('seeded company appears in /api/companies and via the companies list', async ({ page }) => {
    const session = await signup(page)
    await seedCompany(page, session.accessToken, { name: 'Globex Inc.' })
    const list = await page.request.get(`${API_BASE}/companies`, {
      headers: authHeaders(session.accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as { name: string }[]
    expect(rows.some((r) => r.name === 'Globex Inc.')).toBe(true)
  })

  test("IDOR: cannot read another user's company", async ({ page }) => {
    const userA = await signup(page)
    const companyA = await seedCompany(page, userA.accessToken, { name: 'Hidden Co' })
    await page.evaluate(() => window.localStorage.clear())
    const userB = await signup(page)
    const res = await page.request.get(`${API_BASE}/companies/${companyA.id}`, {
      headers: authHeaders(userB.accessToken),
    })
    expect(res.status()).toBe(404)
  })
})

test.describe('crm: activities', () => {
  test('activity tied to a contact + deal round-trips through GET /activities', async ({
    page,
  }) => {
    const session = await signup(page)
    const contact = await seedContact(page, session.accessToken)
    const activity = await seedActivity(page, session.accessToken, {
      type: 'meeting',
      subject: 'Discovery call',
      contact_id: contact.id,
    })
    expect(activity.subject).toBe('Discovery call')
    const list = await page.request.get(`${API_BASE}/activities`, {
      headers: authHeaders(session.accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as { id: string; subject: string }[]
    expect(rows.find((r) => r.id === activity.id)).toBeTruthy()
  })

  test('activity is owner-scoped and never leaks to another user', async ({ page }) => {
    const userA = await signup(page)
    await seedActivity(page, userA.accessToken, { subject: 'A-only' })
    await page.evaluate(() => window.localStorage.clear())
    const userB = await signup(page)
    const list = await page.request.get(`${API_BASE}/activities`, {
      headers: authHeaders(userB.accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as { subject: string }[]
    expect(rows.find((r) => r.subject === 'A-only')).toBeFalsy()
  })
})
