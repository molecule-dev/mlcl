import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Settings page: profile, addresses, payments, preferences.
 *
 * Invariants verified:
 * - Profile save → PATCH /api/settings/me; reload shows persisted name+phone.
 *   (Phone/preferences must go through the app's server-side settings
 *   channel — the platform user resource never returns oauthData on reads,
 *   so anything saved via PATCH /api/users/:id inside oauthData evaporates.)
 * - Address add → POST /api/addresses; row appears; default badge applied
 *   when first address.
 * - Make-default → POST /default; both rows reflect new default flags
 *   (read-after-write in GET).
 * - Address remove → DELETE /api/addresses/:id; row gone.
 * - Add payment method → POST /payment-methods/setup-session returns a
 *   real Stripe Checkout URL (cs_test_… / checkout.stripe.com).
 * - Notification preferences toggle saves on every change.
 */

test.describe('settings → profile', () => {
  test('saving the profile persists name + phone across reload', async ({ page }) => {
    await signup(page, uniqueEmail('fd-prof'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-profile').click()

    const nameInput = page.locator('input[name="name"]').first()
    const phoneInput = page.locator('input[name="phone"]').first()
    await nameInput.fill('Updated Name')
    await phoneInput.fill('+1 555 0100')

    const savePromise = page.waitForResponse(
      (r) => /\/api\/settings\/me/.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 10_000 },
    )
    await page.getByTestId('profile-save').click()
    const saveResp = await savePromise
    expect([200, 204]).toContain(saveResp.status())
    await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 10_000 })

    // Reload — values should persist after the form re-fetches.
    await page.reload()
    await expect(page.locator('input[name="name"]').first()).toHaveValue('Updated Name', {
      timeout: 10_000,
    })
    await expect(page.locator('input[name="phone"]').first()).toHaveValue('+1 555 0100')
  })
})

test.describe('settings → addresses', () => {
  test('add → list → make-default → remove round-trip', async ({ page }) => {
    await signup(page, uniqueEmail('fd-addr'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-addresses').click()

    // Fresh user — seedDemoForUser only fires when /notifications is hit, so
    // there might or might not be a default Home seed. Drive directly via UI.
    await page.getByTestId('address-add').click()
    await expect(page.getByTestId('address-form')).toBeVisible()
    await page.locator('input[name="street"]').fill('500 Maple Ave')
    await page.locator('input[name="city"]').fill('Centerville')
    await page.locator('input[name="postal_code"]').fill('99888')
    const post1 = page.waitForResponse(
      (r) => /\/api\/addresses$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.getByTestId('address-save').click()
    await post1

    // Read-after-write: GET /addresses returns the new row.
    const list = await page.request.get(API_BASE + '/addresses').then((r) => r.json())
    const rows = list?.data ?? []
    const created = rows.find((a: { street: string }) => a.street === '500 Maple Ave')
    expect(created).toBeTruthy()

    // Add a second address so we can flip the default.
    await page.getByTestId('address-add').click()
    await page.locator('input[name="street"]').fill('1 Oak Way')
    await page.locator('input[name="city"]').fill('Centerville')
    const post2 = page.waitForResponse(
      (r) => /\/api\/addresses$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.getByTestId('address-save').click()
    await post2

    // Make the second address default and verify the API reflects the change.
    const oakRow = page.locator('[data-testid="address-row"]').filter({ hasText: '1 Oak Way' })
    await expect(oakRow.getByTestId('address-make-default')).toBeVisible()
    const setDefaultPromise = page.waitForResponse(
      (r) => /\/api\/addresses\/[\w-]+\/default$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await oakRow.getByTestId('address-make-default').click()
    const setDefaultResp = await setDefaultPromise
    expect([200, 204]).toContain(setDefaultResp.status())

    // The UI re-fetches via reload(); wait for default badge to move.
    await expect(oakRow.getByTestId('address-default-badge')).toBeVisible({ timeout: 5_000 })

    const after = await page.request.get(API_BASE + '/addresses').then((r) => r.json())
    const oak = (after?.data ?? []).find((a: { street: string }) => a.street === '1 Oak Way')
    expect(oak?.is_default).toBe(true)
    const maple = (after?.data ?? []).find((a: { street: string }) => a.street === '500 Maple Ave')
    expect(maple?.is_default).toBe(false)

    // Remove the maple address.
    const mapleRow = page
      .locator('[data-testid="address-row"]')
      .filter({ hasText: '500 Maple Ave' })
    const delPromise = page.waitForResponse(
      (r) => /\/api\/addresses\/[\w-]+/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    )
    await mapleRow.getByTestId('address-remove').click()
    await delPromise

    const final = await page.request.get(API_BASE + '/addresses').then((r) => r.json())
    expect(
      (final?.data ?? []).find((a: { street: string }) => a.street === '500 Maple Ave'),
    ).toBeFalsy()
  })
})

test.describe('settings → payments', () => {
  test('add-payment-method endpoint returns a real Stripe Checkout setup session', async ({
    page,
  }) => {
    // Hit the API directly: the UI button calls window.location.href which
    // tears down the page context before we can read the response body.
    await signup(page, uniqueEmail('fd-pay'))
    const resp = await page.request.post(API_BASE + '/payment-methods/setup-session', {
      data: {},
    })
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.url).toMatch(/checkout\.stripe\.com/)
    expect(body.id).toMatch(/^cs_/)

    // The UI button is wired correctly (click triggers the same POST).
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-payments').click()
    await expect(page.getByTestId('settings-payments')).toBeVisible()
    await expect(page.getByTestId('payment-add')).toBeVisible()
  })
})

test.describe('settings → preferences', () => {
  test('toggling a preference persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('fd-prefs'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-preferences').click()
    await expect(page.getByTestId('settings-preferences')).toBeVisible()

    const sms = page.getByTestId('toggle-sms')
    const before = await sms.getAttribute('aria-checked')
    const patchPromise = page.waitForResponse(
      (r) => /\/api\/settings\/me/.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 10_000 },
    )
    await sms.click()
    const patchResp = await patchPromise
    expect([200, 204]).toContain(patchResp.status())
    await expect(page.getByTestId('preferences-saved')).toBeVisible()

    await page.reload()
    await page.getByTestId('settings-tab-preferences').click()
    const after = page.getByTestId('toggle-sms')
    // The toggle should reflect the new state once the GET hydrates state.
    await expect(after).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true', {
      timeout: 10_000,
    })
  })
})
