import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('07: settings — profile, billing, security; persistence across reload', () => {
  test('settings page root renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test=settings-page]')).toBeVisible()
  })

  test('settings page heading is "Settings"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
  })

  test('profile tab is the default visible panel after navigation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test=settings-tab-profile]')).toBeVisible()
    await expect(page.locator('[data-test=profile-form]')).toBeVisible()
  })

  test('settings-tab-billing button is visible and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const tab = page.locator('[data-test=settings-tab-billing]')
    await expect(tab).toBeVisible()
    await tab.click()
    await expect(page.locator('[data-test=billing-status]')).toBeVisible({ timeout: 10000 })
  })

  test('settings-tab-security button is visible and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const tab = page.locator('[data-test=settings-tab-security]')
    await expect(tab).toBeVisible()
    await tab.click()
    await expect(page.locator('[data-test=password-form]')).toBeVisible()
  })

  test('profile-form wraps fields and Save button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const form = page.locator('[data-test=profile-form]')
    await expect(form).toBeVisible()
    await expect(form.locator('[data-test=profile-name]')).toBeVisible()
    await expect(form.locator('[data-test=profile-save]')).toBeVisible()
  })

  test('profile-name accepts typed input and preserves the value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const input = page.locator('[data-test=profile-name]')
    await input.fill('Typed Display')
    await expect(input).toHaveValue('Typed Display')
  })

  test('profile-username accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const input = page.locator('[data-test=profile-username]')
    await input.fill('typed-username')
    await expect(input).toHaveValue('typed-username')
  })

  test('profile-email is editable and reflects the signup email', async ({ page }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const input = page.locator('[data-test=profile-email]')
    await expect(input).toBeVisible()
    // Email became editable in the profile form (it is PATCHed alongside the
    // name by Save changes) — assert it is NOT read-only.
    await expect(input).not.toHaveAttribute('readonly', /.*/)
    await expect(input).toBeEditable()
    await expect(input).toHaveValue(auth.email)
  })

  test('profile-save button fires PUT /api/users/:id (captured via captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=profile-name]').fill('Net Probe Name')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=profile-save]').click()
      await expect(page.locator('text=/Profile saved/i')).toBeVisible({ timeout: 10000 })
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url))
    expect(patch?.status, 'profile-save did not fire PATCH /api/users/:id').toBeLessThan(300)
  })

  test('billing-tier-free card visible on Billing tab and shows Current badge', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    const tier = page.locator('[data-test=billing-tier-free]')
    await expect(tier).toBeVisible()
    await expect(tier).toContainText(/current/i)
  })

  test('billing-tier-pro card visible with $15/mo price', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    const tier = page.locator('[data-test=billing-tier-pro]')
    await expect(tier).toBeVisible()
    await expect(tier).toContainText(/\$15/)
  })

  test('billing-cta-pro is visible on Billing tab', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-cta-pro]')).toBeVisible()
  })

  test('billing-tier-team card visible with $49/mo price', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    const tier = page.locator('[data-test=billing-tier-team]')
    await expect(tier).toBeVisible()
    await expect(tier).toContainText(/\$49/)
  })

  test('billing-cta-team is visible on Billing tab', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-cta-team]')).toBeVisible()
  })

  test('password-form is visible on Security tab', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-security]').click()
    await expect(page.locator('[data-test=password-form]')).toBeVisible()
  })

  test('password-current and password-new fields accept typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-security]').click()
    await page.locator('[data-test=password-current]').fill('TestPass!1234')
    await page.locator('[data-test=password-new]').fill('NewPass!2345')
    await expect(page.locator('[data-test=password-current]')).toHaveValue('TestPass!1234')
    await expect(page.locator('[data-test=password-new]')).toHaveValue('NewPass!2345')
  })

  test('password-save button is disabled when fields are empty and enabled when filled', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-security]').click()
    const btn = page.locator('[data-test=password-save]')
    await expect(btn).toBeDisabled()
    await page.locator('[data-test=password-current]').fill('TestPass!1234')
    await page.locator('[data-test=password-new]').fill('NewPass!2345')
    await expect(btn).toBeEnabled()
  })

  test('save profile name → reload preserves new name in input field AND user payload', async ({
    page,
  }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-profile]').click()
    await page.locator('[data-test=profile-name]').fill('Renamed Display')
    await page.locator('[data-test=profile-save]').click()
    await expect(page.locator('text=/Profile saved/i')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-test=settings-tab-profile]').click()
    await expect(page.locator('[data-test=profile-name]')).toHaveValue('Renamed Display')

    // Backend round-trip — molecule user resource wraps under body.props
    const me = await page.request.get(`${API_BASE}/users/${auth.userId}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const fresh = await me.json()
    const obj = (fresh.data ?? fresh) as { props?: { name?: string }; name?: string }
    const name = obj.props?.name ?? obj.name
    expect(name).toBe('Renamed Display')
  })

  test('billing tab loads status panel without errors', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-status]')).toBeVisible({ timeout: 10000 })
    // No error banner
    await expect(page.locator('[data-test=billing-error]')).toHaveCount(0)
  })

  test('security tab — set new password, success message, sign out then login with new password works', async ({
    page,
  }) => {
    const email = `pwflow-${Date.now()}@flagship.test`
    const oldPw = 'TestPass!1234'
    const newPw = 'BrandNew!9876'
    await signup(page, email, oldPw)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-security]').click()
    await page.locator('[data-test=password-current]').fill(oldPw)
    await page.locator('[data-test=password-new]').fill(newPw)
    await page.locator('[data-test=password-save]').click()
    await expect(page.locator('text=/password updated/i')).toBeVisible({ timeout: 10000 })

    // Sign out, log in with new password
    await page.locator('[data-test=sign-out]').click({ force: true })
    await page.waitForURL(/\/login/, { timeout: 10000 })
    await page.locator('[data-test=login-email]').fill(email)
    await page.locator('[data-test=login-password]').fill(newPw)
    await page.locator('[data-test=login-submit]').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })
})
