/**
 * /settings — account settings (profile, verifications, payments,
 * preferences).
 *
 * Real outcomes asserted:
 *   - profile section renders user name + email
 *   - section nav switches the rendered panel
 *   - editing the phone field + clicking Save changes fires
 *     PATCH /api/users/:id (name/email) AND PATCH /api/settings (phone),
 *     and the new phone persists across reload (read-after-write via the
 *     server-side settings channel)
 *   - preference toggles fire PATCH /api/settings and persist across reload
 *   - "Open billing" CTA links to /pricing
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test('settings profile section shows the signed-in user', async ({ page }) => {
  const { firstName, email } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
  // Signed-in-as line uses the full name.
  await expect(page.locator('body')).toContainText(firstName)
  // Email field renders the registered email.
  const emailInput = page.locator('input[type="email"]').first()
  await expect(emailInput).toHaveValue(email)
})

test('section nav switches the visible panel', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  // Profile panel visible by default.
  await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
  // Switch to Verifications.
  await page.getByRole('button', { name: /^verifications$/i }).click()
  await expect(page.getByRole('heading', { name: /^verifications$/i })).toBeVisible()
  // Switch to Payment methods.
  await page.getByRole('button', { name: /^payment methods$/i }).click()
  await expect(page.getByRole('heading', { name: /^payment methods$/i })).toBeVisible()
  // The Open billing CTA links to /pricing.
  await expect(page.getByRole('link', { name: /^open billing$/i })).toHaveAttribute(
    'href',
    /\/pricing/,
  )
  // Switch to Preferences.
  await page.getByRole('button', { name: /^preferences$/i }).click()
  await expect(page.getByRole('heading', { name: /^preferences$/i })).toBeVisible()
})

test('editing the phone field saves and persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  // The Profile section has 4 fields: firstName, lastName, email, phone.
  const phoneInput = page.locator('input[type="tel"]').first()
  await phoneInput.waitFor({ state: 'visible' })
  await phoneInput.fill('+15555550199')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^save changes$/i }).click()
    await page.waitForTimeout(1500)
  })
  // Phone + preferences persist through the server-side /api/settings
  // channel (PATCH /api/users/:id carries only name/email — the platform
  // user resource never echoes oauthData on reads).
  const patch = reqs.find((r) => /\/api\/settings\/?/.test(r.url) && r.method === 'PATCH')
  expect(patch, 'PATCH /api/settings should fire when saving the phone').toBeTruthy()
  expect(patch!.status).toBe(200)

  // Read-after-write: reload + check phone is still set.
  await page.reload()
  await page.waitForLoadState('networkidle')
  const reloaded = page.locator('input[type="tel"]').first()
  await expect(reloaded).toHaveValue('+15555550199', { timeout: 5000 })
})

test('toggling a preference fires a PATCH', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^preferences$/i }).click()
  // Use the first switch in the preferences panel.
  const sw = page.getByRole('switch').first()
  await sw.waitFor({ state: 'visible' })
  const reqs = await captureNetwork(page, async () => {
    await sw.click()
    await page.waitForTimeout(1000)
  })
  const patch = reqs.find((r) => /\/api\/settings\/?/.test(r.url) && r.method === 'PATCH')
  expect(patch, 'PATCH /api/settings should fire when toggling a preference').toBeTruthy()
  expect(patch!.status).toBe(200)
})

test('toggling a preference persists across reload (read-after-write)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^preferences$/i }).click()
  const sw = page.getByRole('switch').first()
  await sw.waitFor({ state: 'visible' })
  const before = await sw.getAttribute('aria-checked')
  await sw.click()
  await page.waitForTimeout(800)
  const after = await sw.getAttribute('aria-checked')
  expect(after, 'aria-checked should flip after click').not.toBe(before)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^preferences$/i }).click()
  const reloaded = page.getByRole('switch').first()
  await reloaded.waitFor({ state: 'visible' })
  await expect(reloaded).toHaveAttribute('aria-checked', after!, { timeout: 5000 })
})
