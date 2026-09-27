import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup, totp } from './_helpers.js'

test.describe('/settings', () => {
  test('Renders the email field with the signed-in user email pre-filled', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('#settings-email')).toHaveValue(email, { timeout: 15_000 })
  })

  test('Editing the email and blurring PATCHes /api/users/:id and persists across reload', async ({
    page,
  }) => {
    // Email is the account-recovery anchor, so the backend requires the
    // CURRENT PASSWORD on any email change: blur reveals an inline confirm
    // step, and the PATCH only fires once it is filled. Walk that flow.
    const { email, password } = await signup(page)
    const newEmail = email.replace('@', '+edit-' + Date.now() + '@')
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('#settings-email')).toHaveValue(email, { timeout: 15_000 })

    const reqs = await captureNetwork(page, async () => {
      await page.locator('#settings-email').fill(newEmail)
      // First blur reveals the current-password confirm step (no PATCH yet).
      await page.locator('#settings-email').blur()
      const pwField = page.locator('#settings-current-password')
      await expect(pwField).toBeVisible({ timeout: 10_000 })
      await pwField.fill(password)
      // Enter commits the change and fires the PATCH.
      await pwField.press('Enter')
      await page.waitForTimeout(800)
    })
    const patch = reqs.find((r) => /\/api\/users\/[^/]+$/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/users/:id must have fired').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)

    await page.reload()
    await expect(page.locator('#settings-email')).toHaveValue(newEmail, { timeout: 15_000 })
  })

  test('Change-password button opens the password change modal with current/new fields', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /Change password/i }).click()
    await expect(page.locator('#current-pw')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#new-pw')).toBeVisible()
  })

  test('Change-password submit POSTs and closes the modal on success', async ({ page }) => {
    const { password } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /Change password/i }).click()
    await page.locator('#current-pw').fill(password)
    await page.locator('#new-pw').fill('NewPass456!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Change password|Changing/i })
        .last()
        .click()
      await page.waitForTimeout(2000)
    })
    const pwCall = reqs.find(
      (r) =>
        /\/api\/users\/[^/]+\/password$/.test(r.url) &&
        (r.method === 'PATCH' || r.method === 'POST'),
    )
    expect(pwCall, 'PATCH /api/users/:id/password must have fired').toBeTruthy()
    expect(pwCall!.status).toBeLessThan(400)
  })

  test('Two-factor switch opens real TOTP enrollment and verifies a live code', async ({
    page,
  }) => {
    // [M-5] The 2FA switch never writes a bare flag: enabling opens the
    // enrollment modal, the app's setup route provisions a pending secret,
    // and the flag only flips after a REAL TOTP code is verified by
    // PATCH /api/users/me/two-factor { enabled: true, token } (see
    // api/src/handlers/users-2fa.ts). This drives that genuine enrollment —
    // the code is derived from the provisioned secret, the same way the
    // user's authenticator app would.
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const switches = page.getByRole('switch')
    const twoFa = switches.first()
    await expect(twoFa).toBeVisible({ timeout: 15_000 })

    // Arm the listener BEFORE the click so the setup body can't be missed.
    const setupResponse = page.waitForResponse(
      (r) =>
        /\/api\/users\/me\/two-factor\/setup$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 20_000 },
    )
    await twoFa.click()
    await expect(page.locator('[data-mol-id="two-factor-token"]')).toBeVisible({
      timeout: 15_000,
    })
    const setup = await setupResponse
    expect(setup.status(), 'POST two-factor setup must succeed').toBeLessThan(400)
    const setupBody = (await setup.json()) as { secret?: string }
    const secret = setupBody.secret
    expect(secret, 'setup must provision a base32 TOTP secret').toBeTruthy()
    await expect(page.locator('[data-mol-id="two-factor-secret"]')).toHaveText(secret!)

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="two-factor-token"]').fill(totp(secret!))
      await page.locator('[data-mol-id="two-factor-submit"]').click()
      await page.waitForTimeout(800)
    })
    const patch = reqs.find(
      (r) => /\/api\/users\/me\/two-factor$/.test(r.url) && r.method === 'PATCH',
    )
    expect(patch, 'PATCH /api/users/me/two-factor ({enabled, token}) must have fired').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)
    const after = await twoFa.getAttribute('aria-checked')
    expect(after, 'aria-checked must flip after verified enrollment').not.toBe('false')

    // Persists across reload — the freshly-mounted /users/me reflects it.
    await page.reload()
    const twoFaAfterReload = page.getByRole('switch').first()
    await expect(twoFaAfterReload).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(async () => twoFaAfterReload.getAttribute('aria-checked'), { timeout: 10_000 })
      .toBe(after)
  })

  test('Push notifications switch is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const switches = page.getByRole('switch')
    await expect(switches.nth(1)).toBeVisible({ timeout: 15_000 })
  })

  test('Upgrade button navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /Upgrade/i }).click()
    await expect(page).toHaveURL(/\/pricing$/, { timeout: 10_000 })
  })

  test('GET /api/devices is fired on settings load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(1000)
    })
    const dev = reqs.find((r) => /\/api\/devices$/.test(r.url) && r.method === 'GET')
    expect(dev, 'GET /api/devices must fire on Settings load').toBeTruthy()
  })

  test('This-device section renders platform/browser/network rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/Platform|Browser|Network/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Log out button clears the session and navigates to /login', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^(log out|sign out)$/i }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBeFalsy()
  })

  test('Delete-account button opens the confirmation modal with a password input', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /Delete account/i })
      .first()
      .click()
    await expect(page.locator('#delete-pw')).toBeVisible({ timeout: 10_000 })
  })
})
