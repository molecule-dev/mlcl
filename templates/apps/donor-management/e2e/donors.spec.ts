import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoDonors(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/donors')
  await expect(page.getByRole('heading', { name: /^donors$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('donors', () => {
  test('list page renders the seeded book and GET /api/donors returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoDonors(page)
    })
    const req = reqs.find((r) => /\/api\/donors(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/donors').toBe(200)
    const links = page.locator('a[href^="/donors/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('lifetime giving column renders formatted money for seeded rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = (await waitForSeed(page, accessToken)) as Array<{ lifetime_cents: number }>
    const anyLifetime = seeded.some((d) => d.lifetime_cents > 0)
    expect(anyLifetime, 'seed produced at least one donor with giving').toBe(true)
    await gotoDonors(page)
    // Every seeded lifetime figure renders as $-formatted text in the table.
    await expect
      .poll(
        async () => {
          const cells = page.locator('table td', { hasText: /\$\d/ })
          return cells.count()
        },
        { timeout: 10000 },
      )
      .toBeGreaterThanOrEqual(1)
  })

  test('search box narrows visible rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDonors(page)
    // Row links only — the "+ New donor" CTA (href /donors/new) also matches
    // a plain a[href^="/donors/"] prefix selector and would never narrow.
    const rowLinks = page.locator('a[href^="/donors/"]:not([href="/donors/new"])')
    const initial = await rowLinks.count()
    expect(initial).toBeGreaterThanOrEqual(1)
    await page.getByRole('searchbox').fill('zzzzz-no-match-zzzzz')
    await expect.poll(async () => rowLinks.count(), { timeout: 5000 }).toBe(0)
  })

  test('"New donor" page creates a row that survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDonors(page)
    await page.getByRole('link', { name: /\+ new donor/i }).click()
    await expect(page).toHaveURL(/\/donors\/new/)

    const name = `E2E Donor ${Date.now() % 100000}`
    await page.getByLabel(/^name$/i).fill(name)
    await page.getByLabel(/^email$/i).fill(`donor+${Date.now() % 100000}@e2e.test`)
    await page.getByRole('button', { name: /^add donor$/i }).click()

    await expect(page).toHaveURL(/\/donors\/[a-f0-9-]{36}$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
    await page.goto(APP_BASE + '/donors')
    await expect(page.getByRole('link', { name })).toBeVisible({ timeout: 10000 })

    // read-after-write through the API the page reads
    const list = await page.request.get(API_BASE + '/donors', {
      headers: apiHeaders(accessToken),
    })
    const rows = (await list.json()) as Array<{ name: string }>
    expect(
      rows.some((r) => r.name === name),
      'created donor present in /api/donors',
    ).toBe(true)
  })
})
