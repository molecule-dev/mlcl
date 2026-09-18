import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test('renders Dreamscape h1 after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Dreamscape/i, level: 1 })).toBeVisible()
  })

  test('dashboard fetches /api/credits on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/credits/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('sidebar "New image" goes to /generate', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /New image/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/generate/)
  })

  test('sidebar "Gallery" goes to /gallery', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /Gallery/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/gallery/)
  })

  test('sidebar "Collections" goes to /collections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /Collections/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/collections/)
  })

  test('sidebar "Settings" goes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /^settings Settings$|^Settings$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('"Sign out" navigates away from /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // Scoped to the sidebar: this app offers sign-out in BOTH the sidebar nav
    // and the avatar menu — a deliberate pattern, not a duplicate label — so an
    // unscoped role query is a strict-mode violation.
    await page
      .locator('aside')
      .getByRole('button', { name: /Sign out/i })
      .click()
    await page.waitForURL((u) => !u.pathname.includes('/dashboard'), { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/dashboard/)
  })

  test('"Toggle theme" flips mode AND survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // The CSS-variables theme bond writes `data-mol-mode` on <html>; the
    // tailwind dark variant also relies on a `.dark` class that the bond
    // syncs. Verify both flip on click AND survive a full reload.
    const before = await page.evaluate(() => ({
      mode: document.documentElement.dataset.molMode,
      hasDarkClass: document.documentElement.classList.contains('dark'),
    }))
    await page.getByRole('button', { name: /Toggle theme/i }).click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => ({
      mode: document.documentElement.dataset.molMode,
      hasDarkClass: document.documentElement.classList.contains('dark'),
    }))
    expect(after.mode).not.toBeUndefined()
    expect(after.mode).not.toBe(before.mode)
    expect(after.hasDarkClass).not.toBe(before.hasDarkClass)

    await page.reload()
    const persisted = await page.evaluate(() => ({
      mode: document.documentElement.dataset.molMode,
      hasDarkClass: document.documentElement.classList.contains('dark'),
    }))
    expect(persisted.mode, 'theme mode must persist across reload').toBe(after.mode)
    expect(persisted.hasDarkClass, 'tailwind dark class must persist across reload').toBe(
      after.hasDarkClass,
    )
  })

  test('top-bar user menu opens a panel whose Settings link goes to /settings', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-mol-id="user-menu"]').click()
    await page.locator('[data-mol-id="user-menu-settings"]').click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('"Upgrade plan" link goes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /Upgrade plan/i }).click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('"Open studio" link goes to /generate', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /Open studio/i }).click()
    await expect(page).toHaveURL(/\/generate/)
  })

  test('"Open gallery" link goes to /gallery', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /Open gallery/i }).click()
    await expect(page).toHaveURL(/\/gallery/)
  })

  test('hero prompt textbox accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const tb = page.getByPlaceholder(/dreamscape/i)
    await tb.fill('a glowing forest')
    await expect(tb).toHaveValue('a glowing forest')
  })

  test('"Generate" button on dashboard ultimately produces a real artifact', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByPlaceholder(/dreamscape/i).fill('a glowing crystal cavern')

    const generationsPost = page.waitForResponse(
      (r) => /\/api\/generations(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 90_000 },
    )
    await page
      .getByRole('button', { name: /Generate/i })
      .first()
      .click()
    const resp = await generationsPost
    const body = (await resp.json()) as { id?: string; image_url?: string | null; status?: string }
    expect(resp.status(), 'POST /api/generations must succeed').toBeLessThan(300)
    expect(body.image_url, 'response must include a real image URL').toBeTruthy()
    expect(body.status).toBe('succeeded')
  })
})
