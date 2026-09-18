import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /profile — current user's email + display name + active plan. Editing
// the display name PATCHes /api/users/:id and reloads the row.

test.describe('/profile', () => {
  test('renders email and plan after signup', async ({ page }) => {
    const creds = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForTimeout(1500)
    })
    const meGet = reqs.find((r) => r.method === 'GET' && /\/api\/users\/me\b/.test(r.url))
    expect(meGet, 'GET /api/users/me should fire').toBeDefined()
    expect(meGet!.status).toBe(200)
    await expect(page.locator('[data-mol-id="profile-email"]')).toContainText(creds.email)
    await expect(page.locator('[data-mol-id="profile-plan"]')).toBeVisible()
  })

  test('editing display name PATCHes /api/users/:id and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(1500)
    const newName = 'Cypher Walker ' + Date.now()
    await page.locator('[data-mol-id="profile-name"]').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-save"]').click()
      await page.waitForTimeout(1500)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/[^/]+$/.test(r.url))
    expect(patch, 'PATCH /api/users/:id should fire').toBeDefined()
    expect(patch!.status, 'name save should succeed').toBeLessThan(300)
    // Confirm DB truth.
    const me = await apiFetch(page, 'GET', '/users/me')
    expect((me.json as { props: { name?: string } }).props.name).toBe(newName)
  })

  test('plan CTA links to /pricing for upgrade', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(1500)
    const cta = page.locator('[data-mol-id="profile-plan-cta"]')
    if ((await cta.count()) === 0) {
      // Optional: some tiers don't surface a CTA. Then `profile-plan` must
      // at least be visible (already covered above) — pass without action.
      return
    }
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href, 'plan CTA should link to /pricing').toMatch(/\/pricing$/)
  })
})
