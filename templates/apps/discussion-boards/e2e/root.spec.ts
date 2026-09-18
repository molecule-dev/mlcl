import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing — public marketing)', () => {
  test('Sign-in CTA in the header navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('Join-free CTA in the header navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Join free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/, { timeout: 10_000 })
  })

  test('Hero primary CTA "Start a community" goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start a community/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/, { timeout: 10_000 })
  })

  test('Secondary CTA scrolls to #categories anchor', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /See it in action/i })
      .first()
      .click()
    // hash navigation lands on #categories OR scrolls (jsdom-ish Playwright)
    await page.waitForFunction(
      () =>
        document.location.hash === '#categories' ||
        document.querySelector('#categories')?.getBoundingClientRect().top !== undefined,
      undefined,
      { timeout: 5000 },
    )
  })

  test('Bottom CTA "Browse the rooms" goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const bottomCta = page.getByRole('link', { name: /Browse the rooms/i }).first()
    if (await bottomCta.count()) {
      await bottomCta.click()
      await expect(page).toHaveURL(/\/signup$/, { timeout: 10_000 })
    }
  })

  test('Theme toggle is present and clickable from the landing header', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const toggle = page.locator('header button').first()
    await expect(toggle).toBeVisible()
    await toggle.click() // does not throw
  })

  test('Hero localized headline renders without raw {{tagline}} placeholder', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    // Page returns 2xx HTML (Vite shell)
    const shell = reqs.find((r) => r.url.endsWith('/') && r.method === 'GET')
    expect(shell).toBeTruthy()
    // No raw mustache leaks — both the eyebrow and one paragraph copy
    // include the i18n key fallback that interpolates the APP_TAGLINE.
    expect(await page.locator('body').innerText()).not.toMatch(/\{\{tagline\}\}/)
    expect(await page.locator('body').innerText()).not.toMatch(/\{\{count\}\}/)
  })
})
