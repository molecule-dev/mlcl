import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('Settings shows real email from /users/me; persists email change', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  const emailInput = page.locator('#settings-email')
  await expect(emailInput).toBeVisible({ timeout: 10_000 })
  await expect(emailInput).toHaveValue(email)

  const newEmail = uniqueEmail('updated')
  await emailInput.fill(newEmail)
  const reqs = await captureNetwork(page, async () => {
    await emailInput.blur()
    await page.waitForTimeout(1500)
  })
  const patch = reqs.find((r) => /\/api\/users\/[0-9a-f-]+/.test(r.url) && r.method === 'PATCH')
  expect(patch?.status).toBe(200)

  // Verify via GET /users/me on a fresh request
  const me = await apiGet<{ props: { email: string } }>(page, '/users/me')
  expect(me.body?.props.email).toBe(newEmail)

  // Persists across reload
  await page.reload()
  await expect(page.locator('#settings-email')).toHaveValue(newEmail, { timeout: 10_000 })
})

test('Notification preferences toggle persists via PATCH /users/:id (oauthData.preferences)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  // Wait for me to load — input filled
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })

  // Find the "Mentions" toggle (default true → click to disable)
  const mentions = page.getByRole('switch', { name: /mentions/i }).first()
  await expect(mentions).toBeVisible()
  const initial = await mentions.getAttribute('aria-checked')
  expect(initial).toBe('true')

  const reqs = await captureNetwork(page, async () => {
    await mentions.click()
    await page.waitForTimeout(800)
  })
  const patch = reqs.find((r) => /\/api\/users\/[0-9a-f-]+$/.test(r.url) && r.method === 'PATCH')
  expect(patch?.status).toBe(200)

  // Verify via /users/me that oauthData.preferences.notifications.mentions is now false
  const me = await apiGet<{
    props: { oauthData?: { preferences?: { notifications?: Record<string, boolean> } } }
  }>(page, '/users/me')
  expect(me.body?.props.oauthData?.preferences?.notifications?.mentions).toBe(false)

  // Persists across reload
  await page.reload()
  const reloaded = page.getByRole('switch', { name: /mentions/i }).first()
  await expect(reloaded).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
})

test('Reading preferences toggle persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })

  const tocAuto = page.getByRole('switch', { name: /auto-generated toc/i }).first()
  const initial = await tocAuto.getAttribute('aria-checked')
  expect(initial).toBe('true')
  await tocAuto.click()
  await page.waitForTimeout(800)

  const me = await apiGet<{
    props: { oauthData?: { preferences?: { reading?: Record<string, boolean> } } }
  }>(page, '/users/me')
  expect(me.body?.props.oauthData?.preferences?.reading?.tocAuto).toBe(false)
})

test('Two-factor Enable opens the TOTP modal; setup provisions a QR; invalid code is rejected', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })

  // Disabled by default for a fresh account.
  await expect(page.getByText(/^Disabled$/)).toBeVisible()

  // Enabling goes through the real TOTP step-up: the modal requests a fresh
  // secret + QR via POST /users/:id/verify-two-factor {action:'setup'}.
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="two-factor-toggle"]').click()
    await expect(page.getByRole('dialog', { name: /two-factor authentication/i })).toBeVisible({
      timeout: 10_000,
    })
    await page.waitForTimeout(1200)
  })
  const setup = reqs.find(
    (r) => /\/api\/users\/[0-9a-f-]+\/verify-two-factor/.test(r.url) && r.method === 'POST',
  )
  expect(setup, 'POST /users/:id/verify-two-factor (setup) must have fired').toBeTruthy()
  expect(setup!.status).toBeLessThan(400)

  // A bogus code must NOT enable 2FA.
  await page.locator('#settings-2fa-token').fill('000000')
  await page.getByRole('button', { name: /verify & enable/i }).click()
  await page.waitForTimeout(800)
  const me = await apiGet<{ props: { twoFactorEnabled?: boolean } }>(page, '/users/me')
  expect(me.body?.props.twoFactorEnabled ?? false).toBe(false)

  // Dismiss the modal; the account section still reports Disabled.
  await page.keyboard.press('Escape')
  await expect(page.getByText(/^Disabled$/)).toBeVisible()
})

test('Change-password modal opens and posts to /users/:id/password', async ({ page }) => {
  const { password } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })

  await page.getByRole('button', { name: /change password/i }).click()
  await page.locator('#settings-old-password').fill(password)
  await page.locator('#settings-new-password').fill('NewPassword456!')
  await page.locator('#settings-confirm-password').fill('NewPassword456!')

  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /change password/i })
      .last()
      .click()
    await page.waitForTimeout(1500)
  })
  const patch = reqs.find(
    (r) => /\/api\/users\/[0-9a-f-]+\/password/.test(r.url) && r.method === 'PATCH',
  )
  expect(patch).toBeDefined()
  expect([200, 204]).toContain(patch!.status)
})

test('Delete-workspace modal opens; cancel does not delete', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })
  await page.getByRole('button', { name: /^delete workspace$/i }).click()
  // Confirmation modal appears asking to type DELETE
  await expect(page.locator('#settings-delete-confirm')).toBeVisible()
  await page.getByRole('button', { name: /^cancel$/i }).click()
  // Modal closed; user still authenticated (no /login redirect)
  await expect(page.locator('#settings-email')).toBeVisible()
})
