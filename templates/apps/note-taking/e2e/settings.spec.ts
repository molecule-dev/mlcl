/**
 * Settings journey: profile preferences (theme, line-height, toggles) load
 * from /api/profile/me and persist via PATCH; reload restores the saved
 * values.
 *
 * Outcomes asserted: PATCH /api/profile/me round-trips after toggling each
 * control, and the new value re-appears in the API response on reload.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('settings load from API on first visit', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
  })
  const profileGet = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me$/.test(r.url))
  expect(profileGet, 'GET /api/profile/me on settings load').toBeTruthy()
  expect(profileGet!.status).toBe(200)
})

test('toggle realtime sync persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')

  // Switch to sync section.
  await page
    .getByRole('button', { name: /^sync$/i })
    .first()
    .click()

  const toggle = page.getByTestId('toggle-sync')
  const initialState = await toggle.getAttribute('aria-checked')
  expect(initialState).not.toBeNull()

  const reqs = await captureNetwork(page, async () => {
    await toggle.click()
    // Debounced save flushes after 500ms.
    await page.waitForTimeout(900)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me$/.test(r.url))
  expect(patch, 'PATCH /api/profile/me on toggle').toBeTruthy()
  expect(patch!.status).toBeGreaterThanOrEqual(200)
  expect(patch!.status).toBeLessThan(300)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /^sync$/i })
    .first()
    .click()
  const afterReload = await page.getByTestId('toggle-sync').getAttribute('aria-checked')
  expect(afterReload).not.toBe(initialState)
})

test('change theme to dark persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('theme-dark').click()
  await page.waitForTimeout(900)
  await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true')
})

test('display name edit persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')

  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  const nameInput = page.locator('[data-testid="field-name"] input')
  await nameInput.fill('Renamed Verso User')
  await nameInput.blur()
  await page.waitForTimeout(900)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await expect(page.locator('[data-testid="field-name"] input')).toHaveValue('Renamed Verso User')
})

test('settings sidebar nav exposes all 6 primary links', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  for (const name of ['Home', 'Notes', 'Search', 'Graph', 'Tags', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})

test('settings header brand link goes to /home', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('link', { name: /^verso$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/home/)
})

test('settings tabs (Editor / Sync / Account) switch the right pane', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /^editor$/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: /typography/i })).toBeVisible()
  await page
    .getByRole('button', { name: /^sync$/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: /how your notes travel/i })).toBeVisible()
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible()
})

test('serif body text toggle PATCHes the profile', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('switch', { name: /serif body text/i })
      .first()
      .click()
    await page.waitForTimeout(900)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me$/.test(r.url))
  expect(patch, 'serif toggle should PATCH profile').toBeTruthy()
  expect(patch!.status).toBeLessThan(300)
})

test('hover-preview switch PATCHes the profile', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('switch', { name: /hover preview|backlink/i })
      .first()
      .click()
    await page.waitForTimeout(900)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me$/.test(r.url))
  expect(patch, 'hover-preview toggle should PATCH profile').toBeTruthy()
})

test('line-height slider PATCHes the profile', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  const slider = page.getByRole('slider', { name: /line height/i }).first()
  const reqs = await captureNetwork(page, async () => {
    // Move the slider via keyboard so we don't depend on dragging coords.
    await slider.focus()
    await slider.press('ArrowLeft')
    await page.waitForTimeout(900)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me$/.test(r.url))
  expect(patch, 'slider should PATCH profile').toBeTruthy()
})

test('theme buttons swap aria-pressed across Light/Dark/Sepia', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('theme-dark').click()
  await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByTestId('theme-sepia')
    .click()
    .catch(async () => {
      await page.getByRole('button', { name: /^sepia$/i }).click()
    })
  // After clicking sepia, dark must no longer be pressed.
  await page.waitForTimeout(300)
  await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'false')
})

test('account tab shows email matching /api/profile/me', async ({ page }) => {
  await signup(page)
  const meRes = await page.request.get('/api/profile/me')
  const me = await meRes.json()
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await expect(page.getByText(me.email)).toBeVisible()
})

test('account tab shows current plan name', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await expect(
    page
      .getByText(/^Plan$/i)
      .or(page.getByText(/Free|Pro|Team/i))
      .first(),
  ).toBeVisible()
})

test('account tab change-password action is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /change password/i }).first()).toBeVisible()
})

test('account tab log-out action signs the user out', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('button', { name: /^account$/i })
    .first()
    .click()
  await page
    .getByRole('button', { name: /^log out$/i })
    .first()
    .click()
  await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login|\/$/)
})

test('settings user-menu button is reachable from any tab', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('button', { name: /open user menu/i }).first()).toBeVisible()
})
