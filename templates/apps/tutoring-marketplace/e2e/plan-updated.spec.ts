/**
 * /plan-updated per-page suite.
 * Post-Stripe-Checkout redirect target. Authenticated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders confirmation copy when authenticated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
    const html = await page.content()
    expect(html).toMatch(/plan has been updated|thank you/i)
  })

  test('Return-home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /return home/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(1_500)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('GET /api/billing/status reflects current plan', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForTimeout(1_500)
    })
    // Either the page loads /api/billing/status itself, or we can probe directly
    const direct = await apiFetch<any>(page, 'GET', '/billing/status')
    expect(direct.status).toBe(200)
    expect(direct.body).toHaveProperty('isFree')
    void reqs
  })

  test('renders without console errors', async ({ page }) => {
    // Attach the listener AFTER signup: it was attached before, so anything the
    // signup landing page logged was collected and then reported as a
    // /plan-updated console error (that is how a routine `/api/tutors/me` 404 on
    // the post-signup dashboard failed this test). The assertion below names one
    // page, so it must observe only that page.
    await signup(page)
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(1_500)
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|Failed to fetch/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})
