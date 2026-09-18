import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers'

test.describe('/generator', () => {
  test('renders an initial password and Regenerate button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generator')
    await expect(page.getByRole('button', { name: /regenerate/i })).toBeVisible()
    const initial = await page
      .locator('section[aria-label*="Generated password" i] span')
      .first()
      .textContent()
    expect((initial ?? '').replace(/\s/g, '').length).toBeGreaterThan(8)
  })

  test('Regenerate produces a new password each click and grows session history', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generator')
    const valueLocator = page.locator('section[aria-label*="Generated password" i] span').first()
    const before = ((await valueLocator.textContent()) ?? '').trim()
    await page.getByRole('button', { name: /regenerate/i }).click()
    await expect
      .poll(async () => ((await valueLocator.textContent()) ?? '').trim())
      .not.toBe(before)
    const sessionCount = page.getByTestId('generator-session-count')
    await expect(sessionCount).toHaveText(/^[1-9]\d*$/)
  })

  test('switching to Passphrase mode generates hyphenated words', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generator')
    await page.getByRole('button', { name: /^passphrase$/i }).click()
    await page.getByRole('button', { name: /regenerate/i }).click()
    const value = (
      (await page
        .locator('section[aria-label*="Generated password" i] span')
        .first()
        .textContent()) ?? ''
    ).trim()
    expect(value).toMatch(/^[a-z]+-[a-z]+/)
  })

  test('switching to PIN mode produces digits only', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generator')
    await page.getByRole('button', { name: /^pin$/i }).click()
    await page.getByRole('button', { name: /regenerate/i }).click()
    const value = (
      (await page
        .locator('section[aria-label*="Generated password" i] span')
        .first()
        .textContent()) ?? ''
    ).trim()
    expect(value).toMatch(/^\d+$/)
  })
})
