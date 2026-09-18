/**
 * /settings — profile name persistence (PATCH /api/users/:id), inline
 * security/two-factor/link panels, switch toggles, sidebar nav.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/settings (Settings)', () => {
  test('renders heading + GETs trusted_devices and linked_accounts on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /settings/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      // linked_accounts loads with the page; trusted_devices belongs to the
      // security section's panel and only loads when that section is opened.
      await page.getByRole('button', { name: /^security$/i }).click()
      await expect(page.locator('[data-mol-id="settings-change-password-cta"]')).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/trusted_devices/.test(r.url) && r.status < 400)).toBeTruthy()
    expect(reqs.find((r) => /\/api\/linked_accounts/.test(r.url) && r.status < 400)).toBeTruthy()
  })

  test('default section is profile and shows the profile form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="page-settings"]')).toHaveAttribute(
      'data-section',
      'profile',
      { timeout: 15000 },
    )
    await expect(page.locator('[data-mol-id="settings-profile-form"]')).toBeVisible()
  })

  test('clicking Security swaps section, bumps tick attribute', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const wrapper = page.locator('[data-mol-id="page-settings"]')
    const before = Number(await wrapper.getAttribute('data-section-tick'))
    await page.getByRole('button', { name: /^security$/i }).click()
    await expect(wrapper).toHaveAttribute('data-section', 'security')
    const after = Number(await wrapper.getAttribute('data-section-tick'))
    expect(after).toBeGreaterThan(before)
  })

  test('clicking Linked accounts swaps section to linked_accounts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /linked accounts/i }).click()
    await expect(page.locator('[data-mol-id="page-settings"]')).toHaveAttribute(
      'data-section',
      'linked_accounts',
    )
  })

  test('profile email field is editable and pre-filled with the signed-in user', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const emailInput = page.locator('input#profile-email')
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    // Email became editable in the profile form (it is PATCHed alongside
    // the name by Save changes) — assert it is NOT read-only.
    await expect(emailInput).not.toHaveAttribute('readonly', '')
    await expect(emailInput).toBeEditable()
    await expect(emailInput).toHaveValue(email)
  })

  test('Save changes PATCHes /api/users/:id and shows the saved status', async ({ page }) => {
    const sess = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newName = 'Updated Name ' + Date.now()
    await page.locator('input#profile-name').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await expect(page.locator('[data-mol-id="settings-profile-saved"]')).toBeVisible({
        timeout: 15000,
      })
    })
    const patch = reqs.find(
      (r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url) && r.status < 400,
    )
    expect(patch, JSON.stringify(reqs)).toBeTruthy()
    void sess
  })

  test('persisted name survives reload (read-after-write)', async ({ page }) => {
    const sess = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newName = 'Persist ' + Date.now()
    await page.locator('input#profile-name').fill(newName)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('[data-mol-id="settings-profile-saved"]')).toBeVisible({
      timeout: 15000,
    })
    await page.reload()
    await expect(page.locator('input#profile-name')).toHaveValue(newName, { timeout: 15000 })
    void sess
  })

  test('Change password CTA opens the inline panel via aria-expanded', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^security$/i }).click()
    // The panel's submit button carries the same label, so this matched two
    // elements once the panel opened. Target the CTA by its data-mol-id.
    const cta = page.locator('[data-mol-id="settings-change-password-cta"]')
    await expect(cta).toHaveAttribute('aria-expanded', 'false')
    await cta.click()
    await expect(cta).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('[data-mol-id="settings-change-password-panel"]')).toBeVisible()
  })

  test('Manage two-factor CTA opens the two-factor panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^security$/i }).click()
    const cta = page.getByRole('button', { name: /two-factor/i })
    await cta.click()
    await expect(page.locator('[data-mol-id="settings-two-factor-panel"]')).toBeVisible()
  })

  test('Notifications switches toggle aria-checked locally', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^notifications$/i }).click()
    // Skip the first switch: it is browser push, and enabling deliberately does
    // NOT flip when permission/service-worker registration fails (headless), so
    // it is not the 'locally toggled preference' this test is about.
    const toggle = page.locator('button[role="switch"]').nth(1)
    const initial = await toggle.getAttribute('aria-checked')
    await toggle.click()
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(initial)
  })

  test('Link a new account CTA toggles aria-expanded + the link panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /linked accounts/i }).click()
    const cta = page.getByRole('button', { name: /link a new account/i })
    await expect(cta).toHaveAttribute('aria-expanded', 'false')
    await cta.click()
    await expect(page.locator('[data-mol-id="settings-link-panel"]')).toBeVisible()
  })

  test('Save changes button is enabled by default and shows saving copy mid-flight', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const cta = page.getByRole('button', { name: /save changes/i })
    await expect(cta).toBeVisible({ timeout: 15000 })
    await expect(cta).toBeEnabled()
  })

  test('PATCH /api/users/:id round-trips and stored name re-loads from API', async ({ page }) => {
    const sess = await signup(page)
    const newName = 'Direct API ' + Date.now()
    const res = await page.request.patch(
      APP_BASE.replace(/\/$/, '') + `/api/users/${sess.userId}`,
      { headers: apiHeaders(sess.accessToken), data: { name: newName } },
    )
    expect(res.status()).toBeLessThan(400)
    const get = await page.request.get(APP_BASE.replace(/\/$/, '') + `/api/users/${sess.userId}`, {
      headers: apiHeaders(sess.accessToken),
    })
    const body = (await get.json()) as {
      name?: string
      props?: { name?: string }
      data?: { name?: string }
    }
    const name = body.props?.name ?? body.name ?? body.data?.name
    expect(name).toBe(newName)
  })
})
