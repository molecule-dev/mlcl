import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('signup → generate → gallery → image detail → editor → settings → logout → login', async ({
    page,
  }) => {
    const email = uniqueEmail('journey')
    const { password } = await signup(page, email)

    // After signup we should land on /dashboard with seeded content.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Dreamscape/i, level: 1 })).toBeVisible()

    // Step 1 — go to /generate and request a real image.
    await page
      .getByRole('link', { name: /^auto_awesome Generate$|^Generate$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/generate/)
    await page.getByPlaceholder(/dreamscape/i).fill('A serene mountain at dawn, photoreal')

    const generationsPost = page.waitForResponse(
      (r) => /\/api\/generations(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 90_000 },
    )
    await page
      .getByRole('button', { name: /^auto_awesome Generate$|^Generate$/i })
      .first()
      .click()
    const genResp = await generationsPost
    expect(genResp.status(), 'POST /api/generations must succeed').toBeLessThan(300)
    const genBody = (await genResp.json()) as { id?: string; image_url?: string | null }
    expect(genBody.image_url, 'journey: Generate must produce a real image').toBeTruthy()

    // Step 2 — gallery should still render and contain at least one image card.
    await page
      .getByRole('link', { name: /Gallery/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/gallery/)
    const firstImage = page.locator('a[href^="/images/"]').first()
    await expect(firstImage).toBeVisible({ timeout: 10000 })

    // Step 3 — open image detail.
    await firstImage.click()
    await expect(page).toHaveURL(/\/images\//)
    await expect(page.getByRole('heading', { name: /^Image$/i, level: 1 })).toBeVisible()

    // Step 4 — open editor from image detail.
    await page.getByRole('link', { name: /Open in editor/i }).click()
    await expect(page).toHaveURL(/\/editor\//)
    await expect(page.getByRole('heading', { name: /^Editor$/i, level: 1 })).toBeVisible()

    // Step 5 — settings.
    await page
      .getByRole('link', { name: /^settings Settings$|^Settings$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()

    // Step 6 — sign out then sign back in via the same credentials.
    // Scoped to the sidebar: this app offers sign-out in BOTH the sidebar nav
    // and the avatar menu — a deliberate pattern, not a duplicate label — so an
    // unscoped role query is a strict-mode violation.
    await page
      .locator('aside')
      .getByRole('button', { name: /Sign out/i })
      .click()
    await page.waitForURL(
      (u) => !u.pathname.includes('/dashboard') && !u.pathname.includes('/settings'),
      {
        timeout: 10000,
      },
    )
    await login(page, email, password)
    // Re-login may land back on the user's previous authenticated page
    // (/settings) rather than /dashboard — either is a valid signed-in landing.
    expect(page.url()).not.toMatch(/\/login/)
    expect(page.url()).toMatch(
      /\/(dashboard|settings|generate|gallery|collections|profile|prompts|models|notifications|styles)/,
    )
  })
})
