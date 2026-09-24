/**
 * /settings — profile + writing preferences.
 *
 * Asserts: /settings renders, the profile form is pre-filled with
 * the signed-in user, "Save profile" PATCHes /api/users/:id and the
 * change persists across reload, daily-goal + editor toggles persist
 * to localStorage and survive reload.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
  })

  test('renders the page and pre-fills profile fields', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByTestId('settings-name')).toHaveValue(/.+/)
    await expect(page.getByTestId('settings-email')).toHaveValue(/@/)
  })

  test('save profile PATCHes /users/:id and persists across reload', async ({ page }) => {
    const newName = `Versal Tester ${Date.now()}`
    await page.getByTestId('settings-name').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('settings-save-profile').click()
      await page.waitForTimeout(1_500)
    })
    const patch = reqs.find(
      (r) => /\/api\/users\/[0-9a-f-]{8,}/.test(r.url) && r.method === 'PATCH',
    )
    expect(patch?.status).toBeGreaterThanOrEqual(200)
    expect(patch?.status).toBeLessThan(300)
    await page.reload()
    await expect(page.getByTestId('settings-name')).toHaveValue(newName)
  })

  test('daily-goal preference persists in localStorage across reload', async ({ page }) => {
    await page.getByTestId('settings-daily-goal').fill('1234')
    await page.waitForTimeout(500)
    const stored = await page.evaluate(() => window.localStorage.getItem('versal.dailyGoal'))
    expect(stored).toBe('1234')
    await page.reload()
    await expect(page.getByTestId('settings-daily-goal')).toHaveValue('1234')
  })

  test('editor preference toggle flips aria-checked and persists across reload', async ({
    page,
  }) => {
    // Shared Switch: role="switch" with aria-checked reflects state; the
    // value round-trips to localStorage like the other preferences.
    const toggle = page.getByTestId('settings-toggle-spellCheck')
    await expect(toggle).toHaveAttribute('role', 'switch')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    const stored = await page.evaluate(() => window.localStorage.getItem('versal.editorToggles'))
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ spellCheck: false })
    await page.reload()
    await expect(page.getByTestId('settings-toggle-spellCheck')).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})
