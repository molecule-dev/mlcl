import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, pickVideo, signup, uniqueEmail } from './_helpers.js'

test.describe('auth flow', () => {
  test('signup persists session — protected /home loads the catalog', async ({ page }) => {
    await signup(page)
    // Read the video under test from the same endpoint /home reads, so the
    // spec still holds once the demo catalog is replaced.
    const video = await pickVideo(page)
    await page.goto(APP_BASE + '/home')
    await expect(page).toHaveURL(/\/home/)
    // The catalog videos render with their real titles via /api/videos.
    await expect(page.getByText(video.title).first()).toBeVisible({ timeout: 15_000 })
  })

  test('login form rejects invalid credentials with a visible error', async ({ page }) => {
    // The expected 403 from /api/users/log-in is the contract under test —
    // not a page bug — so the console-guard must not fail on it.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('bad'))
    await page.locator('input[type="password"]').first().fill('wrong-password')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    // Either an error toast or an alert region with the text — accept any visible error UI.
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('relogin with the same credentials lands on /home', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/home/, { timeout: 20_000 })
  })
})
