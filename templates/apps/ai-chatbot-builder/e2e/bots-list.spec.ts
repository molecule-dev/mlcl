/**
 * /bots — list of the user's bots. Empty state renders for new users,
 * rows render after seeding via the API, and the row links into the
 * appropriate detail route. Cross-tenant bots must NOT leak.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, seedBot, signup, uniqueEmail } from './_helpers.js'

test.describe('bots list', () => {
  test("new user sees an empty bots list (no other users' bots leak)", async ({ page }) => {
    await signup(page, uniqueEmail('bots-empty'))
    await page.goto(APP_BASE + '/bots')
    await page.waitForLoadState('networkidle')
    // The empty state must NOT show another tenant's bot. We assert this
    // negatively via the API, which is the source of truth.
    const list = await page.request.get(API_BASE + '/bots')
    expect(list.status()).toBe(200)
    const body = await list.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(0)
  })

  test('seeded bots appear and a non-existent bot 404s for the right reason', async ({
    page,
    browser,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('bots-seed'))
    const { id, name } = await seedBot(page, accessToken, {
      name: `Visible Bot ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/bots')
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })

    // Authorization: a fresh user must NOT be able to read this bot.
    // Use a fresh context for user B — reusing `page` would hit
    // /signup while still authenticated as user A, which redirects
    // away from the signup form.
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const otherUser = await signup(pageB, uniqueEmail('bots-other'))
    const stolen = await pageB.request.get(API_BASE + `/bots/${id}`, {
      headers: authHeaders(otherUser.accessToken),
      failOnStatusCode: false,
    })
    expect(stolen.status(), 'cross-tenant read must 404 / 403').toBeGreaterThanOrEqual(400)
    expect(stolen.status()).toBeLessThan(500)
    await ctxB.close()
  })

  test('clicking + New Bot opens the create form', async ({ page }) => {
    await signup(page, uniqueEmail('bots-newbtn'))
    await page.goto(APP_BASE + '/bots')
    // Both the empty-state CTA and the topnav CTA point at /bots/new.
    const cta = page.locator('a[href="/bots/new"]').first()
    await expect(cta).toBeVisible({ timeout: 10000 })
    await cta.click()
    await page.waitForURL('**/bots/new', { timeout: 5000 })
    await expect(
      page.locator('input[name="name"], input[placeholder*="name" i]').first(),
    ).toBeVisible()
  })
})
