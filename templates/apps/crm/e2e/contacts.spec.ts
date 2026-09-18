import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authHeaders, API_BASE, seedContact, signup } from './_helpers.js'

test.describe('crm: contacts', () => {
  test('list page renders empty-state for a brand-new account, not stale mock rows', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contacts')
    await expect(page.locator('[data-mol-id="contacts-empty"]')).toBeVisible()
    // Hardcoded mock rows from the prior baseline must be gone.
    await expect(page.getByText('Sarah Jenkins')).toHaveCount(0)
    await expect(page.getByText('Marcus Blackwell')).toHaveCount(0)
  })

  test('create-contact form posts to /api/contacts and persists the new row', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/contacts')
    await page.locator('[data-mol-id="contacts-create-toggle"]').click()
    const stamp = Date.now()
    await page.locator('[data-mol-id="contact-firstName"]').fill('Grace')
    await page.locator('[data-mol-id="contact-lastName"]').fill('Hopper')
    await page.locator('[data-mol-id="contact-email"]').fill(`grace+${stamp}@example.com`)
    await page.locator('[data-mol-id="contact-title"]').fill('Rear Admiral')
    await page.locator('[data-mol-id="contact-create-submit"]').click()
    await expect(page.getByText('Grace Hopper')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/contacts`, {
      headers: authHeaders(session.accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as { first_name: string; last_name: string }[]
    expect(rows.find((r) => r.first_name === 'Grace' && r.last_name === 'Hopper')).toBeTruthy()
  })

  test('seeded contacts render in the list with correct fields', async ({ page }) => {
    const session = await signup(page)
    await seedContact(page, session.accessToken, {
      first_name: 'Alan',
      last_name: 'Turing',
      email: `alan+${Date.now()}@example.com`,
      title: 'Codebreaker',
      source: 'referral',
    })
    await page.goto(APP_BASE + '/contacts')
    await expect(page.getByText('Alan Turing')).toBeVisible()
    await expect(page.getByText('Codebreaker')).toBeVisible()
  })

  test('search input narrows the list', async ({ page }) => {
    const session = await signup(page)
    await seedContact(page, session.accessToken, {
      first_name: 'Niner',
      last_name: 'Spruance',
      email: `niner+${Date.now()}@example.com`,
    })
    await seedContact(page, session.accessToken, {
      first_name: 'Halsey',
      last_name: 'Bull',
      email: `halsey+${Date.now()}@example.com`,
    })
    await page.goto(APP_BASE + '/contacts')
    await page.locator('[data-mol-id="contacts-search"]').fill('Niner')
    await expect(page.getByText('Niner Spruance')).toBeVisible()
    await expect(page.getByText('Halsey Bull')).toHaveCount(0)
  })

  test('delete contact removes it from the list', async ({ page }) => {
    const session = await signup(page)
    const contact = await seedContact(page, session.accessToken, {
      first_name: 'Doomed',
      last_name: 'Lead',
      email: `doomed+${Date.now()}@example.com`,
    })
    await page.goto(APP_BASE + '/contacts')
    page.on('dialog', (d) => d.accept())
    await page.locator(`tr[data-contact-id="${contact.id}"] [data-mol-id="contact-delete"]`).click()
    await expect(page.getByText('Doomed Lead')).toHaveCount(0)
  })

  test("IDOR: cannot read another user's contact via /api/contacts/:id", async ({ page }) => {
    const userA = await signup(page)
    const contactA = await seedContact(page, userA.accessToken, {
      first_name: 'PrivateA',
      last_name: 'Owner',
      email: `pa+${Date.now()}@example.com`,
    })
    await page.evaluate(() => window.localStorage.clear())
    const userB = await signup(page)
    const res = await page.request.get(`${API_BASE}/contacts/${contactA.id}`, {
      headers: authHeaders(userB.accessToken),
    })
    expect(res.status()).toBe(404)
  })
})
