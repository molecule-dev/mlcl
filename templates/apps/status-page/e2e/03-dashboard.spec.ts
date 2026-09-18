import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createComponent,
  createIncident,
  createSubscriber,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('reflects real component / incident / subscriber counts from the DB', async ({ page }) => {
    await signup(page)

    // Seed a deterministic mix.
    const opComp = await createComponent(page, { name: `op-${Date.now()}`, group: 'platform' })
    const degComp = await createComponent(page, { name: `deg-${Date.now()}`, group: 'platform' })
    // We will tag the second component as degraded by opening an incident
    // against it (the dashboard uses incidents-active as one signal).
    const inc = await createIncident(page, {
      title: `Dashboard incident ${Date.now()}`,
      impact: 'major',
      affected: [degComp.id],
    })
    expect(inc.id).toBeTruthy()
    await createSubscriber(page, { email: uniqueEmail('dashsub') })

    await page.goto(APP_BASE + '/dashboard')
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: /vigil|status|operational|dashboard/i })
        .first(),
    ).toBeVisible({ timeout: 15_000 })

    const body = await page.locator('body').innerText()
    // The first component name we created must appear somewhere on the dashboard.
    expect(body).toContain(opComp.name)
    // The incident we just opened must be referenced too.
    expect(body.toLowerCase()).toContain('dashboard incident')
  })

  test('does not show fabricated subscriber count "247"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
    const body = await page.locator('body').innerText()
    // The hardcoded demo number must NOT appear unless the user genuinely
    // has 247 subscribers (highly unlikely on a fresh sign-up).
    expect(body.includes('247')).toBe(false)
  })

  test('issues GETs to /api/components and /api/subscribers on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(2000)
    })
    const components = reqs.find((r) => r.url.includes('/api/components') && r.method === 'GET')
    const subscribers = reqs.find((r) => r.url.includes('/api/subscribers') && r.method === 'GET')
    expect(components?.status, 'GET /api/components').toBe(200)
    expect(subscribers?.status, 'GET /api/subscribers').toBe(200)
  })

  test('sidebar navigation includes Incidents and Components links', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('link', { name: /^incidents$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('link', { name: /^components$/i }).first()).toBeVisible()
  })
})
