import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('renders heading and section navigation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /^playback$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^downloads$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^notifications$/i })).toBeVisible()
  })

  test('initial load fetches /api/profile/preferences', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some((r) => /\/api\/profile\/preferences/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('changing default-speed input persists via PUT /api/profile/preferences and survives reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const speed = page.getByRole('textbox', { name: /default speed/i })
    await expect(speed).toBeVisible()
    const requests = await captureNetwork(page, async () => {
      await speed.fill('1.5×')
      await speed.blur()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'PUT' && /\/api\/profile\/preferences/.test(r.url)),
    ).toBeTruthy()
    await page.reload()
    await expect(page.getByRole('textbox', { name: /default speed/i })).toHaveValue(/1\.5/)
  })

  test('skip-back interval spinbutton accepts changes and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const skipBack = page.getByRole('spinbutton', { name: /skip-back/i })
    await skipBack.fill('15')
    await skipBack.blur()
    await page.waitForTimeout(1500)
    await page.reload()
    await expect(page.getByRole('spinbutton', { name: /skip-back/i })).toHaveValue('15')
  })

  test('toggling Voice boost checkbox persists and survives reload', async ({ page }) => {
    await signup(page)
    // Wait for GET /api/profile/preferences to resolve before reading the
    // initial state — otherwise the fetch can land after voice.click() and
    // overwrite the optimistic toggle. Then wait for the PUT debounced
    // round-trip before reloading so the persisted value is the toggled
    // one.
    const prefsLoaded = page.waitForResponse(
      (r) =>
        /\/api\/profile\/preferences/.test(r.url()) &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 15000 },
    )
    await page.goto(APP_BASE + '/settings')
    await prefsLoaded
    const voice = page.getByRole('checkbox', { name: /voice boost/i })
    await expect(voice).toBeVisible()
    const initial = await voice.isChecked()
    const persisted = page.waitForResponse(
      (r) =>
        /\/api\/profile\/preferences/.test(r.url()) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15000 },
    )
    await voice.click()
    // Verify the optimistic state flipped before waiting on the network.
    await expect(voice).toBeChecked({ checked: !initial })
    await persisted
    await page.reload()
    await expect(page.getByRole('checkbox', { name: /voice boost/i })).toBeChecked({
      checked: !initial,
    })
  })

  test('switching to Downloads section reveals download settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^downloads$/i }).click()
    await expect(page.getByRole('heading', { name: /^downloads$/i, level: 2 })).toBeVisible()
  })

  test('switching to Notifications section reveals notification settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^notifications$/i }).click()
    await expect(page.getByRole('heading', { name: /^notifications$/i, level: 2 })).toBeVisible()
  })

  test('toggling Trim silence checkbox persists', async ({ page }) => {
    await signup(page)
    // Wait for GET /api/profile/preferences to resolve before reading the
    // initial state — otherwise the fetch can land after trim.click() and
    // overwrite the optimistic toggle. Then wait for the PUT debounced
    // round-trip before reloading so the persisted value is the toggled
    // one.
    const prefsLoaded = page.waitForResponse(
      (r) =>
        /\/api\/profile\/preferences/.test(r.url()) &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 15000 },
    )
    await page.goto(APP_BASE + '/settings')
    await prefsLoaded
    const trim = page.getByRole('checkbox', { name: /trim silence/i })
    await expect(trim).toBeVisible()
    const initial = await trim.isChecked()
    const persisted = page.waitForResponse(
      (r) =>
        /\/api\/profile\/preferences/.test(r.url()) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15000 },
    )
    await trim.click()
    // Verify the optimistic state flipped before waiting on the network.
    await expect(trim).toBeChecked({ checked: !initial })
    await persisted
    await page.reload()
    await expect(page.getByRole('checkbox', { name: /trim silence/i })).toBeChecked({
      checked: !initial,
    })
  })

  test('settings page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible()
    })
  })
})
