import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard (Dashboard)', () => {
  test('renders the Dashboard heading after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Dashboard/i, level: 1 })).toBeVisible()
  })

  test('sidebar New Project link navigates to /projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /New Project/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects/)
  })

  test('sidebar Projects link navigates to /projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/projects"]').first().click()
    await expect(page).toHaveURL(/\/projects/)
  })

  test('sidebar Library link navigates to /library', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /Library/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/library/)
  })

  test('sidebar Assets link navigates to /assets', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /Assets/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/assets/)
  })

  test('sidebar Settings link navigates to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /Settings/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('View all link navigates to /projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /View all/i }).click()
    await expect(page).toHaveURL(/\/projects/)
  })

  test('dashboard fetches /api/projects, /api/exports, /api/activity on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const projectsCall = reqs.find(
      (r) => /\/api\/projects(?:\?|$)/.test(r.url) && r.method === 'GET',
    )
    const activityCall = reqs.find((r) => /\/api\/activity/.test(r.url) && r.method === 'GET')
    expect(projectsCall, 'GET /api/projects fired').toBeTruthy()
    expect(projectsCall!.status).toBeLessThan(300)
    expect(activityCall, 'GET /api/activity fired').toBeTruthy()
    expect(activityCall!.status).toBeLessThan(300)
    // /api/exports may only fire if there is at least one project — assert
    // its absence does NOT break, but if it fires it must be 2xx.
    const exportsCall = reqs.find((r) => /\/api\/exports/.test(r.url) && r.method === 'GET')
    if (exportsCall) expect(exportsCall.status).toBeLessThan(300)
  })
})
